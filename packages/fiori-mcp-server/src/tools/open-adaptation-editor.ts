import type { ExecuteFunctionalityOutput, OpenAdaptationEditorInput } from '../types/index.js';
import { spawn, type ChildProcess } from 'node:child_process';
import { createInterface } from 'node:readline';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '../utils/index.js';
import { OPEN_ADAPTATION_EDITOR_ID } from '../constant.js';

const TIMEOUT_MS = 30000;

/**
 * Resolves the command and arguments to launch the Fiori editor CLI.
 * Prefers the local node binary directly over the .bin symlink, falls back to npm.
 */
function resolveFioriBin(appPath: string, isWindows: boolean): { command: string; args: string[] } {
    const fioriBinTarget = join(appPath, 'node_modules', '@sap', 'ux-ui5-tooling', 'bin', 'fiori.cjs');
    const fioriBin = join(appPath, 'node_modules', '.bin', isWindows ? 'fiori.cmd' : 'fiori');

    if (existsSync(fioriBinTarget)) {
        return { command: process.execPath, args: [fioriBinTarget, 'run', '/test/adaptation-editor.html'] };
    }
    if (existsSync(fioriBin)) {
        return { command: fioriBin, args: ['run', '/test/adaptation-editor.html'] };
    }
    return { command: isWindows ? 'npm.cmd' : 'npm', args: ['run', 'start-editor'] };
}

/**
 * Waits for the editor server to emit its URL on stdout (or stderr).
 * Resolves when the URL is found or when the timeout elapses.
 */
function waitForEditorUrl(
    childProcess: ChildProcess,
    timeoutMs: number
): Promise<{ serverUrl: string | undefined; editorPath: string | undefined; stderrOutput: string }> {
    return new Promise((resolve) => {
        let foundServerUrl: string | undefined;
        let foundEditorPath: string | undefined;
        let stderrOutput = '';
        let settled = false;

        const done = (): void => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutId);
            resolve({ serverUrl: foundServerUrl, editorPath: foundEditorPath, stderrOutput });
        };

        const timeoutId = setTimeout(() => {
            logger.warn('Timeout waiting for editor URL');
            done();
        }, timeoutMs);

        if (childProcess.stdout) {
            const rl = createInterface({ input: childProcess.stdout, crlfDelay: Infinity });

            rl.on('line', (line: string) => {
                const clean = line.replace(/\[[0-9;]*m/g, '');
                logger.debug(`Editor: ${clean}`);

                if (!foundEditorPath) {
                    const pathMatch = line.match(/fiori run --open\s+([^\s]+)/);
                    if (pathMatch?.[1]) {
                        foundEditorPath = pathMatch[1];
                    }
                }

                if (!foundServerUrl) {
                    const urlMatch = line.match(/^URL:\s*(https?:\/\/[^\s]+)/);
                    if (urlMatch?.[1]) {
                        foundServerUrl = urlMatch[1];
                        logger.info(`Extracted server URL: ${foundServerUrl}`);
                        rl.close();
                        childProcess.stdout?.resume();
                        done();
                    }
                }
            });

            rl.on('close', done);
        }

        if (childProcess.stderr) {
            childProcess.stderr.setEncoding('utf8');
            childProcess.stderr.on('data', (chunk: string) => {
                stderrOutput += chunk;
            });
        }

        childProcess.on('error', (error) => {
            logger.error(`Editor process error: ${error.message}`);
            done();
        });
    });
}

/**
 * Parses the port from a server URL string.
 */
function parsePort(serverUrl: string): number | undefined {
    try {
        const urlObj = new URL(serverUrl);
        if (urlObj.port) {
            return parseInt(urlObj.port, 10);
        }
        return urlObj.protocol === 'https:' ? 443 : 80;
    } catch {
        return undefined;
    }
}

/**
 * Builds the kill instructions string returned to the caller so they can stop the editor process.
 */
function buildKillInstructions(pid: number, port: number | undefined, isWindows: boolean): string {
    const byPid = isWindows
        ? `Windows: taskkill /PID ${pid} /F`
        : `Mac/Linux: kill ${pid} (or kill -9 ${pid} for force kill)`;

    if (!port) {
        return `To stop the editor:\n${byPid}`;
    }

    const byPort = isWindows
        ? `Windows: for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port}') do taskkill /PID %a /F`
        : `Mac/Linux: kill -9 $(lsof -ti:${port})`;

    return `To stop the editor (recommended - by port):\n${byPort}\n\nAlternative (by PID):\n${byPid}`;
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
        const { command, args } = resolveFioriBin(appPath, isWindows);

        logger.info(`Spawning editor process: ${command} ${args.join(' ')} in ${appPath}`);

        const childProcess: ChildProcess = spawn(command, args, {
            cwd: appPath,
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: false
        });

        const { serverUrl, editorPath, stderrOutput } = await waitForEditorUrl(childProcess, TIMEOUT_MS);

        if (!serverUrl) {
            if (childProcess.pid) {
                try {
                    process.kill(childProcess.pid, 'SIGTERM');
                } catch {
                    // Process may have already exited
                }
            }
            const detail = stderrOutput ? `\nProcess stderr:\n${stderrOutput.trim()}` : '';
            return {
                functionalityId: OPEN_ADAPTATION_EDITOR_ID,
                status: 'Error',
                message: `Timeout: Could not extract server URL from editor output within 30 seconds${detail}`,
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

        const port = parsePort(serverUrl);
        const finalEditorPath = editorPath || '/test/adaptation-editor.html';
        const editorUrl = `${serverUrl}${finalEditorPath}`;

        // Keep draining stdout so its pipe buffer never fills and blocks the child.
        childProcess.stdout?.resume();
        childProcess.unref();

        const killCommandsSection = buildKillInstructions(processId, port, isWindows);
        const portLine = port ? `Actual listening port: ${port}` : '';

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
                ...(port && { port })
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
