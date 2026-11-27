import { createHash, randomBytes } from 'node:crypto';
import type { Stats } from 'node:fs';
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { RENAME_REFUSED_CODES, withProjectLock } from './project-lock.js';
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
import { parseRows } from './project-data-input.js';

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
            await assertSafeContents(join(path, entry.name)); // NOSONAR: sequential, ordered file-system transaction
        }
    }
}

async function assertSafeExistingParents(root: string, parts: ReadonlyArray<string>): Promise<void> {
    let current = root;
    for (const part of parts) {
        current = join(current, part);
        let details;
        try {
            details = await lstat(current); // NOSONAR: sequential, ordered file-system transaction
        } catch (error) {
            if (errnoCode(error) === 'ENOENT') {
                return;
            }
            throw error;
        }
        // Sequential: ordered file-system transaction.
        const safe = await isSafeDirectory(root, current, details); // NOSONAR
        if (!safe) {
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
                await visit(target); // NOSONAR: sequential, ordered file-system transaction
            } else if (entry.isFile() && !entry.isSymbolicLink()) {
                // Sequential: ordered file-system transaction.
                digest.update(`file:${relativePath}:${await sha256File(target)}\n`); // NOSONAR
            } else {
                throw new MockGenError(MOCKGEN_ERROR_CODE.PROJECT_PATH_UNSAFE, t('projectData.linksOrSpecialFiles'));
            }
        }
    };
    await visit(path);
    return digest.digest('hex');
}

/**
 * Whether a path is a real directory inside a root: no link, no special file, and not resolving outside it.
 *
 * @param root the root the directory must stay inside
 * @param path the path
 * @param details the path's `lstat` details
 * @returns true for a safe directory
 */
async function isSafeDirectory(root: string, path: string, details: Stats): Promise<boolean> {
    return details.isDirectory() && !details.isSymbolicLink() && isPathInside(root, await realpath(path));
}

/**
 * Accept a directory that exists already when creating one.
 *
 * @param error the `mkdir` failure
 */
function ignoreExistingDirectory(error: NodeJS.ErrnoException): void {
    if (error.code !== 'EEXIST') {
        throw error;
    }
}

async function ensureSafeParent(root: string, parts: ReadonlyArray<string>): Promise<string> {
    let current = root;
    for (const part of parts) {
        current = join(current, part);
        await mkdir(current).catch(ignoreExistingDirectory); // NOSONAR: sequential, ordered file-system transaction
        const details = await lstat(current); // NOSONAR: sequential, ordered file-system transaction
        // Sequential: ordered file-system transaction.
        const safe = await isSafeDirectory(root, current, details); // NOSONAR
        if (!safe) {
            throw new MockGenError(MOCKGEN_ERROR_CODE.PROJECT_PATH_UNSAFE, t('projectData.unsafeParent'));
        }
    }
    return current;
}

const TRANSACTION_PREFIX = '.mockgen-project-';
const REMOVED_TRANSACTION_PREFIX = '.mockgen-trash-';
const JOURNAL_PHASES: ReadonlySet<string> = new Set(['staging', 'prepared', 'backed-up', 'installed']);

/**
 * The journal of a project data transaction. Phases: `staging` (data directory untouched), `prepared` (staged
 * files complete), `backed-up` (data directory moved to the backup), `installed` (staged files are the data directory).
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
        JOURNAL_PHASES.has(String(journal.phase)) &&
        (journal.phase === 'staging' ? journal.stagedSha256 === undefined : isSha256Hex(journal.stagedSha256))
    );
}

async function writeProjectJournal(path: string, journal: ProjectJournal): Promise<void> {
    await writeFile(`${path}.next`, `${JSON.stringify(journal)}\n`);
    await rename(`${path}.next`, path);
}

/**
 * Remove a transaction directory, renaming it out of the transaction namespace first so a half-done removal
 * never looks like an interrupted transaction.
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
        if (!RENAME_REFUSED_CODES.has(errnoCode(error) ?? '')) {
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
        // A SyntaxError becomes the cause of the unreadable-journal error below.
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
 * Finish or undo the transactions an interrupted run left in a parent directory. The caller holds its
 * project lock, so every transaction found belongs to an ended run.
 *
 * @param parent directory that holds the project data directories
 * @param directory the project data directory of this run
 * @param targetName last path segment of that directory
 */
