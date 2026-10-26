import type { ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { logger } from './logger.js';

export interface EditorSession {
    localUrl: string;
    browserUrl: string;
    relayToken?: string;
    childProcess: ChildProcess;
    autoOpen: boolean;
}

const sessions = new Map<string, EditorSession>();
const stopping = new Map<EditorSession, Promise<boolean>>();
const closed = new WeakSet<EditorSession>();
const ownedGroups = new WeakSet<ChildProcess>();
const terminating = new WeakMap<ChildProcess, Promise<boolean>>();
const SIGNAL_FILE = join(tmpdir(), 'sap-ux-adp-editor.json');
const EXIT_TIMEOUT_MS = 2000;

/**
 * Records group ownership immediately after spawning our own detached child.
 * Never infer ownership from a PID, a listening port, or an editor URL.
 *
 * @param childProcess - The child spawned by this MCP server.
 * @param detached - Whether that spawn created a new POSIX process group.
 */
export function trackEditorProcess(childProcess: ChildProcess, detached: boolean): void {
    if (detached && process.platform !== 'win32') {
        ownedGroups.add(childProcess);
    }
}

/**
 * Publishes a best-effort, atomic command for the BAS editor launcher.
 * The mailbox deliberately contains neither process details nor relay credentials.
 *
 * @param command - Whether to open or close the editor.
 * @param url - The exact browser URL registered for the editor.
 */
export function signalEditor(command: 'open' | 'close', url: string): void {
    let temporaryFile: string | undefined;
    try {
        const id = randomUUID();
        temporaryFile = `${SIGNAL_FILE}.${id}.tmp`;
        writeFileSync(temporaryFile, JSON.stringify({ command, url, id }), {
            encoding: 'utf8',
            mode: 0o600,
            flag: 'wx'
        });
        renameSync(temporaryFile, SIGNAL_FILE);
    } catch {
        logger.warn(`Could not write editor ${command} signal`);
        if (temporaryFile) {
            try {
                unlinkSync(temporaryFile);
            } catch {
                // A failed write may not have created the temporary file.
            }
        }
    }
}

/**
 * Checks actual exit state, not ChildProcess.killed (which only means a signal was sent).
 *
 * @param childProcess - The owned editor child.
 * @returns Whether the child has exited.
 */
function hasExited(childProcess: ChildProcess): boolean {
    return childProcess.exitCode != null || childProcess.signalCode != null;
}

/**
 * Removes only aliases that still belong to this session.
 *
 * @param session - The editor session to forget.
 */
function removeSession(session: EditorSession): void {
    for (const url of [session.localUrl, session.browserUrl]) {
        if (sessions.get(url) === session) {
            sessions.delete(url);
        }
    }
}

/**
 * Retains the process handle for relay and non-relay editors alike.
 *
 * @param session - A successfully started editor and its exact URLs.
 */
export function registerEditorSession(session: EditorSession): void {
    if (hasExited(session.childProcess)) {
        throw new Error('Editor process exited during startup. Reopen it with open_adaptation_editor.');
    }
    sessions.set(session.localUrl, session);
    sessions.set(session.browserUrl, session);
    session.childProcess.once('exit', () => removeSession(session));
}

/**
 * Resolves only an exact URL registered in this MCP server lifetime.
 *
 * @param site - The local or browser URL returned at startup, without rewriting.
 * @returns The editor session owning that URL.
 */
export function requireEditorSession(site: string): EditorSession {
    const session = sessions.get(site);
    if (!session) {
        throw new Error(
            'Unknown editor session. Reopen the editor with open_adaptation_editor and use its exact returned editor URL.'
        );
    }
    return session;
}

/**
 * Waits a bounded interval for child exit, removing the listener on either outcome.
 *
 * @param childProcess - The owned editor child.
 * @returns Whether exit was observed.
 */
function waitForExit(childProcess: ChildProcess): Promise<boolean> {
    if (hasExited(childProcess)) {
        return Promise.resolve(true);
    }
    return new Promise((resolve) => {
        const timer = { id: undefined as ReturnType<typeof setTimeout> | undefined };
        const onExit = (): void => {
            clearTimeout(timer.id);
            resolve(true);
        };
        timer.id = setTimeout(() => {
            childProcess.removeListener('exit', onExit);
            resolve(false);
        }, EXIT_TIMEOUT_MS);
        childProcess.once('exit', onExit);
    });
}

/**
 * Signals only the owned child, or its explicitly recorded new POSIX group.
 *
 * @param childProcess - The editor child spawned by this MCP server.
 * @param signal - The termination signal, or zero to test group existence.
 * @returns Whether the target still exists after signalling.
 */
function signalProcess(childProcess: ChildProcess, signal: NodeJS.Signals | 0): boolean {
    try {
        if (ownedGroups.has(childProcess) && childProcess.pid) {
            process.kill(-childProcess.pid, signal);
            return true;
        }
        return signal !== 0 && childProcess.kill(signal);
    } catch (error) {
        if (error?.code !== 'ESRCH') {
            logger.warn('Could not signal owned editor process');
        }
        return false;
    }
}

/**
 * Terminates an owned process tree where possible, including failed startups.
 * Windows and unmarked children use ChildProcess.kill; no port discovery is used.
 *
 * @param childProcess - The editor child spawned by this MCP server.
 * @returns Whether the child exited within the bounded termination interval.
 */
export function terminateEditorProcess(childProcess: ChildProcess): Promise<boolean> {
    const pending = terminating.get(childProcess);
    if (pending) {
        return pending;
    }
    const termination = Promise.resolve()
        .then(async () => {
            if (hasExited(childProcess) || !childProcess.pid) {
                return hasExited(childProcess);
            }
            const exited = waitForExit(childProcess);
            signalProcess(childProcess, 'SIGTERM');
            const graceful = await exited;
            // The CLI parent may exit before a descendant. Probe only our own group.
            const groupAlive = ownedGroups.has(childProcess) && signalProcess(childProcess, 0);
            if (graceful && !groupAlive) {
                return true;
            }
            const forcedExit = waitForExit(childProcess);
            signalProcess(childProcess, 'SIGKILL');
            return forcedExit;
        })
        .finally(() => terminating.delete(childProcess));
    terminating.set(childProcess, termination);
    return termination;
}

/**
 * Stops only a registered editor, deduplicating concurrent local/browser URL stops.
 *
 * @param site - An exact registered URL; unknown URLs are never used to discover processes.
 * @returns Whether the owned editor process stopped; false for unknown sessions.
 */
export function stopEditorSession(site: string): Promise<boolean> {
    const session = sessions.get(site);
    // The child exit listener can remove the registry entry while a stop is finishing.
    const pending = session
        ? stopping.get(session)
        : [...stopping].find(([editor]) => editor.localUrl === site || editor.browserUrl === site)?.[1];
    if (pending) {
        return pending;
    }
    if (!session) {
        return Promise.resolve(false);
    }
    const stop = Promise.resolve()
        .then(async () => {
            if (session.autoOpen && !closed.has(session)) {
                closed.add(session);
                signalEditor('close', session.browserUrl);
            }
            const stopped = await terminateEditorProcess(session.childProcess);
            if (stopped) {
                removeSession(session);
            }
            return stopped;
        })
        .finally(() => stopping.delete(session));
    stopping.set(session, stop);
    return stop;
}

/** Stops the editors owned by this MCP lifetime during server shutdown. */
export async function stopEditorSessions(): Promise<void> {
    await Promise.all([...new Set(sessions.values())].map((session) => stopEditorSession(session.browserUrl)));
}
