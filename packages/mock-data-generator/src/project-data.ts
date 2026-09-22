import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import type { MockDataServiceRequest } from './types.js';
import {
    createMockDataGenerator,
    type StandaloneGenerationOptions,
    type StandaloneGenerationResult
} from './standalone.js';

export interface GenerateProjectDataInput {
    projectRoot: string;
    /** Directory relative to the application root, normally webapp/localService/mockdata. */
    dataDirectory: string;
    request: MockDataServiceRequest;
    options?: StandaloneGenerationOptions;
}

export interface GeneratedProjectData {
    generation: StandaloneGenerationResult;
    files: ReadonlyArray<string>;
}

function inside(root: string, candidate: string): boolean {
    const path = relative(root, candidate);
    return path === '' || (!isAbsolute(path) && path !== '..' && !path.startsWith(`..${sep}`));
}

function safeDirectory(path: string): ReadonlyArray<string> {
    const parts = path.replaceAll('\\', '/').split('/');
    if (isAbsolute(path) || parts.some((part) => !part || part === '.' || part === '..')) {
        throw new TypeError('MockGen data directory must be a safe application-relative path');
    }
    return parts;
}

async function existingDirectory(path: string): Promise<boolean> {
    try {
        const details = await lstat(path);
        if (!details.isDirectory() || details.isSymbolicLink()) {
            throw new TypeError('MockGen data directory must be a regular directory');
        }
        return true;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return false;
        }
        throw error;
    }
}

async function assertSafeContents(path: string): Promise<void> {
    for (const entry of await readdir(path, { withFileTypes: true })) {
        if (entry.isSymbolicLink() || (!entry.isFile() && !entry.isDirectory())) {
            throw new TypeError('MockGen refuses a mockdata directory containing links or special files');
        }
        if (entry.isDirectory()) {
            await assertSafeContents(join(path, entry.name));
        }
    }
}

async function assertSafeExistingParents(root: string, parts: ReadonlyArray<string>): Promise<void> {
    let current = root;
    for (const part of parts) {
        current = join(current, part);
        let details;
        try {
            details = await lstat(current);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return;
            }
            throw error;
        }
        if (!details.isDirectory() || details.isSymbolicLink() || !inside(root, await realpath(current))) {
            throw new TypeError('MockGen data directory contains an unsafe parent directory or link');
        }
    }
}

async function directoryFingerprint(path: string): Promise<string> {
    const digest = createHash('sha256');
    const visit = async (directory: string): Promise<void> => {
        for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
            a.name.localeCompare(b.name)
        )) {
            const target = join(directory, entry.name);
            const relativePath = relative(path, target).split(sep).join('/');
            if (entry.isDirectory() && !entry.isSymbolicLink()) {
                digest.update(`directory:${relativePath}\n`);
                await visit(target);
            } else if (entry.isFile() && !entry.isSymbolicLink()) {
                const fileDigest = createHash('sha256');
                for await (const chunk of createReadStream(target)) {
                    fileDigest.update(chunk as Buffer);
                }
                digest.update(`file:${relativePath}:${fileDigest.digest('hex')}\n`);
            } else {
                throw new TypeError('MockGen refuses a mockdata directory containing links or special files');
            }
        }
    };
    await visit(path);
    return digest.digest('hex');
}

async function ensureSafeParent(root: string, parts: ReadonlyArray<string>): Promise<string> {
    let current = root;
    for (const part of parts) {
        current = join(current, part);
        await mkdir(current).catch((error: NodeJS.ErrnoException) => {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        });
        const details = await lstat(current);
        if (!details.isDirectory() || details.isSymbolicLink() || !inside(root, await realpath(current))) {
            throw new TypeError('MockGen data directory contains an unsafe parent directory or link');
        }
    }
    return current;
}

interface ProjectJournal {
    formatVersion: 1;
    targetName: string;
    phase: 'prepared' | 'backed-up' | 'installed';
    stagedSha256: string;
}

async function writeProjectJournal(path: string, journal: ProjectJournal): Promise<void> {
    await writeFile(`${path}.next`, `${JSON.stringify(journal)}\n`);
    await rename(`${path}.next`, path);
}

async function recoverProjectTransactions(parent: string, directory: string, targetName: string): Promise<void> {
    for (const entry of await readdir(parent, { withFileTypes: true })) {
        if (!entry.name.startsWith('.mockgen-project-') || !entry.isDirectory() || entry.isSymbolicLink()) {
            continue;
        }
        const transactionRoot = join(parent, entry.name);
        let journalText: string;
        try {
            journalText = await readFile(join(transactionRoot, 'journal.json'), 'utf8');
        } catch (error) {
            if (
                (error as NodeJS.ErrnoException).code === 'ENOENT' &&
                !(await existingDirectory(join(transactionRoot, 'backup')))
            ) {
                await rm(transactionRoot, { recursive: true, force: true });
                continue;
            }
            throw error;
        }
        const value = JSON.parse(journalText) as unknown;
        if (
            !value ||
            typeof value !== 'object' ||
            !('formatVersion' in value) ||
            value.formatVersion !== 1 ||
            !('targetName' in value) ||
            typeof value.targetName !== 'string' ||
            !('phase' in value) ||
            !['prepared', 'backed-up', 'installed'].includes(String(value.phase)) ||
            !('stagedSha256' in value) ||
            typeof value.stagedSha256 !== 'string' ||
            !/^[a-f0-9]{64}$/u.test(value.stagedSha256)
        ) {
            throw new Error(`MockGen project transaction requires manual recovery: ${transactionRoot}`);
        }
        const journal = value as ProjectJournal;
        if (journal.targetName !== targetName) {
            continue;
        }
        const backup = join(transactionRoot, 'backup');
        const backupExists = await existingDirectory(backup);
        if (journal.phase !== 'installed' && backupExists) {
            if (await existingDirectory(directory)) {
                if ((await directoryFingerprint(directory)) !== journal.stagedSha256) {
                    throw new Error(`MockGen project data changed after interruption: ${directory}`);
                }
                await rename(directory, join(transactionRoot, 'interrupted-output'));
            }
            await rename(backup, directory);
        } else if (journal.phase === 'installed' && !(await existingDirectory(directory))) {
            throw new Error(`MockGen completed project data is missing: ${directory}`);
        }
        await rm(transactionRoot, { recursive: true, force: true });
    }
}

