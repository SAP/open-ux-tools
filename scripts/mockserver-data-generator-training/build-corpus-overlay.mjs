// Builds the classifier corpus overlay: the canonical registry and splits, unchanged, plus
//   - owner-authorized, privacy-reviewed metadata sources admitted as new train or calibration services,
//   - already-authorized registered services moved out of holdout splits they could never be scored in.
// Families and splits follow lib/corpus-overlay.mjs; anything resembling a sealed or evaluation-only
// service is excluded. Outputs go to a private directory; the report on stdout holds counts only.
//
// Usage:
//   node build-corpus-overlay.mjs --source-root /abs/S --registry registry.json --splits splits.json
//     --authorization authorization.json --privacy-review review-record.json
//     --pack origin=/abs/pack.config.json [--pack ...] --output-dir /abs/overlay
//     [--seed S] [--calibration-fraction 0.2]
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { parseEdmx } from '../../packages/mock-data-generator/dist/schema/edmx.js';
import {
    createFieldContextV3,
    serializeFieldContextV3
} from '../../packages/mock-data-generator/dist/semantics/field-context.js';
import {
    DEFAULT_FAMILY_RULE,
    decideComponents,
    familyLinks,
    protectedResemblance,
    validateCorpusOverlay
} from './lib/corpus-overlay.mjs';
import { checkedGraph } from './lib/incumbent-role-converter.mjs';
import { permittedForTraining } from './lib/planner-v3-converter.mjs';

const argument = (name) => {
    const index = process.argv.indexOf(name);
    return index < 0 ? undefined : process.argv[index + 1];
};
const values = (name) => process.argv.flatMap((value, index) => (value === name ? [process.argv[index + 1]] : []));
const root = argument('--source-root');
const registryPath = argument('--registry');
const splitsPath = argument('--splits');
const authorizationPath = argument('--authorization');
const privacyPath = argument('--privacy-review');
const packs = values('--pack').map((value) => ({
    origin: value.split('=')[0],
    config: value.split('=').slice(1).join('=')
}));
const outputDirectory = argument('--output-dir');
const seed = argument('--seed') ?? 'mockgen-corpus-overlay-v1';
const calibrationFraction = Number(argument('--calibration-fraction') ?? '0.2');
if (
    !root ||
    !registryPath ||
    !splitsPath ||
    !authorizationPath ||
    !privacyPath ||
    packs.length === 0 ||
    !outputDirectory
) {
    throw new Error(
        'Usage: build-corpus-overlay.mjs --source-root /abs --registry r.json --splits s.json --authorization a.json --privacy-review p.json --pack origin=/abs/pack.config.json [...] --output-dir /abs [--seed S] [--calibration-fraction 0.2]'
    );
}

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const baseRegistry = await readJson(registryPath);
const baseSplits = await readJson(splitsPath);
const authorizationBytes = await readFile(authorizationPath);
const authorization = JSON.parse(authorizationBytes.toString('utf8'));
const privacy = await readJson(privacyPath);
const excludedChecksums = new Set(privacy.excludedChecksums ?? []);
if (privacy.openFindings !== 0) throw new Error('privacy review has open findings');

const HOLDOUT = /-holdout$/u;
const contextKey = (context) => sha256(serializeFieldContextV3(context)).slice(0, 16);

/**
 * Field-context keys, field count and namespace/container identity of a parsed EDMX document.
 *
 * @param {string} xml metadata document
 * @returns {{ contexts: Set<string>, fields: number, namespaceContainer?: string }} summary
 */
function summarizeEdmx(xml) {
    const graph = parseEdmx(xml);
    const contexts = new Set();
    let fields = 0;
    for (const entity of graph.entities) {
        for (const property of entity.properties) {
            contexts.add(contextKey(createFieldContextV3(graph, entity, property)));
            fields += 1;
        }
    }
    return { contexts, fields, namespaceContainer: namespaceContainer(xml) };
}

function namespaceContainer(xml) {
    const containerAt = xml.search(/<EntityContainer\b/u);
    if (containerAt < 0) return undefined;
    const container = xml.slice(containerAt).match(/<EntityContainer\b[^>]*\bName="([^"]+)"/u)?.[1];
    const namespaces = [...xml.slice(0, containerAt).matchAll(/<Schema\b[^>]*\bNamespace="([^"]+)"/gu)];
    const namespace = namespaces.at(-1)?.[1];
    return container && namespace ? `${namespace}|${container}` : undefined;
}

