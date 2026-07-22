import type { ExecuteFunctionalityOutput, OpenAdaptationEditorInput } from '../types/index.js';
import { spawn, type ChildProcess, exec } from 'node:child_process';
import { createInterface } from 'node:readline';
import { promisify } from 'node:util';
import { logger } from '../utils/index.js';
import { OPEN_ADAPTATION_EDITOR_ID } from '../constant.js';

const TIMEOUT_MS = 30000;
const execAsync = promisify(exec);

const TCP_LISTEN_WINDOWS = /TCP\s+[\d.]+:(\d+)\s+[\d.]+\s+LISTENING\s+\d+/;
const TCP_LISTEN_UNIX = /TCP\s+(?:[\d.]+|\[?[\da-f:]+\]?|\*):(\d+)\s+\(LISTEN\)/;

async function getWindowsPorts(pid: number, preferredPort?: number): Promise<number[]> {
    const { stdout } = await execAsync(`netstat -ano | findstr ${pid}`);
    const found: number[] = [];
    for (const line of stdout.split('\n')) {
        const match = TCP_LISTEN_WINDOWS.exec(line);
        if (!match?.[1]) continue;
        const port = Number.parseInt(match[1], 10);
        if (Number.isNaN(port)) continue;
        found.push(port);
        if (preferredPort && port === preferredPort) return found;
    }
    return found;
}

async function getChildPids(pid: number): Promise<number[]> {
    try {
        const { stdout } = await execAsync(`pgrep -P ${pid}`);
        return stdout.trim().split('\n').filter(Boolean).map(Number).filter((p) => !Number.isNaN(p));
    } catch {
        return [];
    }
}

async function getUnixPortsForPid(checkPid: number, preferredPort?: number): Promise<number[]> {
    const found: number[] = [];
    try {
        const { stdout } = await execAsync(`lsof -p ${checkPid} -iTCP -sTCP:LISTEN -n -P`);
        for (const line of stdout.split('\n')) {
            if (line.trim().startsWith('COMMAND')) continue;
            const match = TCP_LISTEN_UNIX.exec(line);
            if (!match?.[1]) continue;
            const port = Number.parseInt(match[1], 10);
            if (Number.isNaN(port)) continue;
            found.push(port);
            if (preferredPort && port === preferredPort) return found;
        }
    } catch {
        // lsof may fail for some PIDs
    }
    return found;
}

/**
 * Gets the actual port number that a process is listening on.
 *
 * @param pid Process ID to check
 * @param preferredPort Optional port to prefer if found
 * @returns Port number if found, undefined otherwise
 */
async function getPortFromPid(pid: number, preferredPort?: number): Promise<number | undefined> {
    const isWindows = process.platform === 'win32';
    try {
        let foundPorts: number[];
        if (isWindows) {
            foundPorts = await getWindowsPorts(pid, preferredPort);
        } else {
            const pidsToCheck = [pid, ...(await getChildPids(pid))];
            foundPorts = [];
            for (const checkPid of pidsToCheck) {
                const ports = await getUnixPortsForPid(checkPid, preferredPort);
                foundPorts.push(...ports);
                if (preferredPort && foundPorts.includes(preferredPort)) break;
            }
        }
        return foundPorts[0];
    } catch (error) {
        logger.warn(`Failed to get port from PID ${pid}: ${error instanceof Error ? error.message : String(error)}`);
    }
    return undefined;
}

const EDITOR_PATH_RE = /fiori run --open\s+([^\s]+)/;
const SERVER_URL_RE = /^URL:\s*(https?:\/\/[^\s]+)/;

interface EditorState {
    editorPath: string | undefined;
    serverUrl: string | undefined;
    resolved: boolean;
    spawnError: Error | undefined;
}

function watchStdout(childProcess: ChildProcess, state: EditorState): void {
    if (!childProcess.stdout) return;
    const rl = createInterface({ input: childProcess.stdout, crlfDelay: Infinity });
    rl.on('line', (line: string) => {
        logger.debug(`Editor output: ${line}`);
        if (!state.editorPath) {
            const m = EDITOR_PATH_RE.exec(line);
            if (m?.[1]) {
                state.editorPath = m[1];
                logger.info(`Extracted editor path: ${state.editorPath}`);
            }
        }
        if (!state.serverUrl) {
            const m = SERVER_URL_RE.exec(line);
            if (m?.[1]) {
                state.serverUrl = m[1];
                logger.info(`Extracted server URL: ${state.serverUrl}`);
            }
        }
        if (state.serverUrl && state.editorPath && !state.resolved) {
            state.resolved = true;
            rl.close();
        }
    });
    rl.on('close', () => {
        if (!state.resolved && state.serverUrl && state.editorPath) {
            state.resolved = true;
        }
    });
}

