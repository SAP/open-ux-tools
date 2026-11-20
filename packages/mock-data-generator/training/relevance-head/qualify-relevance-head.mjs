#!/usr/bin/env node
/**
 * Qualify a trained relevance head against its report and the dataset partitions, and write the public
 * head (sealed ids stripped) ready for resources/models/classifier/relevance-head.json.
 */
import { datasetFile, log, parseCli, readJson, readJsonl, runCli, writeJson } from '../common/io.mjs';
import { publicHead } from '../common/public-artifact.mjs';
import { qualifyRelevanceHead } from './qualify-relevance.mjs';
import { relevanceRowsFromDataset } from './relevance-dataset.mjs';

await runCli('qualify-relevance-head', async () => {
    const args = parseCli(
        {
            'dataset': { required: true },
            'head': { required: true },
            'report': { required: true },
            'classifier-head': { required: true },
            'review-record': { required: true },
            'output': { required: true }
        },
        'Usage: qualify-relevance-head.mjs --dataset DIR --head head.json --report report.json --classifier-head classifier/head.json --review-record record.json --output relevance-head.json'
    );
    const { rows, partitions } = relevanceRowsFromDataset(
        await readJsonl(await datasetFile(args.dataset, 'relevance_pairs', 'train'))
    );
    const classifierHead = await readJson(args['classifier-head']);
    const qualified = qualifyRelevanceHead({
        head: await readJson(args.head),
        report: await readJson(args.report),
        rows,
        partitions,
        contract: {
            encoderSha256: classifierHead.encoderSha256,
            vocabularySha256: classifierHead.tokenizerSha256,
            embeddingDimension: classifierHead.dim
        },
        reviewRecord: await readJson(args['review-record']),
        qualifiedAt: new Date().toISOString()
    });
    await writeJson(args.output, publicHead(qualified), { indent: 2 });
    log('INFO', 'qualify-relevance-head.done', { sealedEvaluation: qualified.qualification.sealedEvaluation });
});
