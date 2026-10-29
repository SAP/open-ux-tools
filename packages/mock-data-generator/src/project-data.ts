import { createHash, randomBytes } from 'node:crypto';
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { withProjectLock } from './project-lock.js';
import type { MockDataServiceRequest } from './types.js';
import {
    createMockDataGenerator,
    type StandaloneGenerationOptions,
    type StandaloneGenerationResult
} from './standalone.js';
import { compareCodePoints } from './ordering.js';
import { errnoCode, isPathInside, isRecord, isSha256Hex } from './guards.js';
import { sha256File } from './hash.js';
import { MOCKGEN_ERROR_CODE, MockGenError } from './errors.js';
import { t } from './i18n.js';

export interface GenerateProjectDataInput {
    projectRoot: string;
    /** Directory relative to the application root, normally webapp/localService/mockdata. */
    dataDirectory: string;
    request: MockDataServiceRequest;
    options?: StandaloneGenerationOptions;
    /** Absolute resource root of a host that relocates the shipped resources; see `CreateMockDataGeneratorOptions`. */
    resourceRoot?: string;
}

export interface GeneratedProjectData {
    generation: StandaloneGenerationResult;
    files: ReadonlyArray<string>;
}

function safeDirectory(path: string): ReadonlyArray<string> {
    const parts = path.replaceAll('\\', '/').split('/');
    if (isAbsolute(path) || parts.some((part) => !part || part === '.' || part === '..')) {
        throw new MockGenError(MOCKGEN_ERROR_CODE.PROJECT_PATH_UNSAFE, t('projectData.pathUnsafe'));
    }
    return parts;
}

async function existingDirectory(path: string): Promise<boolean> {
    try {
        const details = await lstat(path);
        if (!details.isDirectory() || details.isSymbolicLink()) {
            throw new MockGenError(MOCKGEN_ERROR_CODE.PROJECT_PATH_UNSAFE, t('projectData.notRegularDirectory'));
        }
        return true;
    } catch (error) {
        if (errnoCode(error) === 'ENOENT') {
            return false;
        }
        throw error;
    }
}

async function assertSafeContents(path: string): Promise<void> {
    for (const entry of await readdir(path, { withFileTypes: true })) {
        if (entry.isSymbolicLink() || (!entry.isFile() && !entry.isDirectory())) {
            throw new MockGenError(MOCKGEN_ERROR_CODE.PROJECT_PATH_UNSAFE, t('projectData.linksOrSpecialFiles'));
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
            if (errnoCode(error) === 'ENOENT') {
                return;
            }
            throw error;
        }
        if (!details.isDirectory() || details.isSymbolicLink() || !isPathInside(root, await realpath(current))) {
            throw new MockGenError(MOCKGEN_ERROR_CODE.PROJECT_PATH_UNSAFE, t('projectData.unsafeParent'));
        }
    }
}

async function directoryFingerprint(path: string): Promise<string> {
    const digest = createHash('sha256');
    const visit = async (directory: string): Promise<void> => {
        for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
            compareCodePoints(a.name, b.name)
        )) {
            const target = join(directory, entry.name);
            const relativePath = relative(path, target).split(sep).join('/');
            if (entry.isDirectory() && !entry.isSymbolicLink()) {
                digest.update(`directory:${relativePath}\n`);
                await visit(target);
            } else if (entry.isFile() && !entry.isSymbolicLink()) {
                digest.update(`file:${relativePath}:${await sha256File(target)}\n`);
            } else {
                throw new MockGenError(MOCKGEN_ERROR_CODE.PROJECT_PATH_UNSAFE, t('projectData.linksOrSpecialFiles'));
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
        if (!details.isDirectory() || details.isSymbolicLink() || !isPathInside(root, await realpath(current))) {
            throw new MockGenError(MOCKGEN_ERROR_CODE.PROJECT_PATH_UNSAFE, t('projectData.unsafeParent'));
        }
    }
    return current;
}

const TRANSACTION_PREFIX = '.mockgen-project-';
const REMOVED_TRANSACTION_PREFIX = '.mockgen-trash-';
const JOURNAL_PHASES: ReadonlyArray<string> = ['staging', 'prepared', 'backed-up', 'installed'];

/**
 * The record of a project data transaction, written as soon as its directory exists. `staging`: files are
 * being written and the data directory is untouched. `prepared`: the staged files are complete.
 * `backed-up`: the data directory moved to the backup. `installed`: the staged files are the data directory.
 */
interface ProjectJournal {
    formatVersion: 1;
    targetName: string;
    phase: 'staging' | 'prepared' | 'backed-up' | 'installed';
    /** Fingerprint of the staged files; set from `prepared` on. */
    stagedSha256?: string;
}

/**
 * Whether a parsed journal has the expected shape for its phase.
 *
 * @param value parsed journal
 * @returns whether it is a project journal
 */