// Registered services: fit (train/calibration), idle (authorized but stuck in a holdout), protected.
const kindOf = (service) => {
    const split = baseSplits.assignments[service.id];
    if (split === 'train' || split === 'calibration') return 'fit';
    const idle =
        HOLDOUT.test(split ?? '') &&
        split !== 'non-sap-holdout' &&
        service.evaluationOnly !== true &&
        service.license?.identifier === 'INTERNAL-OWNER-AUTHORIZATION' &&
        permittedForTraining(service);
    return idle ? 'idle' : 'protected';
};
const nodes = [];
const registeredChecksums = new Map();
let unreadableRegistered = 0;
for (const service of baseRegistry.services) {
    const kind = kindOf(service);
    const node = {
        id: service.id,
        kind,
        split: baseSplits.assignments[service.id],
        contexts: new Set(),
        identityKeys: [],
        fields: 0
    };
    const checksum = service.source?.contentChecksum;
    if (checksum) {
        node.identityKeys.push(`checksum:${checksum}`);
        registeredChecksums.set(checksum, { service, kind, local: !/^https?:/u.test(service.source.uri ?? '') });
    }
    try {
        const graph = await checkedGraph(resolve(root), service);
        for (const entity of graph.entities) {
            for (const property of entity.properties) {
                node.contexts.add(contextKey(createFieldContextV3(graph, entity, property)));
                node.fields += 1;
            }
        }
        if (service.source.format === 'edmx') {
            const identity = namespaceContainer(await readFile(resolve(root, service.source.uri), 'utf8'));
            if (identity) node.identityKeys.push(`ns:${identity}`);
        }
    } catch {
        unreadableRegistered += 1;
    }
    nodes.push(node);
}

// Candidate sources from the privacy-reviewed packs.
const candidates = new Map();
const exclusions = [];
const exclude = (reason, detail) => exclusions.push({ reason, ...detail });
for (const pack of packs) {
    const config = await readJson(pack.config);
    const packRoot = resolve(dirname(pack.config), config.root);
    const packFile = pack.config.replace(/\.config\.json$/u, '.pack.json');
    for (const entry of (await readJson(packFile)).entries) {
        const checksum = entry.contentChecksum;
        if (excludedChecksums.has(checksum)) {
            exclude('privacy-excluded', { origin: pack.origin, checksum });
            continue;
        }
        if (candidates.has(checksum)) continue;
        const registered = registeredChecksums.get(checksum);
        let origin = pack.origin;
        if (registered) {
            if (registered.kind === 'fit' && !registered.local) origin = 'fin-local-copy';
            else {
                exclude(`registered-${registered.kind}-identical`, { origin: pack.origin, checksum });
                continue;
            }
        }
        const absolute = join(packRoot, entry.path);
        const bytes = await readFile(absolute);
        if (sha256(bytes) !== checksum) throw new Error(`pack checksum mismatch for ${entry.id}`);
        const xml = bytes.toString('utf8');
        let summary;
        try {
            summary = summarizeEdmx(xml);
        } catch {
            exclude('unparsed', { origin, checksum });
            continue;
        }
        if (summary.fields === 0) {
            exclude('no-fields', { origin, checksum });
            continue;
        }
        const topDirectory = entry.path.split('/')[0];
        const [component, appId] =
            pack.origin === 's4-harvest' && topDirectory.includes('__')
                ? topDirectory.split('__')
                : [undefined, topDirectory];
        let harvestVersion;
        const recordPath = join(packRoot, topDirectory, 'record.json');
        if (pack.origin === 's4-harvest' && existsSync(recordPath))
            harvestVersion = (await readJson(recordPath)).version;
        candidates.set(checksum, {
            id: '',
            kind: 'new',
            origin,
            checksum,
            uri: relative(resolve(root), absolute).split('\\').join('/'),
            component,
            appId,
            harvestVersion,
            provider: config.provenance?.provider,
            contexts: summary.contexts,
            fields: summary.fields,
            namespaceContainer: summary.namespaceContainer,
            identityKeys: [
                `checksum:${checksum}`,
                ...(summary.namespaceContainer ? [`ns:${summary.namespaceContainer}`] : []),
                ...(appId ? [`app:${appId}`] : [])
            ]
        });
    }
}
const safe = (value) =>
    String(value ?? 'unknown')
        .replace(/[^A-Za-z0-9._-]+/gu, '-')
        .slice(0, 80);