function buildKillCommands(isWindows: boolean, processId: number, port: number | undefined): string {
    const byPid = isWindows
        ? `Windows: taskkill /PID ${processId} /F`
        : `Mac/Linux: kill ${processId} (or kill -9 ${processId} for force kill)`;
    if (!port) return `To stop the editor:\n${byPid}`;
    const byPort = isWindows
        ? `Windows: for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port}') do taskkill /PID %a /F`
        : `Mac/Linux: kill -9 $(lsof -ti:${port})`;
    return `To stop the editor (recommended - by port):\n${byPort}\n\nAlternative (by PID):\n${byPid}`;
}

function getPreferredPort(serverUrl: string): number | undefined {
    try {
        const urlObj = new URL(serverUrl);
        if (urlObj.port) return Number.parseInt(urlObj.port, 10);
        return urlObj.protocol === 'https:' ? 443 : 80;
    } catch {
        return undefined;
    }
}

/**
 * Starts the adaptation editor server by spawning `npx fiori run /test/adaptation-editor.html`
 * in the adaptation project directory.
 *
 * @param params - Input parameters containing the appPath.
 * @returns A promise resolving to the execution output with editor URL and process info.
 */
export async function openAdaptationEditor(params: OpenAdaptationEditorInput): Promise<ExecuteFunctionalityOutput> {
    const { appPath } = params;
    const isWindows = process.platform === 'win32';

    try {
        const command = isWindows ? 'npx.cmd' : 'npx';
        const args = ['fiori', 'run', '/test/adaptation-editor.html'];
        logger.info(`Spawning editor process: ${command} ${args.join(' ')} in ${appPath}`);

        const childProcess: ChildProcess = spawn(command, args, {
            cwd: appPath,
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: false
        });

        const state: EditorState = { editorPath: undefined, serverUrl: undefined, resolved: false, spawnError: undefined };

        watchStdout(childProcess, state);

        if (childProcess.stderr) {
            const stderrRl = createInterface({ input: childProcess.stderr, crlfDelay: Infinity });
            stderrRl.on('line', (line: string) => logger.debug(`Editor stderr: ${line}`));
        }

        childProcess.on('error', (error) => {
            logger.error(`Editor process error: ${error.message}`);
            if (!state.resolved) {
                state.spawnError = error;
                state.resolved = true;
            }
        });

        const timeoutId = setTimeout(() => {
            if (!state.resolved) {
                state.resolved = true;
                logger.warn('Timeout waiting for editor URL');
            }
        }, TIMEOUT_MS);

        await new Promise<void>((resolve) => {
            const checkInterval = setInterval(() => {
                if (state.resolved) {
                    clearInterval(checkInterval);
                    clearTimeout(timeoutId);
                    resolve();
                }
            }, 100);
        });

        if (state.spawnError) {
            return {
                functionalityId: OPEN_ADAPTATION_EDITOR_ID,
                status: 'Error',
                message: `Failed to spawn editor process: ${state.spawnError.message}`,
                parameters: params,
                appPath,
                changes: [],
                timestamp: new Date().toISOString()
            };
        }

        if (!state.serverUrl) {
            if (childProcess.pid) {
                try { process.kill(childProcess.pid, 'SIGTERM'); } catch { /* already exited */ }
            }
            return {
                functionalityId: OPEN_ADAPTATION_EDITOR_ID,
                status: 'Error',
                message: 'Timeout: Could not extract server URL from editor output within 30 seconds',
                parameters: params,
                appPath,
                changes: [],
                timestamp: new Date().toISOString()
            };
        }

        const processId = childProcess.pid;
        if (!processId) {
            return {
                functionalityId: OPEN_ADAPTATION_EDITOR_ID,
                status: 'Error',
                message: 'Failed to get process ID from spawned editor process',
                parameters: params,
                appPath,
                changes: [],
                timestamp: new Date().toISOString()
            };
        }

        childProcess.unref();
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const preferredPort = getPreferredPort(state.serverUrl);
        const port = (await getPortFromPid(processId, preferredPort)) ?? preferredPort;
        const editorUrl = `${state.serverUrl}${state.editorPath ?? '/test/adaptation-editor.html'}`;
        const portLine = port ? `Actual listening port: ${port}` : '';
        const message = `Adaptation editor started successfully.\nEditor URL: ${editorUrl}\nProcess ID: ${processId}\n${portLine}\n\n${buildKillCommands(isWindows, processId, port)}`;

        return {
            functionalityId: OPEN_ADAPTATION_EDITOR_ID,
            status: 'Success',
            message,
            parameters: { ...params, editorUrl, processId, ...(port && { port }) },
            appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        logger.error(`Error opening adaptation editor: ${error}`);
        return {
            functionalityId: OPEN_ADAPTATION_EDITOR_ID,
            status: 'Error',
            message: 'Error opening adaptation editor: ' + (error instanceof Error ? error.message : String(error)),
            parameters: params,
            appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }
}
