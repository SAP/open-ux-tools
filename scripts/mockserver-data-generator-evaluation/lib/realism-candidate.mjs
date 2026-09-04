import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';

const DEFAULT_SEED = 113;
const LEARNED_DEGRADATION_CODES = new Set([
    'CLASSIFIER_INFERENCE_FAILED',
    'SFT_INFERENCE_FAILED',
    'SFT_INFERENCE_TIMEOUT',
    'SFT_SKIPPED_AFTER_FAILURE'
]);
const MODE_ARGUMENTS = new Set(['--export', '--compile']);
const VALUE_ARGUMENTS = new Set([
    '--pilot-root',
    '--selection-manifest',
    '--model-manifest',
    '--model-cache',
    '--out',
    '--campaign-manifest-out',
    '--seed',
    '--evidence',
    '--provider-artifact'
]);

function argument(args, name) {
    const index = args.indexOf(name);
    return index < 0 ? undefined : args[index + 1];
}

function repeatedArguments(args, name) {
    return args.flatMap((value, index) => (value === name && args[index + 1] ? [args[index + 1]] : []));
}

function validateArguments(args) {
    const seen = new Set();
    for (let index = 0; index < args.length; index += 1) {
        const name = args[index];
        if (MODE_ARGUMENTS.has(name)) {
            if (seen.has(name)) {
                throw new TypeError(`Duplicate argument: ${name}`);
            }
            seen.add(name);
            continue;
        }
        if (!VALUE_ARGUMENTS.has(name)) {
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

function absoluteArgument(args, name) {
    const value = argument(args, name);
    if (!value || !isAbsolute(value)) {
        throw new TypeError(`${name} must be an absolute path`);
    }
    return resolve(value);
}

function sha256(value) {
    return createHash('sha256').update(value).digest('hex');
}

/** Bind the complete compiled package tree that can be reached by the exported entry point. */
export async function createCompiledArtifactBinding(root) {
    const artifactRoot = resolve(root);
    const rootDetails = await lstat(artifactRoot);
    if (!rootDetails.isDirectory() || rootDetails.isSymbolicLink()) {
        throw new TypeError('Compiled artifact root must be a regular non-symbolic-link directory');
    }
    const files = [];
    async function visit(directory) {
        const entries = await readdir(directory, { withFileTypes: true });
        for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
            const filePath = resolve(directory, entry.name);
            const details = await lstat(filePath);
            if (details.isSymbolicLink() || (!details.isFile() && !details.isDirectory())) {
                throw new TypeError('Compiled artifacts may contain only regular files and directories');
            }
            if (details.isDirectory()) {
                await visit(filePath);
                continue;
            }
            const content = await readFile(filePath);
            files.push(
                Object.freeze({
                    path: relative(artifactRoot, filePath).split(sep).join('/'),
                    bytes: content.byteLength,
                    sha256: sha256(content)
                })
            );
        }
    }
    await visit(artifactRoot);
    if (files.length === 0) {
        throw new TypeError('Compiled artifact root must contain at least one file');
    }
    const frozenFiles = Object.freeze(files);
    return Object.freeze({
        id: 'mockserver-data-generator-dist',
        root: 'dist',
        files: frozenFiles,
        bytes: files.reduce((total, file) => total + file.bytes, 0),
        fingerprint: sha256(JSON.stringify(frozenFiles))
    });
}

async function requireAbsent(filePath, label) {
    try {
        await lstat(filePath);
        throw new TypeError(`${label} already exists`);
    } catch (error) {
        if (error?.code !== 'ENOENT') {
            throw error;
        }
    }
}

/** Publish evidence and campaign together without overwriting or leaving a one-sided pair. */
export async function writeExclusiveFilePair(first, second) {
    const firstPath = resolve(first.path);
    const secondPath = resolve(second.path);
    if (firstPath === secondPath) {
        throw new TypeError('Evidence and campaign outputs must be distinct files');
    }
    await Promise.all([
        mkdir(dirname(firstPath), { recursive: true }),
        mkdir(dirname(secondPath), { recursive: true })
    ]);
    await Promise.all([requireAbsent(firstPath, first.label), requireAbsent(secondPath, second.label)]);
    await writeFile(firstPath, first.content, { flag: 'wx', mode: 0o600 });
    try {
        await writeFile(secondPath, second.content, { flag: 'wx', mode: 0o600 });
    } catch (error) {
        await unlink(firstPath).catch(() => undefined);
        throw error;
    }
}

async function readRegularFile(filePath, label) {
    const details = await lstat(filePath);
    if (!details.isFile() || details.isSymbolicLink()) {
        throw new TypeError(`${label} must be a regular non-symbolic-link file`);
    }
    return readFile(filePath, 'utf8');
}

function requiredComponent(manifest, kind) {
    const component = manifest.components.find((candidate) => candidate.kind === kind);
    if (!component) {
        throw new TypeError(`Realism export requires a ${kind} model component`);
    }
    return component;
}

function requiredCachedRole(cache, componentId, role) {
    const filePath = cache.files.get(componentId)?.get(role);
    if (!filePath) {
        throw new TypeError(`Verified model component ${componentId} is missing the ${role} role`);
    }
    return filePath;
}

function componentRecord(component) {
    return Object.freeze({
        id: component.id,
        version: component.version,
        fingerprint: component.fingerprint,
        runtime: Object.freeze({ ...component.runtime })
    });
}

/** Require the immutable model inputs used by realism export. */
export function parseProductionModelOptions(args) {
    return Object.freeze({
        modelManifest: absoluteArgument(args, '--model-manifest'),
        modelCache: absoluteArgument(args, '--model-cache')
    });
}

/** Parse one unambiguous export or compile command into normalized absolute inputs. */
export function parseRealismCampaignArguments(argv) {
    const args = argv[0] === '--' ? argv.slice(1) : argv;
    validateArguments(args);
    const exportMode = args.includes('--export');
    const compileMode = args.includes('--compile');
    if (exportMode === compileMode) {
        throw new TypeError('Choose exactly one of --export or --compile');
    }
    const pilotRoot = absoluteArgument(args, '--pilot-root');
    const output = absoluteArgument(args, '--out');
    if (exportMode) {
        const seedSource = argument(args, '--seed') ?? String(DEFAULT_SEED);
        if (!/^-?(?:0|[1-9]\d*)$/u.test(seedSource)) {
            throw new TypeError('--seed must be a safe integer');
        }
        const seed = Number(seedSource);
        if (!Number.isSafeInteger(seed)) {
            throw new TypeError('--seed must be a safe integer');
        }
        const model = parseProductionModelOptions(args);
        return Object.freeze({
            mode: 'export',
            pilotRoot,
            selectionManifest: absoluteArgument(args, '--selection-manifest'),
            ...model,
            output,
            manifest: absoluteArgument(args, '--campaign-manifest-out'),
            seed
        });
    }
    const providers = repeatedArguments(args, '--provider-artifact').map((provider) => {
        if (!isAbsolute(provider)) {
            throw new TypeError('--provider-artifact must be an absolute path');
        }
        return resolve(provider);
    });
    if (providers.length !== 2) {
        throw new TypeError('Exactly two --provider-artifact values are required for compile');
    }
    return Object.freeze({
        mode: 'compile',
        pilotRoot,
        evidence: absoluteArgument(args, '--evidence'),
        providers: Object.freeze(providers),
        output
    });
}

/** Create a portable binding for the exact manifest and verified artifacts used by a realism campaign. */
export async function createVerifiedModelBinding({ manifestPath, manifestSource, manifest, cache }) {
    if (!cache.ready) {
        throw new TypeError('Realism export requires a complete checksum-verified model cache');
    }
    const classifier = requiredComponent(manifest, 'classifier');
    const sft = requiredComponent(manifest, 'sft');
    const generationArtifact = sft.files.find(({ role }) => role === 'generation-config');
    if (!generationArtifact) {
        throw new TypeError(`Verified model component ${sft.id} is missing the generation-config role`);
    }
    const generationConfigSource = await readRegularFile(
        requiredCachedRole(cache, sft.id, 'generation-config'),
        'SFT generation config'
    );
    if (
        Buffer.byteLength(generationConfigSource) !== generationArtifact.bytes ||
        sha256(generationConfigSource) !== generationArtifact.sha256
    ) {
        throw new TypeError('SFT generation config does not match the verified model manifest');
    }
    const artifacts = [classifier, sft].flatMap((component) =>
        component.files.map((file) =>
            Object.freeze({
                componentId: component.id,
                kind: component.kind,
                role: file.role,
                path: file.path,
                bytes: file.bytes,
                sha256: file.sha256
            })
        )
    );
    return Object.freeze({
        manifest: Object.freeze({
            filename: basename(manifestPath),
            bytes: Buffer.byteLength(manifestSource),
            sha256: sha256(manifestSource),
            bundleId: manifest.bundleId,
            revision: manifest.revision,
            lifecycle: manifest.lifecycle
        }),
        components: Object.freeze({
            classifier: componentRecord(classifier),
            sft: componentRecord(sft)
        }),
        artifacts: Object.freeze(artifacts),
        generationConfig: Object.freeze({
            bytes: Buffer.byteLength(generationConfigSource),
            sha256: sha256(generationConfigSource),
            configuration: Object.freeze(JSON.parse(generationConfigSource))
        })
    });
}

/** Refuse to label a packet as learned-production evidence when either learned tier degraded. */
export function assertCompleteLearnedRuntime(learned) {
    if (!learned.runtime?.classifier || !learned.runtime?.sft) {
        throw new TypeError('Realism export requires both classifier and SFT runtimes');
    }
    if (!Array.isArray(learned.diagnostics) || learned.diagnostics.length > 0) {
        throw new TypeError('Realism export requires learned runtimes without degradation diagnostics');
    }
}

/** Refuse to seal a fallback or mixed-model result as learned-production evidence. */
export function assertCompleteLearnedGeneration(result, binding) {
    if (
        result?.capabilities?.mode !== 'hybrid' ||
        result.capabilities.classifier !== 'ready' ||
        result.capabilities.sft !== 'ready'
    ) {
        const capabilities = result?.capabilities ?? {};
        const diagnosticDetails = Array.isArray(result?.diagnostics)
            ? result.diagnostics.map(({ code, message }) => `${String(code)}:${String(message)}`).join(' | ')
            : 'invalid-diagnostics';
        throw new TypeError(
            `Realism export requires hybrid-ready capabilities after every generation ` +
                `(mode=${String(capabilities.mode)}, classifier=${String(capabilities.classifier)}, ` +
                `sft=${String(capabilities.sft)}, diagnostics=${diagnosticDetails})`
        );
    }
    if (
        !Array.isArray(result.diagnostics) ||
        result.diagnostics.some((diagnostic) => LEARNED_DEGRADATION_CODES.has(diagnostic?.code))
    ) {
        throw new TypeError('Realism export stopped because learned inference degraded');
    }
    const statistics = result?.statistics?.sft;
    if (
        !statistics ||
        !Number.isSafeInteger(statistics.attempts) ||
        !Number.isSafeInteger(statistics.parsedResponses) ||
        !Number.isSafeInteger(statistics.eligibleSlots) ||
        !Number.isSafeInteger(statistics.acceptedSlots) ||
        !Array.isArray(statistics.assignments)
    ) {
        throw new TypeError('Realism export requires SFT assignment and contribution statistics');
    }
    const classifier = binding?.components?.classifier?.fingerprint;
    const sft = binding?.components?.sft?.fingerprint;
    if (
        typeof classifier !== 'string' ||
        typeof sft !== 'string' ||
        result?.fingerprints?.classifier !== classifier ||
        result?.fingerprints?.sft !== sft
    ) {
        throw new TypeError('Realism export result does not bind the verified model fingerprints');
    }
}

/** Parse, verify, bind, and load the exact production candidate used for realism generation. */
export async function loadVerifiedProductionCandidate({ generator, manifestPath, cacheRoot }) {
    const manifestSource = await readRegularFile(manifestPath, 'model manifest');
    const manifest = generator.parseModelManifest(JSON.parse(manifestSource));
    const cache = await generator.verifyModelCache(cacheRoot, manifest);
    const binding = await createVerifiedModelBinding({ manifestPath, manifestSource, manifest, cache });
    const learned = await generator.createLearnedRuntime(manifest, cache);
    try {
        assertCompleteLearnedRuntime(learned);
    } catch (error) {
        await Promise.resolve(learned.dispose?.()).catch(() => undefined);
        throw error;
    }
    return Object.freeze({ manifest, binding, learned });
}
