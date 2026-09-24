// Blinded realism judgement of generated rows (metric M8), per value tier and per variant.
//
// Input: row dumps written by `tier-benchmark.mjs --rows-out` (one per variant, e.g. a release or a
// candidate build, same profile). For a fixed list of services, the same entities are chosen for every
// variant (by name only), their first N columns and rows are shown to each judge model as an item with
// an opaque id, and items from all variants are interleaved in shuffled batches, so a judge sees
// neither the variant nor the tier. The judge returns a 0/1 realism verdict per column; verdicts are
// then bucketed by the tier that wrote the column. Verdicts are cached by (judge, protocol, payload)
// hash, so unchanged output is never judged twice.
//
// Transport: OpenAI-compatible chat completions on the LiteLLM proxy (LITELLM_PROXY_URL, default
// http://localhost:6655/litellm/v1). The key is read from LITELLM_API_KEY and never written anywhere;
// logs carry counts only, never payloads or values.
//
// Usage:
//   LITELLM_API_KEY=... node realism-judge.mjs --variant dev20=rows20.jsonl --variant dev21=rows21.jsonl
//        --services services.json --out report.json --cache verdicts.jsonl
//        [--judges anthropic--claude-4.8-opus,anthropic--claude-4.6-sonnet] [--concurrency 2]
//        [--entities 2] [--columns 25] [--rows 10] [--batch 2]
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { appendFile, readFile, writeFile } from 'node:fs/promises';

const PROTOCOL = 'mockgen-realism-v1';
const PROXY = process.env.LITELLM_PROXY_URL ?? 'http://localhost:6655/litellm/v1';
const MAX_ATTEMPTS = 5;
const REQUEST_TIMEOUT_MS = 240_000;
const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const MAX_VALUE_LENGTH = 60;

const SYSTEM = `You review generated mock data for business applications (SAP Fiori apps and OData services).

Each item shows one entity: its column names and up to 10 generated rows (one array of values per row, in column order). For EVERY column decide whether its values are realistic for a demo of a real business application:
1 = values plausibly belong in that column (right kind of content for the column name, sensible format and length, varied where real data would vary, consistent with the other columns of the same row);
0 = placeholders or filler (e.g. "Name 1", "Text 3", "ABC"), random strings or digits where meaningful content is expected, values of the wrong kind for the column, or implausible repetition.
Identifiers and keys count as realistic when they look like real identifiers of that kind. Judge each column on its own merits; do not assume anything about how the data was produced.

Reply with strict JSON only: {"items":[{"itemId":"...","columns":{"<column name>":0|1,...}}]}, one entry per item, every column of the item present.`;

const values = (name) => {
    const found = [];
    process.argv.forEach((argument, index) => {
        if (argument === name) found.push(process.argv[index + 1]);
    });
    return found;
};
const flag = (name, fallback) => values(name)[0] ?? fallback;

const variants = values('--variant').map((entry) => {
    const at = entry.indexOf('=');
    return { name: entry.slice(0, at), path: entry.slice(at + 1) };
});
const servicesPath = flag('--services');
const outPath = flag('--out');
const cachePath = flag('--cache');
const judges = flag('--judges', 'anthropic--claude-4.8-opus,anthropic--claude-4.6-sonnet').split(',');
const concurrency = Math.min(2, Math.max(1, Number(flag('--concurrency', '2'))));
const entitiesPerService = Number(flag('--entities', '2'));
const columnsPerEntity = Number(flag('--columns', '25'));
const rowsPerEntity = Number(flag('--rows', '10'));
const batchSize = Number(flag('--batch', '2'));
if (variants.length === 0 || !servicesPath || !outPath || !cachePath) {
    throw new TypeError(
        'Usage: realism-judge.mjs --variant name=rows.jsonl ... --services s.json --out r.json --cache c.jsonl'
    );
}
if (!process.env.LITELLM_API_KEY) {
    throw new TypeError('LITELLM_API_KEY is not set');
}

const sha = (text) => createHash('sha256').update(text).digest('hex');
const log = (event, fields = {}) => process.stdout.write(`${JSON.stringify({ event, ...fields })}\n`);
const readJsonl = async (path) =>
    (await readFile(path, 'utf8'))
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line));

/**
 * Tier label of one column: the fine-tuned tier when it wrote most cells, else the tier of the rest.
 *
 * @param {{tier: string, cells: number, modelCells: number} | undefined} valueTier per-field tiers
 * @returns {string} tier label
 */
