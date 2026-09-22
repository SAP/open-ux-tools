// Builds a role-review queue for train or calibration services straight from their checksum-verified
// sources, without planner datasets. Used for the classifier corpus overlay, whose services have no
// planner records. The output has the `mockgen-role-review-queue` format read by
// build-adjudication-packet.mjs. Queues hold field contexts and must be written outside the repository.
//
// Usage:
//   node build-source-review-queue.mjs --source-root /abs/root --registry registry.json --splits splits.json
//     --vocabulary vocab.txt --output /abs/queue.json
//     (--split train|calibration [--origins a,b] | --service-id ID ...)
//     --mode census|uniform|items [--per-service N] [--seed S] [--items items.json]
//     [--exclude-packet packet.json ...] [--exclude-queue queue.json ...] [--exclude-sealed sealed.jsonl]
//
//   census   writes per-service field counts only (no contexts)
//   uniform  keeps up to --per-service fields per service in a salted-hash order
//   items    keeps exactly the {serviceId, fieldId} pairs listed in --items
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createMiniLmTokenizer } from '../../packages/mock-data-generator/dist/model/minilm-tokenizer.js';
import {
    fittingSourceAllowed,
    inputKeys,
    reviewItemId,
    selectUniform,
    serviceFieldItems
} from './lib/source-review-queue.mjs';

const argument = (name) => {
    const index = process.argv.indexOf(name);
    return index < 0 ? undefined : process.argv[index + 1];
};
const values = (name) => process.argv.flatMap((value, index) => (value === name ? [process.argv[index + 1]] : []));
const root = argument('--source-root');
const registryPath = argument('--registry');
const splitsPath = argument('--splits');
const vocabularyPath = argument('--vocabulary');
const outputPath = argument('--output');
const split = argument('--split');
const origins = argument('--origins')?.split(',').filter(Boolean);
const explicitServiceIds = values('--service-id');
const mode = argument('--mode');
const perService = argument('--per-service') === undefined ? undefined : Number(argument('--per-service'));
const seed = argument('--seed') ?? 'mockgen-source-review-v1';
const itemsPath = argument('--items');
if (
    !root ||
    !registryPath ||
    !splitsPath ||
    !vocabularyPath ||
    !outputPath ||
    Number(split !== undefined) + Number(explicitServiceIds.length > 0) !== 1 ||
    !['census', 'uniform', 'items'].includes(mode) ||
    (mode === 'uniform' && !(Number.isSafeInteger(perService) && perService > 0)) ||
    (mode === 'items' && !itemsPath)
) {
    throw new Error(
        'Usage: build-source-review-queue.mjs --source-root /abs --registry r.json --splits s.json --vocabulary vocab.txt --output /abs/queue.json (--split train|calibration [--origins a,b] | --service-id ID ...) --mode census|uniform|items [--per-service N] [--seed S] [--items items.json] [--exclude-packet p.json ...] [--exclude-queue q.json ...] [--exclude-sealed sealed.jsonl]'
    );
}
if (split !== undefined && split !== 'train' && split !== 'calibration')
    throw new Error('--split must be train or calibration');

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const registry = await readJson(registryPath);
const splits = await readJson(splitsPath);
const tokenizer = createMiniLmTokenizer(await readFile(vocabularyPath, 'utf8'), 64);

const excludeItemIds = new Set();
const excludeContentKeys = new Set();
const excludeContext = (context) => {
    const { textKey, tokenKey } = inputKeys(context, tokenizer);
    excludeContentKeys.add(textKey);
    excludeContentKeys.add(tokenKey);
};
for (const path of values('--exclude-packet')) {
    for (const item of (await readJson(path)).items ?? []) {
        excludeItemIds.add(item.itemId);
        if (item.context) excludeContext(item.context);
    }
}
for (const path of values('--exclude-queue')) {
    for (const service of (await readJson(path)).services ?? []) {
        for (const item of service.pending ?? []) {
            excludeItemIds.add(reviewItemId(item.serviceId, item.fieldId));
            excludeContext(item.context);
        }
    }
}
const sealedPath = argument('--exclude-sealed');
if (sealedPath) {
    for (const line of (await readFile(sealedPath, 'utf8')).split('\n').filter(Boolean))
        excludeContext(JSON.parse(line).context);
}

const originOf = (service) =>
    (splits.overlay?.reassigned ?? []).includes(service.id) ? 'idle' : (service.corpusOverlay?.origin ?? 'base');
const serviceIds =
    explicitServiceIds.length > 0
        ? explicitServiceIds
        : registry.services
              .filter((service) => splits.assignments?.[service.id] === split && fittingSourceAllowed(service))
              .filter((service) => !origins || origins.includes(originOf(service)))
              .map((service) => service.id);

const wanted = mode === 'items' ? new Map() : undefined;
if (wanted) {
    for (const { serviceId, fieldId } of await readJson(itemsPath)) {
        wanted.set(serviceId, new Set([...(wanted.get(serviceId) ?? []), fieldId]));
    }
}

const services = [];
const census = [];
let failures = 0;
for (const serviceId of wanted ? serviceIds.filter((id) => wanted.has(id)) : serviceIds) {
    let result;
    try {
        result = await serviceFieldItems({ root: resolve(root), registry, splits, serviceId });
    } catch (error) {
        failures += 1;
        process.stderr.write(
            `${JSON.stringify({ serviceId, error: String(error?.message ?? error).slice(0, 160) })}\n`
        );
        continue;
    }
    if (mode === 'census') {
        const tokenKeys = new Set(result.items.map((item) => inputKeys(item.context, tokenizer).tokenKey));
        census.push({ serviceId, split: result.split, fields: result.items.length, distinctInputs: tokenKeys.size });
        continue;
    }
    const pending =
        mode === 'uniform'
            ? selectUniform(result.items, { perService, seed, tokenizer, excludeItemIds, excludeContentKeys })
            : result.items.filter((item) => wanted.get(serviceId).has(item.fieldId));
    if (pending.length > 0) services.push({ serviceId, partition: result.partition, pending });
}

const selection = {
    kind: `source-${mode}`,
    ...(split ? { split } : {}),
    ...(origins ? { origins } : {}),
    ...(perService ? { perService, seed } : {})
};
await writeFile(
    outputPath,
    `${JSON.stringify(
        mode === 'census'
            ? { format: 'mockgen-source-census', version: 1, selection, services: census }
            : {
                  format: 'mockgen-role-review-queue',
                  version: 1,
                  qualification: 'pending-adjudication-not-training-data',
                  selection,
                  services
              }
    )}\n`,
    { mode: 0o600 }
);
const fields =
    mode === 'census'
        ? census.reduce((sum, entry) => sum + entry.fields, 0)
        : services.reduce((sum, entry) => sum + entry.pending.length, 0);
console.log(
    JSON.stringify({
        mode,
        services: mode === 'census' ? census.length : services.length,
        fields,
        failures,
        output: outputPath
    })
);
