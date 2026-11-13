#!/usr/bin/env node
/**
 * Step 6 of the role head: calibrate the pretrained MLP ensemble into an unqualified v3 role head.
 * Embeds the calibration partition with the packaged encoder; writes the head JSON.
 */
import { log, numberFlag, parseCli, readJson, runCli, writeJson } from '../common/io.mjs';
import { openEncoder } from '../common/runtime.mjs';
import { verifyV3TrainingArtifacts } from './artifact-preflight.mjs';
import { validateV3Dataset } from './v3-export.mjs';
import { trainV3Head } from './v3-train.mjs';

await runCli('train-head', async () => {
    const args = parseCli(
        {
            'artifact': { required: true },
            'pretrained-head': { required: true },
            'train-ids': { required: true },
            'calibration-ids': { required: true },
            'manifest': { required: true },
            'encoder': { required: true },
            'vocabulary': { required: true },
            'encoder-sha256': { required: true },
            'output': { required: true },
            'routing-precision': { default: '0.95' },
            'minimum-routed': { default: '3' }
        },
        'Usage: train-head.mjs --artifact v3-export.json --pretrained-head ensemble.json --train-ids F --calibration-ids F --manifest manifest.json --encoder encoder.onnx --vocabulary vocab.txt --encoder-sha256 SHA --output head.json [--routing-precision 0.95] [--minimum-routed 3]'
    );
    const artifact = await readJson(args.artifact);
    await validateV3Dataset({ artifact, vocabulary: args.vocabulary });
    const { encoderSha256, vocabularySha256 } = await verifyV3TrainingArtifacts({
        manifest: await readJson(args.manifest),
        artifact,
        encoder: args.encoder,
        vocabulary: args.vocabulary,
        encoderSha256: args['encoder-sha256']
    });
    const embedder = await openEncoder({
        encoder: args.encoder,
        vocabulary: args.vocabulary,
        encoderSha256,
        vocabularySha256
    });
    try {
        const head = await trainV3Head({
            artifact,
            trainIds: await readJson(args['train-ids']),
            calibrationIds: await readJson(args['calibration-ids']),
            embedder,
            encoderSha256,
            pretrained: await readJson(args['pretrained-head']),
            minimumRoutingPrecision: numberFlag(args['routing-precision'], 'routing-precision'),
            minimumRoutedForPrecision: numberFlag(args['minimum-routed'], 'minimum-routed')
        });
        await writeJson(args.output, head, { indent: 2 });
        log('INFO', 'train-head.done', {
            labels: head.labels.length,
            auxiliary: head.auxiliaryLabels.length,
            temperature: head.calibration.temperature,
            calibrationAccuracy: head.calibration.accuracy
        });
    } finally {
        await embedder.dispose();
    }
});
