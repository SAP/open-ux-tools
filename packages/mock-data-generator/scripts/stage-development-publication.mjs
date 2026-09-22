#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { stagedPackageManifest } from './staged-package-manifest.mjs';

async function distFingerprint(root) {
    const digest = createHash('sha256');
    async function visit(directory) {
        for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
            a.name.localeCompare(b.name, 'en')
        )) {
            const path = join(directory, entry.name);
            if (entry.isDirectory() && !entry.isSymbolicLink()) {
                await visit(path);
            } else if (entry.isFile() && !entry.isSymbolicLink()) {
                const fileHash = createHash('sha256')
                    .update(await readFile(path))
                    .digest('hex');
                digest.update(`${relative(root, path).split(sep).join('/')}\0${fileHash}\n`);
            } else {
                throw new TypeError('Staged MockGen distribution contains a link or special file');
            }
        }
    }
    await visit(root);
    return digest.digest('hex');
}

const [versionFlag, version, outputFlag, outputValue] = process.argv.slice(2);
if (
    versionFlag !== '--version' ||
    !/^0\.\d+\.\d+-dev\.[a-z0-9.-]+$/u.test(version ?? '') ||
    outputFlag !== '--out' ||
    !outputValue
) {
    throw new TypeError('Usage: stage-development-publication --version 0.1.0-dev.<build> --out <directory>');
}

const outputDirectory = resolve(outputValue);
if (!isAbsolute(outputDirectory)) {
    throw new TypeError('Development publication output must be an absolute directory');
}
// Staging is a publication boundary: the comparison v2 head must never become a new dev version.
execFileSync(process.execPath, ['scripts/check-package.mjs', '--release'], {
    cwd: resolve(import.meta.dirname, '..'),
    stdio: 'inherit'
});
await mkdir(outputDirectory, { recursive: true });
const outputArchive = join(outputDirectory, `unseen-mock-data-generator-${version}.tgz`);
try {
    await access(outputArchive);
    throw new Error(`Development version ${version} has already been staged; choose a new immutable version`);
} catch (error) {
    if (error.code !== 'ENOENT') {
        throw error;
    }
}
const temporary = await mkdtemp(join(tmpdir(), 'mockgen-dev-publication-'));
try {
    const sourceArchive = execFileSync('pnpm', ['pack', '--pack-destination', temporary], {
        cwd: resolve(import.meta.dirname, '..'),
        encoding: 'utf8'
    })
        .trim()
        .split('\n')
        .at(-1);
    if (!sourceArchive) {
        throw new Error('Could not pack canonical MockGen package');
    }
    execFileSync('tar', ['-xzf', sourceArchive, '-C', temporary]);
    const stagingRoot = join(temporary, 'package');
    const packagePath = join(stagingRoot, 'package.json');
    const staged = stagedPackageManifest(JSON.parse(await readFile(packagePath, 'utf8')), version);
    await writeFile(packagePath, `${JSON.stringify(staged, null, 2)}\n`);
    const distSha256 = await distFingerprint(join(stagingRoot, 'dist'));
    const archive = execFileSync('pnpm', ['pack', '--pack-destination', outputDirectory], {
        cwd: stagingRoot,
        encoding: 'utf8'
    })
        .trim()
        .split('\n')
        .at(-1);
    if (!archive) {
        throw new Error('Could not pack temporary MockGen publication');
    }
    const bytes = await readFile(archive);
    const packageSize = (await stat(archive)).size;
    process.stdout.write(
        `${JSON.stringify({
            sourceIdentity: '@sap-ux/mock-data-generator',
            packedIdentity: '@unseen/mock-data-generator',
            version,
            archive,
            bytes: packageSize,
            integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}`,
            distSha256,
            publishable: false,
            reason: 'Artifact redistribution and release approval are not yet recorded'
        })}\n`
    );
} finally {
    await rm(temporary, { recursive: true, force: true });
}
