#!/usr/bin/env node

import { lstat, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assembleRealismProviderArtifact, prepareRealismReviewBatches } from './lib/realism-review-batches.mjs';

const MODES = new Set(['--prepare', '--assemble']);
const VALUES = new Set([
    '--evidence',
    '--out-dir',
    '--maximum-fields-per-batch',
    '--pilot-root',
    '--batch-manifest',
    '--provider-artifact',
    '--out'
]);

function usage() {
    return [
        'Prepare deterministic bounded provider inputs:',
        '  node scripts/mockserver-data-generator-evaluation/realism-review-batches.mjs --prepare \\',
        '    --evidence <absolute-evidence.json> --out-dir <absolute-directory> \\',
        '    [--maximum-fields-per-batch 50]',
        '',
        'Assemble one provider artifact after every batch is reviewed:',
        '  node scripts/mockserver-data-generator-evaluation/realism-review-batches.mjs --assemble \\',
        '    --pilot-root <absolute-pilot-root> --evidence <absolute-evidence.json> \\',
        '    --batch-manifest <absolute-manifest.json> \\',
        '    --provider-artifact <batch-001.json> [--provider-artifact <batch-002.json> ...] \\',
        '    --out <absolute-provider.json>',
        '',
        'Generated values and provider outputs must remain outside open-ux-tools.'
    ].join('\n');
}

function argument(args, name) {
    const index = args.indexOf(name);
    return index < 0 ? undefined : args[index + 1];
}

function repeatedArguments(args, name) {
    return args.flatMap((value, index) => (value === name && args[index + 1] ? [args[index + 1]] : []));
}

function absoluteArgument(args, name) {
    const value = argument(args, name);
    if (!value || !isAbsolute(value)) {
        throw new TypeError(`${name} must be an absolute path`);
    }
    return resolve(value);
}

function validateArguments(args) {
    const seen = new Set();
    for (let index = 0; index < args.length; index += 1) {
        const name = args[index];
        if (MODES.has(name)) {
            if (seen.has(name)) {
                throw new TypeError(`Duplicate argument: ${name}`);
            }
            seen.add(name);
            continue;
        }
        if (!VALUES.has(name)) {
            throw new TypeError(`Unknown argument: ${String(name)}`);
        }
        const value = args[index + 1];
        if (!value || value.startsWith('--')) {
            throw new TypeError(`Missing value for ${name}`);
        }
        if (name !== '--provider-artifact' && seen.has(name)) {
            throw new TypeError(`Duplicate argument: ${name}`);
        }
        seen.add(name);
        index += 1;
    }
}

/** Parse one strict review-batch prepare or assemble command. */
export function parseRealismReviewBatchArguments(argv) {
    const args = argv[0] === '--' ? argv.slice(1) : argv;
    validateArguments(args);
    const prepare = args.includes('--prepare');
    const assemble = args.includes('--assemble');
    if (prepare === assemble) {
        throw new TypeError('Choose exactly one of --prepare or --assemble');
    }
    const evidence = absoluteArgument(args, '--evidence');
    if (prepare) {
        const maximumSource = argument(args, '--maximum-fields-per-batch') ?? '50';
        if (!/^(?:[1-9]|[1-9]\d|100)$/u.test(maximumSource)) {
            throw new TypeError('--maximum-fields-per-batch must be an integer from 1 through 100');
        }
        return Object.freeze({
            mode: 'prepare',
            evidence,
            outputDirectory: absoluteArgument(args, '--out-dir'),
            maximumFieldsPerBatch: Number(maximumSource)
        });
    }
    const providerArtifacts = repeatedArguments(args, '--provider-artifact').map((path) => {
        if (!isAbsolute(path)) {
            throw new TypeError('--provider-artifact must be an absolute path');
        }
        return resolve(path);
    });
    if (providerArtifacts.length === 0) {
        throw new TypeError('At least one --provider-artifact is required for assembly');
    }
    return Object.freeze({
        mode: 'assemble',
        pilotRoot: absoluteArgument(args, '--pilot-root'),
        evidence,
        batchManifest: absoluteArgument(args, '--batch-manifest'),
        providerArtifacts: Object.freeze(providerArtifacts),
        output: absoluteArgument(args, '--out')
    });
}