const prefix = {
    's4-harvest': 's4h',
    'harvest-internal': 'hin',
    'private-sap-metadata': 'prv',
    'fin-local-copy': 'fin-local'
};
for (const candidate of candidates.values()) {
    candidate.id = `${prefix[candidate.origin] ?? 'src'}-${candidate.component ? `${safe(candidate.component)}-` : ''}${safe(candidate.appId)}-${candidate.checksum.slice(0, 16)}`;
    nodes.push(candidate);
}

// Families, sealed isolation and splits.
const links = familyLinks(nodes, DEFAULT_FAMILY_RULE);
const protectedExclusions = protectedResemblance(nodes, DEFAULT_FAMILY_RULE);
const { admitted, excluded } = decideComponents({ nodes, links, protectedExclusions, seed, calibrationFraction });
const byId = new Map(nodes.map((node) => [node.id, node]));

// One representative per namespace/container within a family: newest harvest version, most fields, lowest checksum.
const compareVersions = (left, right) =>
    String(right ?? '').localeCompare(String(left ?? ''), undefined, { numeric: true });
const representativeGroups = new Map();
for (const [id, decision] of admitted) {
    const node = byId.get(id);
    if (node.kind !== 'new') continue;
    const key = `${decision.familyKey}#${node.namespaceContainer ?? node.checksum}`;
    representativeGroups.set(key, [...(representativeGroups.get(key) ?? []), node]);
}
const aliases = new Map();
for (const group of representativeGroups.values()) {
    group.sort(
        (a, b) =>
            compareVersions(a.harvestVersion, b.harvestVersion) ||
            b.fields - a.fields ||
            a.checksum.localeCompare(b.checksum)
    );
    const [keep, ...rest] = group;
    aliases.set(
        keep.id,
        rest.map((node) => node.checksum)
    );
    for (const node of rest) {
        admitted.delete(node.id);
        excluded.set(node.id, 'alias-version');
    }
}

const authorizationReference = `corpus-v1/authorization.json#sha256:${sha256(authorizationBytes)}`;
const domainOf = (node) =>
    node.component
        ? `s4-harvest:${node.component}`
        : node.origin === 'fin-local-copy'
          ? 's4-fiori-fin'
          : 'internal-fiori-app';
const newRecords = [];
for (const [id, decision] of admitted) {
    const node = byId.get(id);
    if (node.kind !== 'new') continue;
    newRecords.push({
        id,
        source: {
            uri: node.uri,
            provider: node.provider ?? 'owner-collected internal metadata',
            collectedAt: '2026-09-21T00:00:00.000Z',
            format: 'edmx',
            contentChecksum: node.checksum,
            serviceName: node.namespaceContainer?.split('|')[1] ?? id
        },
        license: { identifier: 'INTERNAL-OWNER-AUTHORIZATION', redistributable: false },
        privacyClass: 'approved',
        ecosystem: 'sap',
        domainNovelty: 'known',
        productFamily: decision.familyKey,
        businessDomainFamily: domainOf(node),
        availability: { metadata: true, values: 'none' },
        annotationHistory: [],
        transformations: [],
        evaluationOnly: false,
        trainingAuthorization: {
            basis: authorization.basis,
            scope: authorization.scope,
            authorizedBy: authorization.authorizedBy,
            authorizedAt: authorization.authorizedAt,
            reference: authorizationReference,
            privacyReview: {
                status: 'passed',
                reportFingerprint: privacy.reportFingerprint,
                secretFindings: 0,
                personalDataFindings: 0,
                customerDataFindings: 0
            }
        },
        corpusOverlay: {
            version: 1,
            origin: node.origin,
            familyKey: decision.familyKey,
            identityKey: node.namespaceContainer ?? null,
            appId: node.appId ?? null,
            harvestVersion: node.harvestVersion ?? null,
            aliasChecksums: aliases.get(id) ?? []
        }
    });
}

// Overlay splits: canonical assignments and clusters, idle services moved, new families added.
const reassigned = [...admitted]
    .filter(([id]) => byId.get(id).kind === 'idle')
    .map(([id]) => id)
    .sort();
