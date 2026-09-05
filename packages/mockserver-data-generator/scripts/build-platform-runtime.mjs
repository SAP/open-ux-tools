#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { constants, createReadStream } from 'node:fs';
import { copyFile, lstat, mkdir, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAXIMUM_PLATFORM_RUNTIME_BYTES = 64 * 1024 * 1024;
const SUPPORTED_TARGETS = new Set(['darwin-arm64', 'darwin-x64', 'linux-x64', 'win32-x64']);
const IMMUTABLE_URL_SEGMENT = /(?:^|\/)[a-f\d]{40,64}(?:\/|$)/u;
const require = createRequire(import.meta.url);

function httpsUrl(value, label, directory = false) {
    if (typeof value !== 'string' || value.length === 0) {
        throw new TypeError(`${label} must be a non-empty HTTPS URL`);
    }
    let parsed;
    try {
        parsed = new URL(value);
    } catch {
        throw new TypeError(`${label} must be a non-empty HTTPS URL`);
    }
    if (
        parsed.protocol !== 'https:' ||
        parsed.username ||
        parsed.password ||
        parsed.search ||
        parsed.hash ||
        (directory && !parsed.pathname.endsWith('/'))
    ) {
        throw new TypeError(`${label} must be a credential-free immutable HTTPS${directory ? ' directory' : ''} URL`);
    }
    if (!IMMUTABLE_URL_SEGMENT.test(parsed.pathname)) {
        throw new TypeError(`${label} must contain an immutable commit or content-hash path segment`);
    }
    return parsed;
}

function outputDirectoryPath(value) {
    if (typeof value !== 'string' || !isAbsolute(value)) {
        throw new TypeError('outputDirectory must be an absolute path');
    }
    const outputDirectory = resolve(value);
    if (dirname(outputDirectory) === outputDirectory) {
        throw new TypeError('outputDirectory must not be a filesystem root');
    }
    return outputDirectory;
}

async function sourceFiles(root, include) {
    const canonicalRoot = await realpath(root);
    const files = [];
    async function visit(directory) {
        const entries = await readdir(directory, { withFileTypes: true });
        entries.sort((left, right) => left.name.localeCompare(right.name, 'en'));
        for (const entry of entries) {
            const source = join(directory, entry.name);
            if (entry.isSymbolicLink()) {
                throw new Error('runtime source must not contain symbolic links');
            }
            if (entry.isDirectory()) {
                await visit(source);
            } else if (entry.isFile() && include(source)) {
                const canonicalFile = await realpath(source);
                if (!canonicalFile.startsWith(`${canonicalRoot}${sep}`)) {
                    throw new Error('runtime source file resolves outside its package');
                }
                files.push({ source: canonicalFile, relativePath: relative(canonicalRoot, canonicalFile) });
            } else if (!entry.isFile()) {
                throw new Error('runtime source contains an unsupported filesystem entry');
            }
        }
    }
    await visit(canonicalRoot);
    return files;
}

function artifactUrl(baseUrl, artifactPath) {
    const encodedPath = artifactPath.split('/').map(encodeURIComponent).join('/');
    return new URL(encodedPath, baseUrl).href;
}

async function sha256(filePath) {
    const digest = createHash('sha256');
    for await (const chunk of createReadStream(filePath)) {
        digest.update(chunk);
    }
    return digest.digest('hex');
}

async function runtimeSources(platform, architecture) {
    const runtimePackageJsonPath = require.resolve('onnxruntime-node/package.json');
    const runtimeRoot = await realpath(dirname(runtimePackageJsonPath));
    const runtimeRequire = createRequire(runtimePackageJsonPath);
    const commonEntry = runtimeRequire.resolve('onnxruntime-common');
    const commonRoot = await realpath(dirname(dirname(dirname(commonEntry))));
    const [runtimePackage, commonPackage] = await Promise.all([
        readFile(join(runtimeRoot, 'package.json'), 'utf8').then(JSON.parse),
        readFile(join(commonRoot, 'package.json'), 'utf8').then(JSON.parse)
    ]);
    if (
        runtimePackage.name !== 'onnxruntime-node' ||
        typeof runtimePackage.version !== 'string' ||
        !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(runtimePackage.version) ||
        commonPackage.name !== 'onnxruntime-common' ||
        commonPackage.version !== runtimePackage.version
    ) {
        throw new Error('installed ONNX Runtime packages do not have one exact matching version');
    }

    const [runtimeJavaScript, runtimeNative, commonJavaScript] = await Promise.all([
        sourceFiles(join(runtimeRoot, 'dist'), (filePath) => filePath.endsWith('.js')),
        sourceFiles(join(runtimeRoot, 'bin', 'napi-v6', platform, architecture), () => true),
        sourceFiles(
            join(commonRoot, 'dist', 'cjs'),
            (filePath) => filePath.endsWith('.js') || filePath.endsWith(`${sep}package.json`)
        )
    ]);
    return {
        version: runtimePackage.version,
        files: [
            {
                source: join(runtimeRoot, 'package.json'),
                packageName: 'onnxruntime-node',
                relativePath: 'package.json'
            },
            ...runtimeJavaScript.map((file) => ({ ...file, packageName: 'onnxruntime-node', root: 'dist' })),
            ...runtimeNative.map((file) => ({
                ...file,
                packageName: 'onnxruntime-node',
                root: `bin/napi-v6/${platform}/${architecture}`
            })),
            {
                source: join(commonRoot, 'package.json'),
                packageName: 'onnxruntime-common',
                relativePath: 'package.json'
            },
            ...commonJavaScript.map((file) => ({ ...file, packageName: 'onnxruntime-common', root: 'dist/cjs' }))
        ]
    };
}

function destinationPath(target, source) {
    const nestedPath = source.root ? `${source.root}/${source.relativePath.split(sep).join('/')}` : source.relativePath;
    return `runtime/${target}/node_modules/${source.packageName}/${nestedPath}`;
}

/**
 * Stage the current OS/CPU ONNX Runtime closure and emit a manifest fragment.
 *
 * @param {object} options build options
 * @param {string} options.outputDirectory new absolute output directory
 * @param {string} options.artifactBaseUrl immutable hosted base URL for the staged files
 * @param {string} options.sbomUrl immutable hosted SBOM URL for this runtime
 * @returns {Promise<object>} privacy-safe build report and runtime artifact descriptor
 */
export async function buildPlatformRuntimeArtifact(options) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
        throw new TypeError('platform runtime build options must be an object');
    }
    const outputDirectory = outputDirectoryPath(options.outputDirectory);
    const baseUrl = httpsUrl(options.artifactBaseUrl, 'artifactBaseUrl', true);
    const sbomUrl = httpsUrl(options.sbomUrl, 'sbomUrl');
    const target = `${process.platform}-${process.arch}`;
    if (!SUPPORTED_TARGETS.has(target)) {
        throw new Error(`platform runtime build is not supported for ${target}`);
    }
    const filesRoot = join(outputDirectory, 'files');
    let created = false;
    try {
        try {
            await mkdir(outputDirectory);
        } catch (error) {
            if (error?.code === 'EEXIST') {
                throw new Error('outputDirectory must not already exist');
            }
            throw error;
        }
        created = true;
        await mkdir(filesRoot);
        const runtime = await runtimeSources(process.platform, process.arch);
        const copied = [];
        for (const source of runtime.files) {
            const path = destinationPath(target, source);
            const destination = join(filesRoot, ...path.split('/'));
            await mkdir(dirname(destination), { recursive: true });
            await copyFile(source.source, destination, constants.COPYFILE_EXCL);
            const details = await lstat(destination);
            if (!details.isFile() || details.isSymbolicLink()) {
                throw new Error('staged runtime contains a non-regular file');
            }
            copied.push({ path, bytes: details.size, sha256: await sha256(destination) });
        }
        copied.sort((left, right) => left.path.localeCompare(right.path, 'en'));
        const entry = `runtime/${target}/node_modules/onnxruntime-node/dist/index.js`;
        if (!copied.some((file) => file.path === entry)) {
            throw new Error('staged runtime has no ONNX Runtime entry');
        }
        const bytes = copied.reduce((total, file) => total + file.bytes, 0);
        if (bytes > MAXIMUM_PLATFORM_RUNTIME_BYTES) {
            throw new Error('staged platform runtime exceeds 64 MiB');
        }
        const files = copied.map((file, index) => ({
            role: file.path === entry ? 'entry' : `runtime-file-${String(index + 1).padStart(3, '0')}`,
            ...file,
            url: artifactUrl(baseUrl, file.path)
        }));
        const fingerprint = createHash('sha256')
            .update(
                JSON.stringify({
                    package: 'onnxruntime-node',
                    version: runtime.version,
                    platform: process.platform,
                    architecture: process.arch,
                    files: files.map(({ path, bytes: fileBytes, sha256: checksum }) => ({
                        path,
                        bytes: fileBytes,
                        sha256: checksum
                    }))
                })
            )
            .digest('hex');
        const artifact = {
            id: `onnxruntime-node-${target}`,
            package: 'onnxruntime-node',
            version: runtime.version,
            platform: process.platform,
            architecture: process.arch,
            fingerprint,
            entry,
            files,
            license: {
                name: 'MIT',
                url: `https://github.com/microsoft/onnxruntime/blob/v${runtime.version}/LICENSE`
            },
            sourceUrl: `https://github.com/microsoft/onnxruntime/tree/v${runtime.version}`,
            sbomUrl: sbomUrl.href
        };
        await writeFile(join(outputDirectory, 'runtime-artifact.json'), `${JSON.stringify(artifact, null, 2)}\n`, {
            flag: 'wx'
        });
        return { outputDirectory, bytes, files: files.length, artifact };
    } catch (error) {
        if (created) {
            await rm(outputDirectory, { recursive: true, force: true });
        }
        throw error;
    }
}

