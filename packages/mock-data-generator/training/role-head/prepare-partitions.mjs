#!/usr/bin/env node
/**
 * Step 1 of the role head: train and calibration partitions from the published dataset.
 * Reads rows_head_a/train and field_contexts/train; writes prep.jsonl, train-ids.json,
 * calibration-ids.json and partition-report.json into --output-dir.
 */
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { datasetFile, log, parseCli, readJsonl, runCli, writeJson, writeJsonl } from '../common/io.mjs';
import {
    DEFAULT_EXCLUDED_CALIBRATION_LABELS,
    DEFAULT_EXCLUDED_POOL_PREFIX,
    buildRoleHeadPartitions
} from './partitions.mjs';

await runCli('prepare-partitions', async () => {
    const args = parseCli(
        {
            'dataset': { required: true },
            'output-dir': { required: true },
            'exclude-pool-prefix': { default: DEFAULT_EXCLUDED_POOL_PREFIX },
            'exclude-calibration-label': { multiple: true }
        },
        'Usage: prepare-partitions.mjs --dataset DIR --output-dir DIR [--exclude-pool-prefix P] [--exclude-calibration-label L ...]'
    );
    const rows = await readJsonl(await datasetFile(args.dataset, 'rows_head_a', 'train'));
    const fieldContexts = new Map(
        (await readJsonl(await datasetFile(args.dataset, 'field_contexts', 'train'))).map((record) => [
            record.field_id,
            record
        ])
    );
    const { records, trainIds, calibrationIds, report } = buildRoleHeadPartitions({
        rows,
        fieldContexts,
        excludedPoolPrefix: args['exclude-pool-prefix'],
        excludedCalibrationLabels: args['exclude-calibration-label'] ?? DEFAULT_EXCLUDED_CALIBRATION_LABELS
    });
    await mkdir(args['output-dir'], { recursive: true });
    await writeJsonl(join(args['output-dir'], 'prep.jsonl'), records);
    await writeJson(join(args['output-dir'], 'train-ids.json'), trainIds);
    await writeJson(join(args['output-dir'], 'calibration-ids.json'), calibrationIds);
    await writeJson(join(args['output-dir'], 'partition-report.json'), report, { indent: 1 });
    log('INFO', 'prepare-partitions.done', report);
});