const moving = new Set(reassigned);
const assignments = { ...baseSplits.assignments };
for (const [id, decision] of admitted) assignments[id] = decision.split;
const clusters = baseSplits.clusters
    .map((cluster) => cluster.filter((id) => !moving.has(id)))
    .filter((cluster) => cluster.length > 0);
const newFamilies = new Map();
for (const [id, decision] of admitted) {
    if (decision.inheritFrom) {
        const cluster = clusters.find((members) => members.includes(decision.inheritFrom));
        if (cluster) cluster.push(id);
        else clusters.push([decision.inheritFrom, id]);
    } else {
        newFamilies.set(decision.familyKey, [...(newFamilies.get(decision.familyKey) ?? []), id]);
    }
}
for (const members of newFamilies.values()) clusters.push(members.sort());
const { fingerprint: baseFingerprint, registryFingerprint: baseRegistryFingerprint, ...splitsRest } = baseSplits;
const registry = { ...baseRegistry, services: [...baseRegistry.services, ...newRecords] };
const splits = {
    ...splitsRest,
    assignments,
    clusters,
    overlay: {
        format: 'mockgen-classifier-corpus-overlay-splits',
        version: 1,
        base: {
            registrySha256: sha256(await readFile(registryPath)),
            splitsSha256: sha256(await readFile(splitsPath)),
            splitsFingerprint: baseFingerprint ?? null,
            registryFingerprint: baseRegistryFingerprint ?? null
        },
        seed,
        calibrationFraction,
        familyRule: DEFAULT_FAMILY_RULE,
        reassigned
    }
};

const problems = validateCorpusOverlay({ baseRegistry, baseSplits, registry, splits });
for (const id of [...newRecords.map((record) => record.id), ...reassigned]) {
    if (protectedExclusions.has(id)) problems.push(`admitted service resembles a protected service: ${id}`);
}
if (problems.length > 0) {
    console.error(JSON.stringify({ problems: problems.slice(0, 20), total: problems.length }));
    process.exit(1);
}

await mkdir(outputDirectory, { recursive: true });
await writeFile(join(outputDirectory, 'registry.json'), `${JSON.stringify(registry)}\n`, { mode: 0o600 });
await writeFile(join(outputDirectory, 'splits.json'), `${JSON.stringify(splits)}\n`, { mode: 0o600 });
const excludedByReason = {};
for (const reason of excluded.values()) excludedByReason[reason] = (excludedByReason[reason] ?? 0) + 1;
for (const { reason } of exclusions) excludedByReason[reason] = (excludedByReason[reason] ?? 0) + 1;
await writeFile(
    join(outputDirectory, 'exclusions.json'),
    `${JSON.stringify({ excluded: [...excluded].map(([id, reason]) => ({ id, reason })), sources: exclusions })}\n`,
    { mode: 0o600 }
);
const countBy = (list, key) =>
    list.reduce((counts, item) => ({ ...counts, [key(item)]: (counts[key(item)] ?? 0) + 1 }), {});
const report = {
    format: 'mockgen-corpus-overlay-report',
    version: 1,
    registered: {
        total: baseRegistry.services.length,
        byKind: countBy(
            nodes.filter((node) => node.kind !== 'new'),
            (node) => node.kind
        ),
        unreadable: unreadableRegistered
    },
    candidates: { distinct: candidates.size, byOrigin: countBy([...candidates.values()], (node) => node.origin) },
    links: { total: links.length, byReason: countBy(links, (link) => link[2]) },
    admitted: {
        newServices: newRecords.length,
        newByOrigin: countBy(newRecords, (record) => record.corpusOverlay.origin),
        newBySplit: countBy(newRecords, (record) => assignments[record.id]),
        idleReassigned: reassigned.length,
        idleBySplit: countBy(reassigned, (id) => assignments[id]),
        inherited: [...admitted.values()].filter((decision) => decision.inheritFrom).length,
        newFamilies: newFamilies.size,
        largestNewFamily: Math.max(0, ...[...newFamilies.values()].map((members) => members.length)),
        newFields: newRecords.reduce((sum, record) => sum + byId.get(record.id).fields, 0),
        idleFields: reassigned.reduce((sum, id) => sum + byId.get(id).fields, 0)
    },
    excludedByReason
};
await writeFile(join(outputDirectory, 'overlay-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report));
