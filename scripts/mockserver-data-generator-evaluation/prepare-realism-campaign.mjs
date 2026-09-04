#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { artifactRecord } from './lib/evaluation.mjs';
import { loadVerifiedProductionCandidate, parseRealismCampaignArguments } from './lib/realism-candidate.mjs';
import { compileRealismReviews, REALISM_DOMAINS, sealRealismEvidence } from './lib/realism.mjs';

const SCRIPT_ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const REPOSITORY_ROOT = resolve(SCRIPT_ROOT, '../..');
const PACKAGE_ROOT = join(REPOSITORY_ROOT, 'packages/mockserver-data-generator');
const GENERATOR_ENTRY = join(PACKAGE_ROOT, 'dist/index.js');
const EDMX_ENTRY = join(PACKAGE_ROOT, 'dist/schema/edmx.js');
const CSN_ENTRY = join(PACKAGE_ROOT, 'dist/schema/csn.js');

function usage() {
    return [
        'Export a blinded production-candidate realism packet:',
        '  node scripts/mockserver-data-generator-evaluation/prepare-realism-campaign.mjs --export \\',
        '    --pilot-root <path> --model-manifest <manifest.json> --model-cache <cache> \\',
        '    --out <evidence.json> --campaign-manifest-out <manifest.json>',
        '',
        'Compile two independent provider artifacts:',
        '  node scripts/mockserver-data-generator-evaluation/prepare-realism-campaign.mjs --compile \\',
        '    --evidence <evidence.json> --provider-artifact <a.json> --provider-artifact <b.json> \\',
        '    --pilot-root <path> --out <consensus.json>',
        '',
        'The pilot root supplies only the retained selection manifest, metadata fixtures, review',
        'prompt, and output schema. Export uses the checksum-verified production manifest/cache.',
        'Generated values and provider outputs must remain outside open-ux-tools.'
    ].join('\n');
}

function canonicalJson(value) {
    if (Array.isArray(value)) {
        return `[${value.map((entry) => canonicalJson(entry)).join(',')}]`;
    }
    if (value !== null && typeof value === 'object') {
        return `{${Object.keys(value)
            .sort()
            .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
            .join(',')}}`;
    }
    return JSON.stringify(value);
}

function sha256(value) {
    return createHash('sha256').update(value).digest('hex');
}

function fingerprint(value) {
    return sha256(canonicalJson(value));
}

function assertRelativeSourcePath(pilotRoot, sourcePath) {
    if (typeof sourcePath !== 'string' || sourcePath.length === 0 || isAbsolute(sourcePath)) {
        throw new TypeError('Inspection source paths must be non-empty and relative to the pilot root');
    }
    const root = resolve(pilotRoot);
    const path = resolve(root, sourcePath);
    if (!path.startsWith(`${root}${sep}`)) {
        throw new TypeError('Inspection source path resolves outside the pilot root');
    }
    return path;
}

async function readRegularFile(path, label) {
    const details = await lstat(path);
    if (!details.isFile() || details.isSymbolicLink()) {
        throw new TypeError(`${label} must be a regular non-symbolic-link file`);
    }
    return readFile(path, 'utf8');
}

function inputFormat(target, source) {
    if (target.format === 'csn') {
        return 'csn';
    }
    if (target.format !== 'edmx') {
        throw new TypeError(`Unsupported first-release inspection format: ${target.format}`);
    }
    if (/schemas\.microsoft\.com\/ado\//.test(source) || /DataServiceVersion="(?:1|2)\./.test(source)) {
        return 'edmx-v2';
    }
    if (/docs\.oasis-open\.org\/odata\/ns\/edm/.test(source)) {
        return 'edmx-v4';
    }
    throw new TypeError(`Cannot determine OData version for inspection service ${target.serviceId}`);
}