function columnTier(valueTier) {
    if (!valueTier) return 'unknown';
    return valueTier.modelCells * 2 >= valueTier.cells ? 'model' : valueTier.tier;
}

/**
 * Printable, bounded cell value.
 *
 * @param {unknown} value generated cell
 * @returns {unknown} value for the judge
 */
function shown(value) {
    if (typeof value === 'string' && value.length > MAX_VALUE_LENGTH) return `${value.slice(0, MAX_VALUE_LENGTH)}…`;
    return value;
}

const services = JSON.parse(await readFile(servicesPath, 'utf8'));
const dumps = new Map();
for (const variant of variants) {
    dumps.set(variant.name, new Map((await readJsonl(variant.path)).map((record) => [record.id, record])));
}

// Entities are chosen from the first variant's names, so every variant is judged on the same tables.
const items = [];
const missing = [];
for (const serviceId of services) {
    const reference = dumps.get(variants[0].name).get(serviceId);
    if (!reference) {
        missing.push(serviceId);
        continue;
    }
    const entities = Object.entries(reference.resources ?? {})
        .filter(([name, rows]) => !name.startsWith('SAP__') && rows.length > 0 && Object.keys(rows[0]).length >= 3)
        .map(([name]) => name)
        .sort((left, right) =>
            sha(`${PROTOCOL}:${serviceId}:${left}`) < sha(`${PROTOCOL}:${serviceId}:${right}`) ? -1 : 1
        )
        .slice(0, entitiesPerService);
    for (const entity of entities) {
        for (const variant of variants) {
            const dump = dumps.get(variant.name).get(serviceId);
            const rows = dump?.resources?.[entity];
            if (!rows || rows.length === 0) {
                missing.push(`${variant.name}:${serviceId}:${entity}`);
                continue;
            }
            const columns = Object.keys(rows[0]).slice(0, columnsPerEntity);
            const payload = {
                entity,
                columns,
                rows: rows.slice(0, rowsPerEntity).map((row) => columns.map((column) => shown(row[column])))
            };
            const payloadHash = sha(JSON.stringify(payload));
            items.push({
                variant: variant.name,
                serviceId,
                entity,
                columns,
                tiers: Object.fromEntries(
                    columns.map((column) => [column, columnTier(dump.fieldTier?.[`${entity}.${column}`])])
                ),
                payloadHash,
                itemId: sha(`${PROTOCOL}:item:${payloadHash}`).slice(0, 16),
                payload
            });
        }
    }
}

const cache = new Map();
if (existsSync(cachePath)) {
    for (const entry of await readJsonl(cachePath)) cache.set(entry.key, entry.columns);
}
const cacheKey = (judge, item) => sha(`${PROTOCOL}:${judge}:${item.payloadHash}`);
const usage = { calls: 0, promptTokens: 0, completionTokens: 0, failedBatches: 0 };

/**
 * One chat completion with bounded exponential backoff.
 *
 * @param {string} model proxy model id
 * @param {string} user user message
 * @returns {Promise<string>} reply text
 */
async function complete(model, user) {
    let lastError;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
            const response = await fetch(`${PROXY}/chat/completions`, {
                method: 'POST',
                headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.LITELLM_API_KEY}` },
                body: JSON.stringify({
                    model,
                    temperature: 0,
                    max_tokens: 6000,
                    messages: [
                        { role: 'system', content: SYSTEM },
                        { role: 'user', content: user }
                    ]
                }),
                signal: controller.signal
            });
            if (!response.ok) {
                const retryable = RETRYABLE_STATUS.has(response.status);
                lastError = new Error(`HTTP ${response.status}`);
                if (!retryable) throw lastError;
            } else {
                const body = await response.json();
                usage.calls += 1;
                usage.promptTokens += body.usage?.prompt_tokens ?? 0;
                usage.completionTokens += body.usage?.completion_tokens ?? 0;
                return body.choices?.[0]?.message?.content ?? '';
            }
        } catch (error) {
            lastError = error;
            if (
                String(error?.message).startsWith('HTTP 4') &&
                !String(error.message).match(/HTTP (408|409|425|429)/u)
            ) {
                throw error;
            }
        } finally {
            clearTimeout(timer);
        }
        await new Promise((resolve) => setTimeout(resolve, Math.min(60_000, 2_000 * 2 ** (attempt - 1))));
    }
    throw lastError ?? new Error('request failed');
}

/**
 * Parses the judge reply into per-item column verdicts.
 *
 * @param {string} text reply text
 * @returns {Map<string, Record<string, number>>} verdicts by item id
 */
function parseReply(text) {
    const stripped = text.replace(/```(?:json)?/gu, '');
    const parsed = JSON.parse(stripped.slice(stripped.indexOf('{'), stripped.lastIndexOf('}') + 1));
    return new Map((parsed.items ?? []).map((entry) => [entry.itemId, entry.columns ?? {}]));
}

