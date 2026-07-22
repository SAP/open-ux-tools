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

/**
 * Starts the adaptation editor server by spawning `npx fiori run /test/adaptation-editor.html`
 * in the adaptation project directory.
 *
 * @param params - Input parameters containing the appPath.
 * @returns A promise resolving to the execution output with editor URL and process info.
 */
export async function openAdaptationEditor(params: OpenAdaptationEditorInput): Promise<ExecuteFunctionalityOutput> {
    const { appPath } = params;

    try {
        const isWindows = process.platform === 'win32';
        const command = isWindows ? 'npx.cmd' : 'npx';
        const args = ['fiori', 'run', '/test/adaptation-editor.html'];

        logger.info(`Spawning editor process: ${command} ${args.join(' ')} in ${appPath}`);

        const childProcess: ChildProcess = spawn(command, args, {
            cwd: appPath,
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: false
        });

        let editorPath: string | undefined;
        let serverUrl: string | undefined;
        let resolved = false;
        let spawnError: Error | undefined;

        if (childProcess.stdout) {
            const rl = createInterface({
                input: childProcess.stdout,
                crlfDelay: Infinity
            });

            rl.on('line', (line: string) => {
                logger.debug(`Editor output: ${line}`);

                if (!editorPath) {
                    const pathMatch = line.match(/fiori run --open\s+([^\s]+)/);
                    if (pathMatch?.[1]) {
                        editorPath = pathMatch[1];
                        logger.info(`Extracted editor path: ${editorPath}`);
                    }
                }

                if (!serverUrl) {
                    const urlMatch = line.match(/^URL:\s*(https?:\/\/[^\s]+)/);
                    if (urlMatch?.[1]) {
                        serverUrl = urlMatch[1];
                        logger.info(`Extracted server URL: ${serverUrl}`);
                    }
                }

                if (serverUrl && editorPath && !resolved) {
                    resolved = true;
                    rl.close();
                }
            });

            rl.on('close', () => {
                if (!resolved && serverUrl && editorPath) {
                    resolved = true;
                }
            });
        }

        if (childProcess.stderr) {
            const stderrRl = createInterface({
                input: childProcess.stderr,
                crlfDelay: Infinity
            });

            stderrRl.on('line', (line: string) => {
                logger.debug(`Editor stderr: ${line}`);
            });
        }

        childProcess.on('error', (error) => {
            logger.error(`Editor process error: ${error.message}`);
            if (!resolved) {
                spawnError = error;
                resolved = true;
            }
        });

        const timeoutId = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                logger.warn('Timeout waiting for editor URL');
            }
        }, TIMEOUT_MS);

        await new Promise<void>((resolve) => {
            const checkInterval = setInterval(() => {
                if (resolved) {
                    clearInterval(checkInterval);
                    clearTimeout(timeoutId);
                    resolve();
                }
            }, 100);
        });

        if (spawnError) {
            return {
                functionalityId: OPEN_ADAPTATION_EDITOR_ID,
                status: 'Error',
                message: `Failed to spawn editor process: ${spawnError.message}`,
                parameters: params,
                appPath,
                changes: [],
                timestamp: new Date().toISOString()
            };
        }

        if (!serverUrl) {
            if (childProcess.pid) {
                try {
                    process.kill(childProcess.pid, 'SIGTERM');
                } catch {
                    // Process may have already exited
                }
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

        const finalEditorPath = editorPath || '/test/adaptation-editor.html';
        const editorUrl = `${serverUrl}${finalEditorPath}`;
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

        let preferredPort: number | undefined;
        try {
            const urlObj = new URL(serverUrl);
            if (urlObj.port) {
                preferredPort = Number.parseInt(urlObj.port, 10);
            } else {
                preferredPort = urlObj.protocol === 'https:' ? 443 : 80;
            }
        } catch {
            // URL parse failure is non-critical
        }

        childProcess.unref();

        await new Promise((resolve) => setTimeout(resolve, 1000));
        const detectedPort = await getPortFromPid(processId, preferredPort);
        const port = detectedPort ?? preferredPort;

        const killPort = port;
        let killPortCommands = '';
        let killProcessCommands = '';

        if (killPort) {
            killPortCommands = isWindows
                ? `Windows: for /f "tokens=5" %a in ('netstat -ano ^| findstr :${killPort}') do taskkill /PID %a /F`
                : `Mac/Linux: kill -9 $(lsof -ti:${killPort})`;
        }

        killProcessCommands = isWindows
            ? `Windows: taskkill /PID ${processId} /F`
            : `Mac/Linux: kill ${processId} (or kill -9 ${processId} for force kill)`;

        const portLine = killPort ? `Actual listening port: ${killPort}` : '';
        const killCommandsSection = killPortCommands
            ? `To stop the editor (recommended - by port):\n${killPortCommands}\n\nAlternative (by PID):\n${killProcessCommands}`
            : `To stop the editor:\n${killProcessCommands}`;

        const message = `Adaptation editor started successfully.
Editor URL: ${editorUrl}
Process ID: ${processId}
${portLine}

${killCommandsSection}`;

        return {
            functionalityId: OPEN_ADAPTATION_EDITOR_ID,
            status: 'Success',
            message,
            parameters: {
                ...params,
                editorUrl,
                processId,
                ...(killPort && { port: killPort })
            },
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