function selectProperties(graph, target) {
    const entities = [...graph.entities].sort((left, right) => left.name.localeCompare(right.name));
    if (Array.isArray(target.selection)) {
        return target.selection.flatMap((selection) => {
            const entity = entities.find((candidate) => candidate.name === selection.entity);
            if (!entity || new Set(selection.properties).size !== selection.properties.length) {
                throw new TypeError(
                    `Invalid explicit inspection selection for ${target.serviceId}:${selection.entity}`
                );
            }
            const properties = selection.properties.map((propertyName) => {
                const property = entity.properties.find((candidate) => candidate.name === propertyName);
                if (!property) {
                    throw new TypeError(
                        `Unknown explicit inspection property for ${target.serviceId}:${selection.entity}.${propertyName}`
                    );
                }
                return property;
            });
            return properties.map((property) => ({ entity, property }));
        });
    }
    const budget = target.fieldBudget ?? 12;
    if (!Number.isSafeInteger(budget) || budget < 1 || budget > 1_000) {
        throw new TypeError(`Invalid inspection field budget for ${target.serviceId}`);
    }
    const groups = entities
        .filter((entity) => entity.properties.length > 0)
        .map((entity) => ({
            entity,
            properties: [...entity.properties].sort((left, right) =>
                sha256(`${target.serviceId}:${left.name}`).localeCompare(sha256(`${target.serviceId}:${right.name}`))
            )
        }))
        .sort((left, right) =>
            sha256(`${target.serviceId}:${left.entity.name}`).localeCompare(
                sha256(`${target.serviceId}:${right.entity.name}`)
            )
        );
    const selected = [];
    for (let rank = 0; selected.length < budget; rank += 1) {
        let added = false;
        for (const group of groups) {
            const property = group.properties[rank];
            if (!property) {
                continue;
            }
            selected.push({ entity: group.entity, property });
            added = true;
            if (selected.length === budget) {
                break;
            }
        }
        if (!added) {
            break;
        }
    }
    return selected;
}

function generationTargets(graph, selected, relationships) {
    const byEntityName = new Map(graph.entities.map((entity) => [entity.name, entity]));
    const names = new Set(selected.map(({ entity }) => entity.entitySetName));
    for (const relationship of relationships ?? []) {
        const entity = byEntityName.get(relationship.entity);
        if (!entity) {
            throw new TypeError(`Unknown relationship inspection entity ${relationship.entity}`);
        }
        names.add(entity.entitySetName);
    }
    let changed = true;
    while (changed) {
        changed = false;
        for (const relationship of graph.relationships) {
            if (names.has(relationship.fromEntitySet) && !names.has(relationship.toEntitySet)) {
                names.add(relationship.toEntitySet);
                changed = true;
            }
        }
    }
    return [...names].sort().map((name) => ({ name, kind: 'entity-set' }));
}

function propertyFacets(property) {
    return {
        nullable: property.nullable,
        isKey: property.isKey,
        ...(property.maxLength === undefined ? {} : { maxLength: property.maxLength }),
        ...(property.precision === undefined ? {} : { precision: property.precision }),
        ...(property.scale === undefined ? {} : { scale: property.scale }),
        ...(property.enumValues === undefined ? {} : { enumValues: [...property.enumValues] })
    };
}

function relationshipFields(graph, target, result, format) {
    const entities = new Map(graph.entities.map((entity) => [entity.name, entity]));
    return (target.relationships ?? []).map((relationship) => {
        const entity = entities.get(relationship.entity);
        if (!entity || !Array.isArray(relationship.properties) || relationship.properties.length === 0) {
            throw new TypeError(`Invalid relationship inspection ${target.serviceId}:${relationship.id}`);
        }
        for (const propertyName of relationship.properties) {
            if (!entity.properties.some((property) => property.name === propertyName)) {
                throw new TypeError(`Unknown relationship member ${target.serviceId}:${propertyName}`);
            }
        }
        return {
            fieldKey: `${target.domain}:${target.serviceId}:relationship:${relationship.id}`,
            domain: target.domain,
            serviceId: target.serviceId,
            format,
            entity: entity.name,
            property: relationship.id,
            primitiveType: 'relationship',
            label: relationship.criterion,
            facets: { memberProperties: [...relationship.properties] },
            plannerSource: 'evaluation-contract',
            values: (result.resources[entity.entitySetName] ?? []).map((row) =>
                Object.fromEntries(relationship.properties.map((propertyName) => [propertyName, row[propertyName]]))
            )
        };
    });
}

function pilotPaths(pilotRoot) {
    return {
        selectionManifest: join(pilotRoot, 'benchmark/ml-native/llm-inspection-manifest.json'),
        prompt: join(pilotRoot, 'training/review/generation-inspection-prompt.md'),
        schema: join(pilotRoot, 'training/review/generation-inspection-output.schema.json')
    };
}