async function recoverProjectTransactions(parent: string, directory: string, targetName: string): Promise<void> {
    for (const entry of await readdir(parent, { withFileTypes: true })) {
        if (entry.isDirectory() && !entry.isSymbolicLink()) {
            // Sequential: recovering a transaction may move the project data directory.
            await recoverProjectEntry(parent, entry.name, directory, targetName); // NOSONAR
        }
    }
}

/**
 * Finish or undo an interrupted transaction whose journal names this data directory.
 *
 * @param parent directory that holds the project data directories
 * @param name name of the entry, a directory
 * @param directory the project data directory of this run
 * @param targetName last path segment of that directory
 */
async function recoverProjectEntry(parent: string, name: string, directory: string, targetName: string): Promise<void> {
    if (!name.startsWith(TRANSACTION_PREFIX)) {
        return;
    }
    const transactionRoot = join(parent, name);
    const journal = await readProjectJournal(transactionRoot);
    if (journal?.targetName !== targetName) {
        return;
    }
    if (journal.phase !== 'staging') {
        await restoreInterruptedTransaction(transactionRoot, directory, journal);
    }
    await removeTransaction(parent, transactionRoot);
}

/**
 * Restore a consistent project data directory: before installation put the backup back (moving the interrupted
 * output aside, or failing if it changed since); after installation require the installed directory.
 *
 * @param transactionRoot directory of the transaction
 * @param directory the project data directory of this run
 * @param journal the transaction's journal, past staging
 */
async function restoreInterruptedTransaction(
    transactionRoot: string,
    directory: string,
    journal: ProjectJournal
): Promise<void> {
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
}

/**
 * Read existing destination rows and record targets whose file disagrees with the supplied ownership.
 *
 * @param directory the existing destination
 * @param request selected targets and their caller-supplied rows
 * @returns the request merged with destination rows and the names that cannot safely be written
 */
