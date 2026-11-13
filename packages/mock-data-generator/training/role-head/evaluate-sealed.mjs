#!/usr/bin/env node
/**
 * Step 7 of the role head: evaluate a head on the dataset's sealed, service-disjoint fields
 * (sealed_eval/test, with field_contexts and labels for metadata and domains) through the runtime
 * classifier and arbitration. Writes the sealed report; prints the counts and the gate result.
 * `--origin public` restricts the set to the fields published unchanged (no rewritten identities).
 */
import { datasetFile, log, parseCli, readJson, readJsonl, runCli, sha256, writeJson } from '../common/io.mjs';
import {
    createEmbeddingSemanticClassifier,
    openEncoder,
    roleRegistryContract,
    v3ClassifierContract
} from '../common/runtime.mjs';
import { buildSealedServices } from './sealed-graph.mjs';
import { routeSealedService, sealedDatasetFingerprint, summarizeSealedDecisions } from './sealed-evaluation.mjs';

await runCli('evaluate-sealed', async () => {
    const args = parseCli(
        {
            dataset: { required: true },
            head: { required: true },
            encoder: { required: true },
            vocabulary: { required: true },
            output: { required: true },
            origin: { default: 'all' }
        },
        'Usage: evaluate-sealed.mjs --dataset DIR --head head.json --encoder encoder.onnx --vocabulary vocab.txt --output sealed-report.json [--origin all|public|synthetic]'
    );
    if (!['all', 'public', 'synthetic'].includes(args.origin)) {
        throw new TypeError('--origin must be all, public or synthetic');
    }
    const head = await readJson(args.head);
    const byId = async (config) =>
        new Map(
            (await readJsonl(await datasetFile(args.dataset, config, 'train'))).map((record) => [
                record.field_id,
                record
            ])
        );
    const services = buildSealedServices({
        sealedRows: (await readJsonl(await datasetFile(args.dataset, 'sealed_eval', 'test'))).filter(
            (row) => args.origin === 'all' || row.origin === args.origin
        ),
        fieldContexts: await byId('field_contexts'),
        labels: await byId('labels')
    });
    const embedder = await openEncoder({
        encoder: args.encoder,
        vocabulary: args.vocabulary,
        encoderSha256: head.encoderSha256,
        vocabularySha256: head.tokenizerSha256,
        hiddenSize: head.dim
    });
    try {
        const classifier = createEmbeddingSemanticClassifier({
            fingerprint: head.qualification?.artifactFingerprint ?? sha256(JSON.stringify(head)),
            embedder,
            head,
            ...v3ClassifierContract()
        });
        const decisions = [];
        for (const service of services) {
            decisions.push(...(await routeSealedService({ graph: service.graph, rows: service.rows, classifier })));
            log('INFO', 'evaluate-sealed.progress', {
                services: services.indexOf(service) + 1,
                total: services.length
            });
        }
        const auxiliary = new Set(head.auxiliaryLabels ?? []);
        const summary = summarizeSealedDecisions({
            decisions,
            claimedLabels: head.labels.filter((label) => label !== 'unknown' && !auxiliary.has(label)),
            registryRoles: roleRegistryContract().roles
        });
        await writeJson(
            args.output,
            {
                format: 'mockgen-sealed-role-report',
                version: 2,
                headSha256: sha256(JSON.stringify(head)),
                origin: args.origin,
                sealedDatasetFingerprint: sealedDatasetFingerprint(services.flatMap((service) => service.rows)),
                ...summary
            },
            { indent: 2 }
        );
        process.stdout.write(
            `${JSON.stringify({ sealedEvaluation: summary.sealedEvaluation, gate: { pass: summary.gate.pass, failures: summary.gate.failures } })}\n`
        );
    } finally {
        await embedder.dispose();
    }
});
