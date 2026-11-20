#!/usr/bin/env node
/**
 * Step 2 of the role head: serialize and tokenize prep.jsonl with the runtime into a v3 export (compact JSON).
 */
import { log, parseCli, readJson, runCli, writeJson } from '../common/io.mjs';
import { exportV3Dataset, validateV3Dataset } from './v3-export.mjs';

await runCli('export-dataset', async () => {
    const args = parseCli(
        { input: { required: true }, vocabulary: { required: true }, output: { required: true } },
        'Usage: export-dataset.mjs --input prep.jsonl --vocabulary vocab.txt --output v3-export.json'
    );
    const artifact = await exportV3Dataset({ input: args.input, vocabulary: args.vocabulary });
    await writeJson(args.output, artifact);
    await validateV3Dataset({ artifact: await readJson(args.output), vocabulary: args.vocabulary });
    log('INFO', 'export-dataset.done', { rows: artifact.rows.length, labels: artifact.labels.length });
});