async function readRegularFile(path, label) {
    const details = await lstat(path);
    if (!details.isFile() || details.isSymbolicLink()) {
        throw new TypeError(`${label} must be a regular non-symbolic-link file`);
    }
    return readFile(path, 'utf8');
}

async function requireAbsent(path, label) {
    try {
        await lstat(path);
        throw new TypeError(`${label} already exists`);
    } catch (error) {
        if (error?.code !== 'ENOENT') {
            throw error;
        }
    }
}

async function prepare(options) {
    const evidenceSource = await readRegularFile(options.evidence, 'realism evidence');
    const prepared = prepareRealismReviewBatches(evidenceSource, options.maximumFieldsPerBatch);
    await requireAbsent(options.outputDirectory, 'review batch output directory');
    const parent = dirname(options.outputDirectory);
    await mkdir(parent, { recursive: true });
    const temporaryDirectory = await mkdtemp(join(parent, '.mockgen-realism-review-batches-'));
    try {
        await Promise.all([
            writeFile(join(temporaryDirectory, 'manifest.json'), `${JSON.stringify(prepared.manifest, null, 2)}\n`, {
                flag: 'wx',
                mode: 0o600
            }),
            ...prepared.batches.map(({ filename, source }) =>
                writeFile(join(temporaryDirectory, filename), source, { flag: 'wx', mode: 0o600 })
            )
        ]);
        await rename(temporaryDirectory, options.outputDirectory);
    } catch (error) {
        await rm(temporaryDirectory, { recursive: true, force: true });
        throw error;
    }
    return prepared;
}

async function assemble(options) {
    const promptPath = join(options.pilotRoot, 'training/review/generation-inspection-prompt.md');
    const schemaPath = join(options.pilotRoot, 'training/review/generation-inspection-output.schema.json');
    const [evidenceSource, manifestSource, promptSource, schemaSource, ...artifactSources] = await Promise.all([
        readRegularFile(options.evidence, 'realism evidence'),
        readRegularFile(options.batchManifest, 'review batch manifest'),
        readRegularFile(promptPath, 'inspection prompt'),
        readRegularFile(schemaPath, 'inspection output schema'),
        ...options.providerArtifacts.map((path) => readRegularFile(path, 'provider batch artifact'))
    ]);
    const artifact = assembleRealismProviderArtifact(
        evidenceSource,
        manifestSource,
        promptSource,
        schemaSource,
        artifactSources
    );
    await mkdir(dirname(options.output), { recursive: true });
    await writeFile(options.output, `${JSON.stringify(artifact, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    return artifact;
}

async function main() {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        process.stdout.write(`${usage()}\n`);
        return;
    }
    const options = parseRealismReviewBatchArguments(process.argv.slice(2));
    if (options.mode === 'prepare') {
        const result = await prepare(options);
        process.stdout.write(
            `${JSON.stringify({
                outputDirectory: options.outputDirectory,
                manifest: join(options.outputDirectory, 'manifest.json'),
                reviewedFields: result.manifest.reviewedFields,
                batches: result.manifest.batchCount,
                maximumFieldsPerBatch: result.manifest.maximumFieldsPerBatch
            })}\n`
        );
        return;
    }
    const artifact = await assemble(options);
    process.stdout.write(
        `${JSON.stringify({
            output: options.output,
            provider: artifact.provider,
            requestedModel: artifact.requestedModel,
            reviewedFields: artifact.output.reviews.length,
            batches: artifact.aggregation.batchArtifactFingerprints.length,
            costUsd: artifact.costUsd
        })}\n`
    );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch((error) => {
        process.stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
        process.exitCode = 1;
    });
}
