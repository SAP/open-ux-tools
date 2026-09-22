import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { convertPlannerServiceV3 } from './lib/planner-v3-converter.mjs';
import {
    eligibleAuthorizedStatusTrainingServices,
    eligiblePublicStatusHoldoutServices,
    eligiblePublicStatusServices,
    eligibleFieldSample
} from './lib/status-review-selection.mjs';

const argument = (name) => {
    const index = process.argv.indexOf(name);
    return index < 0 ? undefined : process.argv[index + 1];
};
const values = (name) => process.argv.flatMap((value, index) => (value === name ? [process.argv[index + 1]] : []));
const root = argument('--source-root');
const registryPath = argument('--registry');
const splitsPath = argument('--splits');
const plannerDirectory = argument('--planner-dir');
const outputPath = argument('--output');
const explicitServiceIds = values('--service-id');
const allPublicHoldouts = process.argv.includes('--all-public-holdouts');
const allPublicTrainCalibration = process.argv.includes('--all-public-train-calibration');
const allAuthorizedTrainCalibration = process.argv.includes('--all-authorized-train-calibration');
const nonStatusSample =
    argument('--non-status-sample') === undefined ? undefined : Number(argument('--non-status-sample'));
const sampleSeed = argument('--sample-seed') ?? 'mockgen-non-status-sample-v1';
const fieldNamePattern =
    argument('--field-name-pattern') === undefined ? undefined : new RegExp(argument('--field-name-pattern'), 'iu');
if (
    !root ||
    !registryPath ||
    !splitsPath ||
    !plannerDirectory ||
    !outputPath ||
    Number(explicitServiceIds.length > 0) +
        Number(allPublicHoldouts) +
        Number(allPublicTrainCalibration) +
        Number(allAuthorizedTrainCalibration) !==
        1
) {
    throw new Error(
        'Usage: audit-planner-status-queue.mjs --source-root /abs/incumbent --registry registry.json --splits splits.json --planner-dir /abs/v49 (--service-id ID | --all-public-holdouts | --all-public-train-calibration | --all-authorized-train-calibration) --output /abs/review-queue.json'
    );
}
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const registry = await readJson(registryPath);
const splits = await readJson(splitsPath);
const mapping = await readJson(new URL('./v3-descriptor-role-mapping.json', import.meta.url));
const partitions = [
    'train',
    'calibration',
    'known-sap-holdout',
    'unseen-sap-holdout',
    'non-sap-holdout',
    'adversarial-unknown-holdout'
];
const datasets = await Promise.all(
    partitions.map(async (name) => ({ name, dataset: await readJson(join(plannerDirectory, `${name}.json`)) }))
);
const samplePartitions = allPublicHoldouts
    ? partitions.filter((name) => name.endsWith('-holdout'))
    : ['train', 'calibration'];
const sampled =
    nonStatusSample === undefined
        ? undefined
        : eligibleFieldSample({
              registry,
              datasets,
              partitions: samplePartitions,
              includeAuthorizedInternal: allAuthorizedTrainCalibration,
              seed: sampleSeed,
              perService: nonStatusSample,
              fieldNamePattern
          });
const serviceIds = sampled
    ? [...sampled.keys()]
    : allPublicHoldouts
      ? eligiblePublicStatusHoldoutServices({ registry, datasets })
      : allPublicTrainCalibration
        ? eligiblePublicStatusServices({ registry, datasets, partitions: ['train', 'calibration'] })
        : allAuthorizedTrainCalibration
          ? eligibleAuthorizedStatusTrainingServices({ registry, datasets })
          : explicitServiceIds;
const results = [];
for (const serviceId of serviceIds) {
    const matches = datasets.filter(({ dataset }) =>
        dataset.services?.some((service) => service.serviceId === serviceId)
    );
    if (matches.length !== 1) throw new TypeError(`service ${serviceId} must occur in exactly one planner partition`);
    const { name, dataset } = matches[0];
    const purpose = name === 'train' || name === 'calibration' ? name : 'evaluation';
    const result = await convertPlannerServiceV3({
        dataset,
        registry,
        splits,
        serviceId,
        mapping,
        root: resolve(root),
        purpose,
        includeReviewQueue: true,
        ...(sampled ? { reviewQueueFilter: (property) => sampled.get(serviceId)?.has(property.fieldId) === true } : {})
    });
    results.push({ serviceId, partition: name, pending: result.reviewQueue });
}
await writeFile(
    outputPath,
    `${JSON.stringify(
        {
            format: 'mockgen-role-review-queue',
            version: 1,
            qualification: 'pending-adjudication-not-training-data',
            ...(sampled
                ? { selection: { kind: 'non-status-sample', perService: nonStatusSample, seed: sampleSeed } }
                : {}),
            services: results
        },
        null,
        2
    )}\n`,
    'utf8'
);
process.stdout.write(
    `${JSON.stringify({
        services: results.length,
        pendingStatusFields: results.reduce((sum, result) => sum + result.pending.length, 0),
        partitions: Object.fromEntries(results.map((result) => [result.serviceId, result.partition]))
    })}\n`
);
