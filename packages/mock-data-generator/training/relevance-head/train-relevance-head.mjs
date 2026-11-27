#!/usr/bin/env node
/**
 * Train the field-to-value relevance head from the dataset's judged pairs (relevance_pairs/train, with its
 * train / calibration / sealed split) and evaluate it once on the sealed split. Writes the unqualified
 * head and a report with calibration and sealed counts.
 */
import { datasetFile, log, numberFlag, parseCli, readJsonl, runCli, sha256, writeJson } from '../common/io.mjs';
import { openEncoder } from '../common/runtime.mjs';
import { relevanceRowsFromDataset } from './relevance-dataset.mjs';
import { evaluateRelevanceHead, relevanceDataFingerprint, trainRelevanceHead } from './relevance-train.mjs';

await runCli('train-relevance-head', async () => {
    const args = parseCli(
        {
            'dataset': { required: true },
            'encoder': { required: true },
            'vocabulary': { required: true },
            'encoder-sha256': { required: true },
            'vocabulary-sha256': { required: true },
            'output-head': { required: true },
            'output-report': { required: true },
            'epochs': { default: '2000' },
            'negative-budget': { default: '0.01' }
        },
        'Usage: train-relevance-head.mjs --dataset DIR --encoder encoder.onnx --vocabulary vocab.txt --encoder-sha256 SHA --vocabulary-sha256 SHA --output-head head.json --output-report report.json [--epochs 2000] [--negative-budget 0.01]'
    );
    const { rows, partitions } = relevanceRowsFromDataset(
        await readJsonl(await datasetFile(args.dataset, 'relevance_pairs', 'train'))
    );
    const embedder = await openEncoder({
        encoder: args.encoder,
        vocabulary: args.vocabulary,
        encoderSha256: args['encoder-sha256'],
        vocabularySha256: args['vocabulary-sha256']
    });
    try {
        const { head, calibration } = await trainRelevanceHead({
            rows,
            trainIds: partitions.train,
            calibrationIds: partitions.calibration,
            sealedIds: partitions.sealed,
            encoderSha256: args['encoder-sha256'],
            vocabularySha256: args['vocabulary-sha256'],
            embedder,
            fit: {
                epochs: numberFlag(args.epochs, 'epochs'),
                negativeBudget: numberFlag(args['negative-budget'], 'negative-budget')
            }
        });
        const byId = new Map(rows.map((row) => [row.id, row]));
        const sealedRows = partitions.sealed.map((id) => byId.get(id));
        const sealed = await evaluateRelevanceHead({ head, rows: sealedRows, embedder });
        await writeJson(args['output-head'], head, { indent: 2 });
        await writeJson(
            args['output-report'],
            {
                format: 'mockgen-relevance-report',
                version: 1,
                headSha256: sha256(JSON.stringify(head)),
                sealedDatasetFingerprint: relevanceDataFingerprint(sealedRows),
                negativeBudget: numberFlag(args['negative-budget'], 'negative-budget'),
                calibration,
                sealed
            },
            { indent: 2 }
        );
        log('INFO', 'train-relevance-head.done', { threshold: head.threshold, calibration, sealed });
    } finally {
        await embedder.dispose();
    }
});