/**
 * Generate the selected service and replace its project JSON only after independent validation.
 *
 * @param input
 */
export async function generateProjectData(input: GenerateProjectDataInput): Promise<GeneratedProjectData> {
    const parts = safeDirectory(input.dataDirectory);
    const root = await realpath(input.projectRoot);
    const directory = resolve(root, ...parts);
    if (!inside(root, directory)) {
        throw new TypeError('MockGen data directory escapes the application');
    }
    const targetNames = input.request.targets.map(({ name }) => name);
    if (
        new Set(targetNames).size !== targetNames.length ||
        targetNames.some((name) => !/^[A-Za-z_][A-Za-z0-9_-]*$/u.test(name))
    ) {
        throw new TypeError('MockGen project targets require unique safe resource names');
    }
    await assertSafeExistingParents(root, parts.slice(0, -1));
    const existingParent = resolve(root, ...parts.slice(0, -1));
    if (await existingDirectory(existingParent)) {
        await recoverProjectTransactions(existingParent, directory, parts.at(-1) ?? '');
    }
    const originallyPresent = await existingDirectory(directory);
    const initialFingerprint = originallyPresent ? await directoryFingerprint(directory) : null;
    const generator = await createMockDataGenerator({ executionMode: 'start-mock' });
    let generation: StandaloneGenerationResult;
    try {
        generation = await generator.generateService(input.request, input.options);
    } finally {
        await generator.dispose();
    }
    if (!generation.validation.passed) {
        throw new TypeError('MockGen rejected project data with failed semantic validation');
    }
    input.request.signal?.throwIfAborted();

    const parent = await ensureSafeParent(root, parts.slice(0, -1));
    if ((await existingDirectory(directory)) !== originallyPresent) {
        throw new Error('MockGen project data directory changed during generation');
    }
    if (originallyPresent) {
        if (!inside(root, await realpath(directory))) {
            throw new TypeError('MockGen data directory resolves outside the application');
        }
        await assertSafeContents(directory);
        if ((await directoryFingerprint(directory)) !== initialFingerprint) {
            throw new Error('MockGen project data changed during generation');
        }
    }

    const transactionRoot = await mkdtemp(join(parent, '.mockgen-project-'));
    const staged = join(transactionRoot, 'staged');
    const backup = join(transactionRoot, 'backup');
    const journalPath = join(transactionRoot, 'journal.json');
    let backedUp = false;
    let installed = false;
    let rollbackFailed = false;
    try {
        if (originallyPresent) {
            await cp(directory, staged, { recursive: true, errorOnExist: true, force: false });
        } else {
            await mkdir(staged);
        }
        const files: string[] = [];
        for (const name of targetNames) {
            const rows = generation.resources[name];
            if (!rows) {
                // The schema cannot describe rows for a skipped entity set; any existing file stays untouched.
                if (
                    generation.diagnostics.some(
                        ({ code, target }) => code === 'SCHEMA_ENTITY_SET_SKIPPED' && target === name
                    )
                ) {
                    continue;
                }
                throw new TypeError(`MockGen did not generate resource ${name}`);
            }
            const filename = `${name}.json`;
            await writeFile(join(staged, filename), `${JSON.stringify(rows, null, 2)}\n`, { flag: 'w' });
            files.push(`${parts.join('/')}/${filename}`);
        }
        input.request.signal?.throwIfAborted();
        const journal: ProjectJournal = {
            formatVersion: 1,
            targetName: parts.at(-1) ?? '',
            phase: 'prepared',
            stagedSha256: await directoryFingerprint(staged)
        };
        await writeProjectJournal(journalPath, journal);
        if (
            (await existingDirectory(directory)) !== originallyPresent ||
            (originallyPresent && (await directoryFingerprint(directory)) !== initialFingerprint)
        ) {
            throw new Error('MockGen project data changed before replacement');
        }
        if (originallyPresent) {
            await rename(directory, backup);
            backedUp = true;
            journal.phase = 'backed-up';
            await writeProjectJournal(journalPath, journal);
        }
        input.request.signal?.throwIfAborted();
        await rename(staged, directory);
        installed = true;
        journal.phase = 'installed';
        await writeProjectJournal(journalPath, journal);
        input.request.signal?.throwIfAborted();
        return { generation, files: Object.freeze(files) };
    } catch (error) {
        try {
            if (installed) {
                await rename(directory, staged);
            }
            if (backedUp) {
                await rename(backup, directory);
            }
        } catch {
            rollbackFailed = true;
        }
        if (rollbackFailed) {
            throw new AggregateError([error], `MockGen rollback failed; originals are retained at ${backup}`);
        }
        throw error;
    } finally {
        if (!rollbackFailed) {
            await rm(transactionRoot, { recursive: true, force: true });
        }
    }
}
