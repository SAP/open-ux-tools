#!/usr/bin/env node
/**
 * Step 8 of the role head: qualify a calibrated head against its sealed report and write the public head
 * (record identifiers stripped) ready for resources/models/classifier/head.json.
 */
import { datasetFile, log, parseCli, readJson, readJsonl, runCli, writeJson } from '../common/io.mjs';
import { publicHead } from '../common/public-artifact.mjs';
import { qualifyHead } from './qualify.mjs';
import { buildSealedServices } from './sealed-graph.mjs';
import { sealedDatasetFingerprint } from './sealed-evaluation.mjs';

await runCli('qualify-head', async () => {
    const args = parseCli(
        {
            'dataset': { required: true },
            'head': { required: true },
            'sealed-report': { required: true },
            'manifest': { required: true },
            'review-record': { required: true },
            'output': { required: true }
        },
        'Usage: qualify-head.mjs --dataset DIR --head head.json --sealed-report report.json --manifest manifest.json --review-record record.json --output head.json'
    );
    const report = await readJson(args['sealed-report']);
    const byId = async (config) =>
        new Map(
            (await readJsonl(await datasetFile(args.dataset, config, 'train'))).map((record) => [
                record.field_id,
                record
            ])
        );
    const services = buildSealedServices({
        sealedRows: (await readJsonl(await datasetFile(args.dataset, 'sealed_eval', 'test'))).filter(
            (row) => (report.origin ?? 'all') === 'all' || row.origin === report.origin
        ),
        fieldContexts: await byId('field_contexts'),
        labels: await byId('labels')
    });
    const qualified = qualifyHead({
        head: await readJson(args.head),
        report,
        recomputedSealedFingerprint: sealedDatasetFingerprint(services.flatMap((service) => service.rows)),
        manifest: await readJson(args.manifest),
        reviewRecord: await readJson(args['review-record']),
        qualifiedAt: new Date().toISOString()
    });
    await writeJson(args.output, publicHead(qualified));
    log('INFO', 'qualify-head.done', {
        status: qualified.qualification.status,
        labels: qualified.labels.length,
        sealedEvaluation: qualified.qualification.sealedEvaluation
    });
});
