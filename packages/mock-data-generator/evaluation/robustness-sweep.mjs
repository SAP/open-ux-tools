// Robustness sweep (metric M9): every metadata file of a list through the data editor's generation path
// (`executionMode: 'data-editor'`, 10 rows, seed 1, a 1 ms fine-tuned budget), one shard of the list per
// process. Each record holds the file, status, error name/code/message (metadata names only) and timing;
// no generated values. Compare two sweeps with compare-sweeps.mjs.
//
// Usage: node robustness-sweep.mjs PACKAGE_ROOT FILE_LIST SHARD SHARDS OUT.jsonl
import { appendFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [packageArgument, listFile, shardArgument, shardsArgument, outFile] = process.argv.slice(2);
if (!packageArgument || !listFile || !shardArgument || !shardsArgument || !outFile) {
    throw new TypeError('Usage: robustness-sweep.mjs PACKAGE_ROOT FILE_LIST SHARD SHARDS OUT.jsonl');
}
const shard = Number(shardArgument);
const shards = Number(shardsArgument);
const api = await import(join(resolve(packageArgument), 'dist/public.js'));
const files = readFileSync(listFile, 'utf8')
    .split('\n')
    .filter(Boolean)
    .filter((_file, index) => index % shards === shard);
const generator = await api.createMockDataGenerator({ executionMode: 'data-editor' });
for (const file of files) {
    const started = performance.now();
    let record;
    try {
        const xml = readFileSync(file, 'utf8');
        const targets = [
            ...new Set(
                [...xml.replace(/<!--[\s\S]*?-->/gu, '').matchAll(/<EntitySet\s+Name="([^"]+)"/gu)].map(
                    (match) => match[1]
                )
            )
        ].map((name) => ({ name, kind: 'entity-set' }));
        if (targets.length === 0) {
            record = { file, status: 'no-targets' };
        } else {
            const odataVersion = /Version="4\.0"/u.test(xml) ? '4.0' : '2.0';
            const result = await generator.generateService(
                {
                    metadata: { format: 'edmx', content: xml },
                    service: { urlPath: '/sweep/', odataVersion },
                    targets,
                    existingData: {}
                },
                { mode: 'auto', rowsPerEntity: 10, seed: 1, sftTimeoutMs: 30_000, sftBudgetMs: 1 }
            );
            record = { file, status: 'ok', slots: result.tiers?.slots, typed: result.tiers?.typed };
        }
    } catch (error) {
        record = {
            file,
            status: 'error',
            name: error?.name,
            code: error?.code,
            message: String(error?.message ?? error).slice(0, 400)
        };
    }
    record.ms = Math.round(performance.now() - started);
    appendFileSync(outFile, `${JSON.stringify(record)}\n`);
}
await generator.dispose?.();