function packageBinding() {
    const packageCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: REPOSITORY_ROOT,
        encoding: 'utf8'
    }).trim();
    const packageDiff = execFileSync('git', ['status', '--porcelain', '--', 'packages/mockserver-data-generator'], {
        cwd: REPOSITORY_ROOT,
        encoding: 'utf8'
    }).trim();
    if (packageDiff.length > 0) {
        throw new TypeError('The mockserver-data-generator package must be clean before freezing realism evidence');
    }
    return { packageCommit, packageSourceClean: true };
}

async function exportCampaign(options) {
    const paths = pilotPaths(options.pilotRoot);
    const [selectionSource, promptSource, schemaSource] = await Promise.all([
        readRegularFile(paths.selectionManifest, 'inspection selection manifest'),
        readRegularFile(paths.prompt, 'inspection prompt'),
        readRegularFile(paths.schema, 'inspection output schema')
    ]);
    const selection = JSON.parse(selectionSource);
    if (selection.version !== 1 || !Array.isArray(selection.targets) || selection.minimumReviewedFields < 300) {
        throw new TypeError('Pilot inspection manifest is not compatible with the production realism campaign');
    }
    const supportedTargets = selection.targets.filter((target) => ['edmx', 'csn'].includes(target.format));
    const skippedTargets = selection.targets
        .filter((target) => !['edmx', 'csn'].includes(target.format))
        .map((target) => ({ serviceId: target.serviceId, format: target.format, reason: 'first-release-non-goal' }));
    const generator = await import(pathToFileURL(GENERATOR_ENTRY).href);
    const [{ parseEdmx }, { parseCsn }] = await Promise.all([
        import(pathToFileURL(EDMX_ENTRY).href),
        import(pathToFileURL(CSN_ENTRY).href)
    ]);
    const candidate = await loadVerifiedProductionCandidate({
        generator,
        manifestPath: options.modelManifest,
        cacheRoot: options.modelCache
    });
    const { learned } = candidate;
    const generationOptions = Object.freeze({
        rowsPerEntity: 2,
        seed: options.seed,
        locale: 'en',
        mode: 'learned',
        sftTimeoutMs: 20_000
    });
    const targets = [];
    const fields = [];
    try {
        for (const target of supportedTargets) {
            if (!REALISM_DOMAINS.includes(target.domain) || typeof target.serviceId !== 'string') {
                throw new TypeError('Inspection target has an unsupported domain or service identity');
            }
            const sourcePath = assertRelativeSourcePath(options.pilotRoot, target.path);
            const source = await readRegularFile(sourcePath, `inspection source ${target.serviceId}`);
            const format = inputFormat(target, source);
            const graph = target.format === 'edmx' ? parseEdmx(source) : parseCsn(source);
            const selected = selectProperties(graph, target);
            const request = {
                metadata: { format: target.format, content: source },
                service: {
                    urlPath: `/evaluation/${target.serviceId}`,
                    alias: target.serviceName,
                    odataVersion: format === 'edmx-v2' ? '2.0' : '4.0'
                },
                targets: generationTargets(graph, selected, target.relationships),
                existingData: {}
            };
            const result = await generator.generateService(request, generationOptions, learned.runtime);
            generator.validateGeneratedResult(request, result);
            targets.push({
                domain: target.domain,
                serviceId: target.serviceId,
                format,
                provenance: target.provenance,
                schemaFingerprint: sha256(source),
                resultFingerprint: fingerprint(result)
            });
            for (const { entity, property } of selected) {
                fields.push({
                    fieldKey: `${target.domain}:${target.serviceId}:${entity.name}:${property.name}`,
                    domain: target.domain,
                    serviceId: target.serviceId,
                    format,
                    entity: entity.name,
                    property: property.name,
                    primitiveType: property.primitiveType,
                    label: property.label ?? null,
                    facets: propertyFacets(property),
                    plannerSource: 'production-tiered-generator',
                    values: (result.resources[entity.entitySetName] ?? []).map((row) => row[property.name] ?? null)
                });
            }
            fields.push(...relationshipFields(graph, target, result, format));
        }
    } finally {
        await learned.dispose();
    }
    const require = createRequire(pathToFileURL(GENERATOR_ENTRY));
    const runtimeNames = [...new Set(candidate.manifest.components.map(({ runtime }) => runtime.package))];
    if (runtimeNames.length !== 1) {
        throw new TypeError('Realism export requires one shared learned-runtime package');
    }
    const runtimeName = runtimeNames[0];
    const onnxRuntimePackage = require.resolve(`${runtimeName}/package.json`);
    const onnxRuntime = JSON.parse(await readRegularFile(onnxRuntimePackage, 'ONNX Runtime package manifest'));
    const packageArtifact = artifactRecord('mockserver-data-generator-dist', GENERATOR_ENTRY);
    const bindings = {
        version: 2,
        kind: 'mockserver-data-generator-realism-candidate-bindings',
        ...packageBinding(),
        packageArtifact,
        runtime: {
            node: process.versions.node,
            package: runtimeName,
            version: onnxRuntime.version,
            packageManifest: artifactRecord('learned-runtime-package-manifest', onnxRuntimePackage),
            platform: process.platform,
            architecture: process.arch
        },
        model: candidate.binding,
        generationOptions,
        selectionManifest: {
            filename: basename(paths.selectionManifest),
            bytes: Buffer.byteLength(selectionSource),
            sha256: sha256(selectionSource)
        },
        prompt: {
            filename: basename(paths.prompt),
            bytes: Buffer.byteLength(promptSource),
            sha256: sha256(promptSource)
        },
        outputSchema: {
            filename: basename(paths.schema),
            bytes: Buffer.byteLength(schemaSource),
            sha256: sha256(schemaSource)
        }
    };
    const candidateFingerprint = fingerprint(bindings);
    const evidence = sealRealismEvidence({
        version: 1,
        kind: 'mockserver-data-generator-realism-evidence',
        candidateFingerprint,
        promptFingerprint: sha256(promptSource),
        outputSchemaFingerprint: sha256(schemaSource),
        selectionManifestFingerprint: sha256(selectionSource),
        randomizationSeed: options.seed,
        targets,
        fields,
        minimumReviewedFields: selection.minimumReviewedFields,
        coverageGaps: []
    });
    const evidenceSource = `${JSON.stringify(evidence, null, 2)}\n`;
    const campaign = {
        ...bindings,
        candidateFingerprint,
        skippedTargets,
        evidence: {
            filename: basename(options.output),
            bytes: Buffer.byteLength(evidenceSource),
            sha256: sha256(evidenceSource),
            fingerprint: evidence.fingerprint,
            fields: evidence.fields.length
        }
    };
    const sealedCampaign = { ...campaign, fingerprint: fingerprint(campaign) };
    await Promise.all([
        mkdir(dirname(options.output), { recursive: true }),
        mkdir(dirname(options.manifest), { recursive: true })
    ]);
    await writeFile(options.output, evidenceSource, { flag: 'wx', mode: 0o600 });
    await writeFile(options.manifest, `${JSON.stringify(sealedCampaign, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    return { evidence, campaign: sealedCampaign };
}

async function compileCampaign(options) {
    const paths = pilotPaths(options.pilotRoot);
    const [evidenceSource, promptSource, schemaSource, ...providerSources] = await Promise.all([
        readRegularFile(options.evidence, 'realism evidence'),
        readRegularFile(paths.prompt, 'inspection prompt'),
        readRegularFile(paths.schema, 'inspection output schema'),
        ...options.providers.map((path) => readRegularFile(path, 'provider artifact'))
    ]);
    const report = compileRealismReviews(evidenceSource, promptSource, schemaSource, providerSources);
    await mkdir(dirname(options.output), { recursive: true });
    await writeFile(options.output, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    return report;
}

async function main() {
    const args = process.argv.slice(2);
    if (args.includes('--help') || args.includes('-h')) {
        process.stdout.write(`${usage()}\n`);
        return;
    }
    const options = parseRealismCampaignArguments(args);
    if (options.mode === 'export') {
        const result = await exportCampaign(options);
        process.stdout.write(
            `${JSON.stringify({
                output: options.output,
                fields: result.evidence.fields.length,
                evidenceFingerprint: result.evidence.fingerprint,
                candidateFingerprint: result.campaign.candidateFingerprint
            })}\n`
        );
        return;
    }
    const report = await compileCampaign(options);
    process.stdout.write(
        `${JSON.stringify({ output: options.output, passed: report.passed, realisticRate: report.realisticRate })}\n`
    );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().catch((error) => {
        process.stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
        process.exitCode = 1;
    });
}
