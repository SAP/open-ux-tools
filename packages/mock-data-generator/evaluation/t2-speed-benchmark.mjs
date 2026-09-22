// Measures where whole-service generation time goes with the SAP Fiori tools editor's own options
// (data-editor execution, 10 rows, seed 1, per-request timeout 30 s), for a given fine-tuned (T2)
// service budget. Reports wall time, per-resource T2 time and accepted slots, and the value tiers,
// so a budget or retry change can be judged on both speed and what the model still contributes.
//
// Usage: node t2-speed-benchmark.mjs PACKAGE_ROOT [--budget MS] [--output FILE] [METADATA.xml ...]
//   Without metadata files, the package's Travel V2 and finance fixtures are used.
import { readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const packageArgument = argv.shift();
if (!packageArgument) {
    throw new TypeError('Usage: t2-speed-benchmark.mjs PACKAGE_ROOT [--budget MS] [--output FILE] [METADATA.xml ...]');
}
const option = (name, fallback) => {
    const index = argv.indexOf(name);
    if (index < 0) return fallback;
    const [, value] = argv.splice(index, 2);
    return value;
};
const budgetMs = Number(option('--budget', '120000'));
const outputPath = option('--output', undefined);
if (!Number.isSafeInteger(budgetMs) || budgetMs <= 0) {
    throw new TypeError('--budget must be a positive integer number of milliseconds');
}
const packageRoot = resolve(packageArgument);
const api = await import(join(packageRoot, 'dist/public.js'));
const files = argv.length
    ? argv.map((file) => resolve(file))
    : [
          join(packageRoot, 'test/unit/travel-v2.metadata.xml'),
          join(packageRoot, 'test/unit/finance-manage.metadata.xml')
      ];

const services = [];
for (const file of files) {
    const metadataXml = await readFile(file, 'utf8');
    const targets = [...new Set([...metadataXml.matchAll(/<EntitySet\s+Name="([^"]+)"/gu)].map((match) => match[1]))];
    const odataVersion = /Version="4\.0"/u.test(metadataXml) ? '4.0' : '2.0';
    const t2 = [];
    const generator = await api.createMockDataGenerator({
        executionMode: 'data-editor',
        onProgress: (event) => {
            if (event.tier === 'T2' && event.phase === 'complete') {
                t2.push({
                    resource: event.resource,
                    acceptedSlots: event.acceptedSlots ?? 0,
                    durationMs: Math.round(event.durationMs ?? 0)
                });
            }
        }
    });
    const startedAt = performance.now();
    try {
        const result = await generator.generateService(
            {
                metadata: { format: 'edmx', content: metadataXml },
                service: { urlPath: `/${basename(file)}`, odataVersion },
                targets: targets.map((name) => ({ name, kind: 'entity-set' })),
                existingData: {}
            },
            { mode: 'auto', rowsPerEntity: 10, seed: 1, sftTimeoutMs: 30_000, sftBudgetMs: budgetMs }
        );
        const { sft } = result.statistics;
        const tiers = result.tiers;
        services.push({
            file: basename(file),
            wallMs: Math.round(performance.now() - startedAt),
            t2Ms: t2.reduce((sum, entry) => sum + entry.durationMs, 0),
            sft: {
                attempts: sft.attempts,
                eligibleSlots: sft.eligibleSlots,
                acceptedSlots: sft.acceptedSlots,
                fallbackSlots: sft.fallbackSlots
            },
            tiers,
            t2
        });
    } catch (error) {
        services.push({ file: basename(file), error: String(error?.message ?? error).slice(0, 200) });
    } finally {
        await generator.dispose?.();
    }
}
const report = { format: 'mockgen-t2-speed-benchmark', version: 1, settings: { budgetMs }, services };
if (outputPath) await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
for (const service of services) {
    console.log(
        JSON.stringify({
            file: service.file,
            wallMs: service.wallMs,
            t2Ms: service.t2Ms,
            accepted: service.sft?.acceptedSlots,
            eligible: service.sft?.eligibleSlots,
            error: service.error
        })
    );
}