async function readProjectRows(
    directory: string,
    request: MockDataServiceRequest
): Promise<{ request: MockDataServiceRequest; conflicts: ReadonlySet<string> }> {
    const existingData = new Map(Object.entries(request.existingData));
    const conflicts = new Set<string>();
    for (const { name } of request.targets) {
        const path = join(directory, `${name}.json`);
        // Sequential: the output files are read in request order.
        const details = await lstat(path).catch((error: unknown) => {
            // NOSONAR
            if (errnoCode(error) !== 'ENOENT') {
                throw error;
            }
        });
        if (!details) {
            continue;
        }
        if (!details.isFile() || details.isSymbolicLink()) {
            conflicts.add(name);
            continue;
        }
        const contents = await readFile(path, 'utf8'); // NOSONAR
        try {
            const rows = parseRows(JSON.parse(contents), path);
            const supplied = existingData.get(name);
            const initialRows = supplied?.initialRows;
            if (initialRows?.present && 'rows' in initialRows && isDeepStrictEqual(initialRows.rows, rows)) {
                continue;
            }
            if (initialRows?.present || supplied?.contributor.present) {
                conflicts.add(name);
            } else {
                existingData.set(name, {
                    initialRows: { source: 'json', present: true, rows },
                    contributor: { present: false }
                });
            }
        } catch (error) {
            if (!(error instanceof SyntaxError || error instanceof MockGenError)) {
                throw error;
            }
            conflicts.add(name);
        }
    }
    return { request: { ...request, existingData: Object.fromEntries(existingData) }, conflicts };
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
    const snapshot = originallyPresent
        ? await readProjectRows(directory, input.request)
        : { request: input.request, conflicts: new Set<string>() };
    const generator = await createMockDataGenerator({
        executionMode: 'start-mock',
        ...(input.resourceRoot === undefined ? {} : { resourceRoot: input.resourceRoot })
    });
    let generation: StandaloneGenerationResult;
    try {
        generation = await generator.generateService(snapshot.request, input.options);
    } finally {
        await generator.dispose();
    }
    if (!generation.validation.passed) {
        throw new MockGenError(MOCKGEN_ERROR_CODE.PROJECT_DATA_REJECTED, t('projectData.rejectedValidation'));
    }
    input.request.signal?.throwIfAborted();
    const writableTargets = targetNames.filter((name) => {
        if (Object.hasOwn(generation.resources, name)) {
            return true;
        }
        if (
            generation.diagnostics?.some(({ code, target }) => code === 'SCHEMA_ENTITY_SET_SKIPPED' && target === name)
        ) {
            return false;
        }
        throw new TypeError(`MockGen did not generate resource ${name}`);
    });
    if (writableTargets.length === 0) {
        return { generation, files: Object.freeze([]) };
    }

    const parent = await ensureSafeParent(root, parts.slice(0, -1));
    return withProjectLock(parent, async () => {
        await recoverProjectTransactions(parent, directory, targetName);
        return replaceProjectData(
            input,
            generation,
            {
                parts,
                root,
                parent,
                directory,
                targetName,
                originallyPresent,
                initialFingerprint
            },
            writableTargets,
            snapshot.conflicts
        );
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
 * Check that the project data directory is as before generation: same presence, inside the project, no links or
 * special files, same contents.
 *
 * @param location where the data lives and what it held before generation
 * @throws {MockGenError} `PROJECT_DATA_CHANGED` or `PROJECT_PATH_UNSAFE` when it is not
 */
async function assertUnchangedDuringGeneration(location: ProjectDataLocation): Promise<void> {
    const { root, directory, originallyPresent, initialFingerprint } = location;
    if ((await existingDirectory(directory)) !== originallyPresent) {
        throw new MockGenError(MOCKGEN_ERROR_CODE.PROJECT_DATA_CHANGED, t('projectData.directoryChanged'));
    }
    if (!originallyPresent) {
        return;
    }
    if (!isPathInside(root, await realpath(directory))) {
        throw new MockGenError(MOCKGEN_ERROR_CODE.PROJECT_PATH_UNSAFE, t('projectData.resolvesOutside'));
    }
    await assertSafeContents(directory);
    if ((await directoryFingerprint(directory)) !== initialFingerprint) {
        throw new MockGenError(MOCKGEN_ERROR_CODE.PROJECT_DATA_CHANGED, t('projectData.changedDuringGeneration'));
    }
}

/**
 * Whether the project data directory appeared, disappeared or changed contents since generation began.
 *
 * @param directory the project data directory
 * @param originallyPresent whether it existed before generation
 * @param initialFingerprint its fingerprint before generation, or null when absent
 * @returns true when it changed
 */
async function projectDataChanged(
    directory: string,
    originallyPresent: boolean,
    initialFingerprint: string | null
): Promise<boolean> {
    return (
        (await existingDirectory(directory)) !== originallyPresent ||
        (originallyPresent && (await directoryFingerprint(directory)) !== initialFingerprint)
    );
}

/** The files written for the targets, and the targets whose file name another target's file already took. */
interface StagedFiles {
    files: string[];
    collisions: string[];
}

/**
 * Whether a target's file is one this run already wrote under another name, as on a case-insensitive file system.
 *
 * @param path the target's file in the staging directory
 * @param written the file identities this run wrote, by lower-case file name
 * @returns true when writing it would overwrite another target's file
 */
async function takenByAnotherTarget(path: string, written: ReadonlyMap<string, number>): Promise<boolean> {
    const earlier = written.get(basename(path).toLowerCase());
    if (earlier === undefined) {
        return false;
    }
    const existing = await lstat(path).catch(() => undefined);
    // A file system without file identities reports 0; names that differ only in case are then taken as one file.
    return existing !== undefined && (existing.ino === earlier || existing.ino === 0);
}

/**
 * Write one JSON file per generated target into the staging directory; a skipped target keeps its existing file.
 *
 * @param staged the staging directory
 * @param targetNames the requested resources, in request order
 * @param generation the validated generation result
 * @param parts the data directory's path segments below the project
 * @param conflicts files whose existing contents could not safely be appended
 * @returns the project-relative paths of the files written, in request order, and the targets not written because
 * their file name differs only in case from an earlier target's on a file system that ignores case
 * @throws {TypeError} when a target that was not skipped has no rows
 */
async function stageGeneratedFiles(
    staged: string,
    targetNames: ReadonlyArray<string>,
    generation: StandaloneGenerationResult,
    parts: ReadonlyArray<string>,
    conflicts: ReadonlySet<string>
): Promise<StagedFiles> {
    const files: string[] = [];
    const collisions: string[] = [];
    const written = new Map<string, number>();
    for (const name of targetNames) {
        const rows = generation.resources[name];
        const filename = `${name}.json`;
        const path = join(staged, filename);
        // Sequential: ordered file-system transaction.
        const taken = await takenByAnotherTarget(path, written); // NOSONAR
        if (taken) {
            collisions.push(name);
            continue;
        }
        if (conflicts.has(name)) {
            throw new MockGenError(
                MOCKGEN_ERROR_CODE.PROJECT_DATA_CHANGED,
                t('projectData.existingRowsConflict', { filename })
            );
        }
        await writeFile(path, `${JSON.stringify(rows, null, 2)}\n`, { flag: 'w' }); // NOSONAR
        written.set(filename.toLowerCase(), (await lstat(path)).ino); // NOSONAR
        files.push(`${parts.join('/')}/${filename}`);
    }
    return { files, collisions };
}

/**
 * Add a warning for each target whose file was not written because another target's file has the same name but for
 * case.
 *
 * @param generation the validated generation result
 * @param collisions the targets not written
 * @returns the result with those warnings
 */
function withCollisionDiagnostics(
    generation: StandaloneGenerationResult,
    collisions: ReadonlyArray<string>
): StandaloneGenerationResult {
    if (collisions.length === 0) {
        return generation;
    }
    return {
        ...generation,
        diagnostics: [
            ...generation.diagnostics,
            ...collisions.map((target) => ({
                code: 'PROJECT_FILE_NAME_COLLISION' as const,
                severity: 'warning' as const,
                message: t('projectData.fileNameCollision', { target }),
                target
            }))
        ]
    };
}

/**
 * Replace the project data directory through a journaled transaction; the caller holds the parent's project lock.
 *
 * @param input project, data directory, request and options
 * @param generation the validated generation result
 * @param location where the data lives and what it held before generation
 * @param targetNames the generated targets to write
 * @param conflicts files whose existing contents could not safely be appended
 * @returns the generation result and the files written
 */
async function replaceProjectData(
    input: GenerateProjectDataInput,
    generation: StandaloneGenerationResult,
    location: ProjectDataLocation,
    targetNames: ReadonlyArray<string>,
    conflicts: ReadonlySet<string>
): Promise<GeneratedProjectData> {
    const { parts, parent, directory, targetName, originallyPresent, initialFingerprint } = location;
    await assertUnchangedDuringGeneration(location);

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
        const { files, collisions } = await stageGeneratedFiles(staged, targetNames, generation, parts, conflicts);
        input.request.signal?.throwIfAborted();
        const journal: ProjectJournal = {
            formatVersion: 1,
            targetName,
            phase: 'prepared',
            stagedSha256: await directoryFingerprint(staged)
        };
        await writeProjectJournal(journalPath, journal);
        if (await projectDataChanged(directory, originallyPresent, initialFingerprint)) {
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
        return { generation: withCollisionDiagnostics(generation, collisions), files: Object.freeze(files) };
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
            // A leftover transaction is completed by the next run's recovery, so a failed cleanup is ignored.
            await removeTransaction(parent, transactionRoot).catch(() => undefined);
        }
    }
}