function isProjectJournal(value: unknown): value is ProjectJournal {
    if (!isRecord(value)) {
        return false;
    }
    const journal = value;
    return (
        journal.formatVersion === 1 &&
        typeof journal.targetName === 'string' &&
        JOURNAL_PHASES.includes(String(journal.phase)) &&
        (journal.phase === 'staging' ? journal.stagedSha256 === undefined : isSha256Hex(journal.stagedSha256))
    );
}

async function writeProjectJournal(path: string, journal: ProjectJournal): Promise<void> {
    await writeFile(`${path}.next`, `${JSON.stringify(journal)}\n`);
    await rename(`${path}.next`, path);
}

/**
 * Remove a transaction directory. It is first renamed out of the transaction namespace, so a removal that
 * stops half-way never leaves something that looks like an interrupted transaction.
 *
 * @param parent directory that holds the transaction
 * @param transactionRoot the transaction directory
 */
async function removeTransaction(parent: string, transactionRoot: string): Promise<void> {
    const removed = join(parent, `${REMOVED_TRANSACTION_PREFIX}${randomBytes(6).toString('hex')}`);
    try {
        await rename(transactionRoot, removed);
    } catch (error) {
        // Windows refuses to rename a directory another process has open; remove it in place instead.
        if (errnoCode(error) !== 'EPERM') {
            throw error;
        }
        await rm(transactionRoot, { recursive: true, force: true });
        return;
    }
    await rm(removed, { recursive: true, force: true });
}

/**
 * Read the journal of a transaction left in a parent directory.
 *
 * @param transactionRoot the transaction directory
 * @returns the journal, or undefined for a transaction that never wrote one and touched nothing
 */
async function readProjectJournal(transactionRoot: string): Promise<ProjectJournal | undefined> {
    let journalText: string;
    try {
        journalText = await readFile(join(transactionRoot, 'journal.json'), 'utf8');
    } catch (error) {
        if (errnoCode(error) !== 'ENOENT') {
            throw error;
        }
        if (await existingDirectory(join(transactionRoot, 'backup'))) {
            throw new MockGenError(
                MOCKGEN_ERROR_CODE.PROJECT_RECOVERY_REQUIRED,
                t('recovery.journalMissing', { transactionRoot, backup: join(transactionRoot, 'backup') })
            );
        }
        return undefined;
    }
    let value: unknown;
    let parseError: SyntaxError | undefined;
    try {
        value = JSON.parse(journalText);
    } catch (error) {
        // JSON.parse fails only with a SyntaxError; the journal is then reported unreadable with that cause.
        if (!(error instanceof SyntaxError)) {
            throw error;
        }
        parseError = error;
    }
    if (!isProjectJournal(value)) {
        throw new MockGenError(
            MOCKGEN_ERROR_CODE.PROJECT_RECOVERY_REQUIRED,
            t('recovery.journalUnreadable', { transactionRoot }),
            parseError ? { cause: parseError } : undefined
        );
    }
    return value;
}

/**
 * Finish or undo the transactions an interrupted run left in a parent directory. The caller holds the
 * project lock of that directory, so every transaction found belongs to a run that has ended.
 *
 * @param parent directory that holds the project data directories
 * @param directory the project data directory of this run
 * @param targetName last path segment of that directory
 */
async function recoverProjectTransactions(parent: string, directory: string, targetName: string): Promise<void> {
    for (const entry of await readdir(parent, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.isSymbolicLink()) {
            continue;
        }
        if (entry.name.startsWith(REMOVED_TRANSACTION_PREFIX)) {
            await rm(join(parent, entry.name), { recursive: true, force: true });
            continue;
        }
        if (!entry.name.startsWith(TRANSACTION_PREFIX)) {
            continue;
        }
        const transactionRoot = join(parent, entry.name);
        const journal = await readProjectJournal(transactionRoot);
        if (journal === undefined || journal.phase === 'staging') {
            // Nothing outside the transaction was touched yet.
            await removeTransaction(parent, transactionRoot);
            continue;
        }
        if (journal.targetName !== targetName) {
            continue;
        }
        const backup = join(transactionRoot, 'backup');
        const backupExists = await existingDirectory(backup);
        if (journal.phase !== 'installed' && backupExists) {
            if (await existingDirectory(directory)) {
                if ((await directoryFingerprint(directory)) !== journal.stagedSha256) {
                    throw new MockGenError(
                        MOCKGEN_ERROR_CODE.PROJECT_DATA_CHANGED,
                        t('recovery.changedAfterInterruption', { directory })
                    );
                }
                await rename(directory, join(transactionRoot, 'interrupted-output'));
            }
            await rename(backup, directory);
        } else if (journal.phase === 'installed' && !(await existingDirectory(directory))) {
            throw new MockGenError(
                MOCKGEN_ERROR_CODE.PROJECT_RECOVERY_REQUIRED,
                t('recovery.completedDataMissing', { directory })
            );
        }
        await removeTransaction(parent, transactionRoot);
    }
}

/**
 * Generate the selected service and replace its project JSON only after independent validation. Runs that
 * share a parent directory are serialized by a project lock around recovery and the replacement, never
 * around generation.
 *
 * @param input project, data directory, request and options
 * @returns the generation result and the files written
 */
