import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { isAbsolute, resolve, sep } from 'node:path';

function sha256(value) {
    return createHash('sha256').update(value).digest('hex');
}

function valueShape(value) {
    if (value === null) return { kind: 'null' };
    if (Array.isArray(value)) return { kind: 'array', length: value.length };
    if (typeof value === 'string') return { kind: 'string', length: value.length };
    if (typeof value === 'number') return { kind: 'number', finite: Number.isFinite(value) };
    if (typeof value === 'boolean') return { kind: 'boolean' };
    return { kind: typeof value };
}

function sourcePath(root, candidate) {
    if (typeof candidate !== 'string' || candidate.length === 0 || isAbsolute(candidate)) {
        throw new TypeError('value source path must be a relative file path');
    }
    const resolvedRoot = resolve(root);
    const resolved = resolve(resolvedRoot, candidate);
    const prefix = `${resolvedRoot}${sep}`;
    if (resolved !== resolvedRoot && !resolved.startsWith(prefix)) {
        throw new TypeError('value source path escapes the source root');
    }
    return resolved;
}

function assertApprovedDataset(dataset) {
    if (
        dataset?.privacyClass !== 'public' ||
        dataset.license?.redistributable !== true ||
        dataset.approval?.purpose !== 'generator-training' ||
        typeof dataset.serviceId !== 'string' ||
        !/^[a-f\d]{64}$/u.test(dataset.source?.checksum ?? '')
    ) {
        throw new TypeError(
            `Dataset ${dataset?.id ?? '<unknown>'} is not approved as a redistributable generator source`
        );
    }
}

async function readVerifiedRows(dataset, root) {
    assertApprovedDataset(dataset);
    const path = sourcePath(root, dataset.source.path);
    const [realRoot, realSource] = await Promise.all([realpath(root), realpath(path)]);
    if (realSource !== realRoot && !realSource.startsWith(`${realRoot}${sep}`)) {
        throw new TypeError('value source path escapes the source root');
    }
    const content = await readFile(realSource, 'utf8');
    if (sha256(content) !== dataset.source.checksum) {
        throw new TypeError(`Dataset ${dataset.id} source checksum mismatch`);
    }
    return content
        .split(/\r?\n/u)
        .filter(Boolean)
        .map((line, lineNumber) => {
            try {
                return JSON.parse(line);
            } catch (error) {
                throw new TypeError(`Dataset ${dataset.id} has invalid JSONL at line ${lineNumber + 1}`, {
                    cause: error
                });
            }
        });
}

/** Extract privacy-safe, unreviewed field/value candidates from approved value JSONL sources. */
export async function extractRelevanceCandidates({ catalog, sourceRoot, splitByService = {} }) {
    if (!Array.isArray(catalog?.datasets) || catalog.datasets.length === 0) {
        throw new TypeError('approved value catalog must contain datasets');
    }
    const rows = [];
    const seen = new Set();
    for (const dataset of catalog.datasets) {
        const sourceRows = await readVerifiedRows(dataset, sourceRoot);
        for (const [rowIndex, sourceRow] of sourceRows.entries()) {
            if (typeof sourceRow?.entityId !== 'string' || !sourceRow.values || typeof sourceRow.values !== 'object') {
                throw new TypeError(`Dataset ${dataset.id} row ${rowIndex + 1} has no entityId/values object`);
            }
            for (const [fieldId, value] of Object.entries(sourceRow.values)) {
                const valueDigest = sha256(JSON.stringify(value));
                const id = sha256(`${dataset.serviceId}|${sourceRow.entityId}|${fieldId}|${valueDigest}`);
                if (seen.has(id)) continue;
                seen.add(id);
                rows.push({
                    id,
                    serviceGroup: dataset.serviceId,
                    ...(Object.hasOwn(splitByService, dataset.serviceId)
                        ? { suggestedSplit: splitByService[dataset.serviceId] }
                        : {}),
                    reviewed: false,
                    relevant: null,
                    pair: {
                        service: {
                            alias: dataset.serviceId,
                            urlPath: `/${dataset.serviceId}`,
                            odataVersion: 'unknown'
                        },
                        resource: sourceRow.entityId,
                        entity: sourceRow.entityId,
                        field: { name: fieldId, primitiveType: valueShape(value).kind },
                        valueDigest,
                        valueShape: valueShape(value),
                        linkedCode: { property: '', valueDigest: '' },
                        relatedResources: []
                    },
                    source: { datasetId: dataset.id, sourcePath: dataset.source.path, rowIndex: rowIndex + 1 }
                });
            }
        }
    }
    return Object.freeze({
        kind: 'mockgen-field-value-relevance-review-packet',
        version: 1,
        qualification: Object.freeze({
            status: 'unqualified',
            reviewed: false,
            reason: 'Candidates require independent human review before training or evaluation.'
        }),
        privacy: Object.freeze({ rawValuesIncluded: false, sourceChecksumsVerified: true }),
        rows: Object.freeze(rows)
    });
}