function option(argv, name) {
    const positions = argv.flatMap((value, index) => (value === name ? [index] : []));
    if (positions.length !== 1 || positions[0] === argv.length - 1) {
        throw new Error(`exactly one ${name} value is required`);
    }
    return argv[positions[0] + 1];
}

function parseArguments(argv) {
    const known = new Set(['--out', '--artifact-base-url', '--sbom-url']);
    for (let index = 0; index < argv.length; index += 2) {
        if (!known.has(argv[index]) || index + 1 >= argv.length) {
            throw new Error(
                'Usage: build-platform-runtime.mjs --out <absolute-directory> --artifact-base-url <immutable-https-directory> --sbom-url <immutable-https-url>'
            );
        }
    }
    return {
        outputDirectory: option(argv, '--out'),
        artifactBaseUrl: option(argv, '--artifact-base-url'),
        sbomUrl: option(argv, '--sbom-url')
    };
}

if (process.argv[1] && (await realpath(fileURLToPath(import.meta.url))) === (await realpath(process.argv[1]))) {
    try {
        const report = await buildPlatformRuntimeArtifact(parseArguments(process.argv.slice(2)));
        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } catch (error) {
        process.stderr.write(
            `MockGen platform-runtime build failed: ${error instanceof Error ? error.message : String(error)}\n`
        );
        process.exitCode = 1;
    }
}
