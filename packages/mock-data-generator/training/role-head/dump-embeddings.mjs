#!/usr/bin/env node
/**
 * Step 3 of the role head: embed every export row with the runtime encoder for the MLP trainer.
 * Writes JSONL `{ id, label, v }`, vectors rounded to 6 decimals.
 */
import { createWriteStream } from 'node:fs';
import { once } from 'node:events';
import { log, parseCli, readJson, runCli } from '../common/io.mjs';
import { embedAll, openEncoder } from '../common/runtime.mjs';
import { validateV3Dataset } from './v3-export.mjs';

await runCli('dump-embeddings', async () => {
    const args = parseCli(
        {
            'export': { required: true },
            'output': { required: true },
            'encoder': { required: true },
            'vocabulary': { required: true },
            'encoder-sha256': { required: true }
        },
        'Usage: dump-embeddings.mjs --export v3-export.json --output embeddings.jsonl --encoder encoder.onnx --vocabulary vocab.txt --encoder-sha256 SHA'
    );
    const artifact = await readJson(args.export);
    await validateV3Dataset({ artifact, vocabulary: args.vocabulary });
    const embedder = await openEncoder({
        encoder: args.encoder,
        vocabulary: args.vocabulary,
        encoderSha256: args['encoder-sha256'],
        vocabularySha256: artifact.tokenizer.vocabularySha256
    });
    try {
        const vectors = await embedAll(
            embedder,
            artifact.rows.map((row) => row.serialized),
            (done, total) => done % 2560 === 0 && log('INFO', 'dump-embeddings.progress', { done, total })
        );
        const out = createWriteStream(args.output);
        for (const [index, row] of artifact.rows.entries()) {
            const line = `${JSON.stringify({ id: row.id, label: row.label, v: Array.from(vectors[index], (value) => Number(value.toFixed(6))) })}\n`;
            if (!out.write(line)) {
                await once(out, 'drain');
            }
        }
        out.end();
        await once(out, 'finish');
        log('INFO', 'dump-embeddings.done', { rows: artifact.rows.length });
    } finally {
        await embedder.dispose();
    }
});