export async function generateProjectData(input: GenerateProjectDataInput): Promise<GeneratedProjectData> {
    const parts = safeDirectory(input.dataDirectory);
    const root = await realpath(input.projectRoot);
    const directory = resolve(root, ...parts);
    if (!isPathInside(root, directory)) {
        throw new MockGenError(MOCKGEN_ERROR_CODE.PROJECT_PATH_UNSAFE, t('projectData.escapesApplication'));
    }
    const targetNames = input.request.targets.map(({ name }) => name);
    if (
        new Set(targetNames).size !== targetNames.length ||
        targetNames.some((name) => !/^[A-Za-z_][A-Za-z0-9_-]*$/u.test(name))
    ) {
        throw new MockGenError(MOCKGEN_ERROR_CODE.REQUEST_INVALID, t('request.unsafeTargetNames'));
    }
    await assertSafeExistingParents(root, parts.slice(0, -1));
    const existingParent = resolve(root, ...parts.slice(0, -1));
    const targetName = parts.at(-1) ?? '';
    if (await existingDirectory(existingParent)) {
        await withProjectLock(existingParent, () => recoverProjectTransactions(existingParent, directory, targetName));
    }
    const originallyPresent = await existingDirectory(directory);
    const initialFingerprint = originallyPresent ? await directoryFingerprint(directory) : null;
    const generator = await createMockDataGenerator({
        executionMode: 'start-mock',
        ...(input.resourceRoot === undefined ? {} : { resourceRoot: input.resourceRoot })
    });
    let generation: StandaloneGenerationResult;
    try {
        generation = await generator.generateService(input.request, input.options);
    } finally {
        await generator.dispose();
    }
    if (!generation.validation.passed) {
        throw new MockGenError(MOCKGEN_ERROR_CODE.PROJECT_DATA_REJECTED, t('projectData.rejectedValidation'));
    }
    input.request.signal?.throwIfAborted();

    const parent = await ensureSafeParent(root, parts.slice(0, -1));
    return withProjectLock(parent, async () => {
        await recoverProjectTransactions(parent, directory, targetName);
        return replaceProjectData(input, generation, {
            parts,
            root,
            parent,
            directory,
            targetName,
            originallyPresent,
            initialFingerprint
        });
    });
}

interface ProjectDataLocation {
    parts: ReadonlyArray<string>;
    root: string;
    parent: string;
    directory: string;
    targetName: string;
    originallyPresent: boolean;
    initialFingerprint: string | null;
}

/**
 * Replace the project data directory with the generated files through a journaled transaction. The caller
 * holds the project lock of the parent directory.
 *
 * @param input project, data directory, request and options
 * @param generation the validated generation result
 * @param location where the data lives and what it held before generation
 * @returns the generation result and the files written
 */
async function replaceProjectData(
    input: GenerateProjectDataInput,
    generation: StandaloneGenerationResult,
    location: ProjectDataLocation
): Promise<GeneratedProjectData> {
    const { parts, root, parent, directory, targetName, originallyPresent, initialFingerprint } = location;
    const targetNames = input.request.targets.map(({ name }) => name);
    if ((await existingDirectory(directory)) !== originallyPresent) {
        throw new MockGenError(MOCKGEN_ERROR_CODE.PROJECT_DATA_CHANGED, t('projectData.directoryChanged'));
    }
    if (originallyPresent) {
        if (!isPathInside(root, await realpath(directory))) {
            throw new MockGenError(MOCKGEN_ERROR_CODE.PROJECT_PATH_UNSAFE, t('projectData.resolvesOutside'));
        }
        await assertSafeContents(directory);
        if ((await directoryFingerprint(directory)) !== initialFingerprint) {
            throw new MockGenError(MOCKGEN_ERROR_CODE.PROJECT_DATA_CHANGED, t('projectData.changedDuringGeneration'));
        }
    }

    const transactionRoot = await mkdtemp(join(parent, TRANSACTION_PREFIX));
    const staged = join(transactionRoot, 'staged');
    const backup = join(transactionRoot, 'backup');
    const journalPath = join(transactionRoot, 'journal.json');
    let backedUp = false;
    let installed = false;
    let rollbackFailed = false;
    try {
        await writeProjectJournal(journalPath, { formatVersion: 1, targetName, phase: 'staging' });
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
            targetName,
            phase: 'prepared',
            stagedSha256: await directoryFingerprint(staged)
        };
        await writeProjectJournal(journalPath, journal);
        if (
            (await existingDirectory(directory)) !== originallyPresent ||
            (originallyPresent && (await directoryFingerprint(directory)) !== initialFingerprint)
        ) {
            throw new MockGenError(MOCKGEN_ERROR_CODE.PROJECT_DATA_CHANGED, t('projectData.changedBeforeReplacement'));
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
        } catch (rollbackError) {
            rollbackFailed = true;
            throw new AggregateError([error, rollbackError], t('projectData.rollbackFailed', { backup }));
        }
        throw error;
    } finally {
        if (!rollbackFailed) {
            await removeTransaction(parent, transactionRoot);
        }
    }
}