for (const judge of judges) {
    const pending = items
        .filter((item) => !cache.has(cacheKey(judge, item)))
        .sort((left, right) => (sha(`${judge}:${left.itemId}`) < sha(`${judge}:${right.itemId}`) ? -1 : 1));
    const unique = [...new Map(pending.map((item) => [item.payloadHash, item])).values()];
    const batches = [];
    for (let offset = 0; offset < unique.length; offset += batchSize)
        batches.push(unique.slice(offset, offset + batchSize));
    log('judge-start', { judge, items: items.length, pendingItems: unique.length, batches: batches.length });
    let next = 0;
    let completed = 0;
    const worker = async () => {
        while (next < batches.length) {
            const batch = batches[next++];
            try {
                const reply = parseReply(
                    await complete(
                        judge,
                        JSON.stringify({ items: batch.map(({ itemId, payload }) => ({ itemId, ...payload })) })
                    )
                );
                for (const item of batch) {
                    const columns = reply.get(item.itemId);
                    if (!columns || !item.columns.every((column) => columns[column] === 0 || columns[column] === 1)) {
                        continue;
                    }
                    const key = cacheKey(judge, item);
                    const verdicts = Object.fromEntries(item.columns.map((column) => [column, columns[column]]));
                    cache.set(key, verdicts);
                    await appendFile(cachePath, `${JSON.stringify({ key, columns: verdicts })}\n`);
                }
            } catch {
                usage.failedBatches += 1;
            }
            completed += 1;
            if (completed % 20 === 0) log('judge-progress', { judge, completed, batches: batches.length });
        }
    };
    await Promise.all(Array.from({ length: concurrency }, worker));
}

// Aggregate: per variant, per judge and averaged over judges, realism share by tier.
const report = {
    format: 'mockgen-realism-judgement',
    protocol: PROTOCOL,
    judges,
    settings: { entitiesPerService, columnsPerEntity, rowsPerEntity, batchSize },
    services: services.length,
    missing,
    usage,
    variants: {}
};
for (const variant of variants) {
    const variantItems = items.filter((item) => item.variant === variant.name);
    const perJudge = {};
    let agree = 0;
    let paired = 0;
    for (const judge of judges) {
        const byTier = {};
        let judged = 0;
        for (const item of variantItems) {
            const verdicts = cache.get(cacheKey(judge, item));
            if (!verdicts) continue;
            judged += 1;
            for (const column of item.columns) {
                const tier = item.tiers[column];
                byTier[tier] ??= { columns: 0, realistic: 0 };
                byTier.all ??= { columns: 0, realistic: 0 };
                byTier[tier].columns += 1;
                byTier.all.columns += 1;
                byTier[tier].realistic += verdicts[column];
                byTier.all.realistic += verdicts[column];
            }
        }
        for (const bucket of Object.values(byTier))
            bucket.share = Number((bucket.realistic / bucket.columns).toFixed(4));
        perJudge[judge] = { itemsJudged: judged, itemsTotal: variantItems.length, byTier };
    }
    for (const item of variantItems) {
        const verdicts = judges.map((judge) => cache.get(cacheKey(judge, item)));
        if (verdicts.some((entry) => !entry)) continue;
        for (const column of item.columns) {
            paired += 1;
            if (verdicts.every((entry) => entry[column] === verdicts[0][column])) agree += 1;
        }
    }
    const tiers = new Set(judges.flatMap((judge) => Object.keys(perJudge[judge].byTier)));
    const mean = Object.fromEntries(
        [...tiers].map((tier) => {
            const shares = judges
                .map((judge) => perJudge[judge].byTier[tier]?.share)
                .filter((share) => share !== undefined);
            return [
                tier,
                {
                    columns: perJudge[judges[0]].byTier[tier]?.columns ?? 0,
                    share: Number((shares.reduce((total, share) => total + share, 0) / shares.length).toFixed(4))
                }
            ];
        })
    );
    report.variants[variant.name] = {
        items: variantItems.length,
        meanOverJudges: mean,
        judgeAgreement: paired > 0 ? Number((agree / paired).toFixed(4)) : undefined,
        perJudge
    };
}
await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
log('done', { out: outPath, calls: usage.calls, failedBatches: usage.failedBatches });
