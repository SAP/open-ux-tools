import type { ExecuteFunctionalityOutput, OpenAdaptationEditorInput } from '../types/index.js';
import { spawn, type ChildProcess } from 'node:child_process';
import { createInterface } from 'node:readline';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from '../utils/index.js';
import { OPEN_ADAPTATION_EDITOR_ID } from '../constant.js';

const TIMEOUT_MS = 30000;

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

        // Invoke the local fiori CLI directly via node to avoid npm/npx resolution overhead.
        // Falls back to npm run start-editor if the symlink target can't be resolved.
        const fioriBin = join(appPath, 'node_modules', '.bin', isWindows ? 'fiori.cmd' : 'fiori');
        const fioriBinTarget = join(appPath, 'node_modules', '@sap', 'ux-ui5-tooling', 'bin', 'fiori.cjs');
        let command: string;
        let args: string[];
        if (existsSync(fioriBinTarget)) {
            command = process.execPath;
            args = [fioriBinTarget, 'run', '/test/adaptation-editor.html'];
        } else if (existsSync(fioriBin)) {
            command = fioriBin;
            args = ['run', '/test/adaptation-editor.html'];
        } else {
            command = isWindows ? 'npm.cmd' : 'npm';
            args = ['run', 'start-editor'];
        }

        const startTime = Date.now();
        logger.info(`Spawning editor process: ${command} ${args.join(' ')} in ${appPath}`);

        const childProcess: ChildProcess = spawn(command, args, {
            cwd: appPath,
            stdio: ['ignore', 'pipe', 'ignore'],
            shell: false
        });

        const { serverUrl, editorPath } = await new Promise<{ serverUrl: string | undefined; editorPath: string | undefined }>(
            (resolve) => {
                let foundServerUrl: string | undefined;
                let foundEditorPath: string | undefined;

                let settled = false;
                const done = () => {
                    if (settled) return;
                    settled = true;
                    resolve({ serverUrl: foundServerUrl, editorPath: foundEditorPath });
                };

                const timeoutId = setTimeout(() => {
                    logger.warn('Timeout waiting for editor URL');
                    done();
                }, TIMEOUT_MS);

                const cleanup = () => {
                    clearTimeout(timeoutId);
                    childProcess.stdout?.destroy();
                    done();
                };

                if (childProcess.stdout) {
                    const rl = createInterface({ input: childProcess.stdout, crlfDelay: Infinity });

                    rl.on('line', (line: string) => {
                        const clean = line.replace(/\x1b\[[0-9;]*m/g, '');
                        logger.info(`[+${Date.now() - startTime}ms] Editor: ${clean}`);

                        if (!foundEditorPath) {
                            const pathMatch = line.match(/fiori run --open\s+([^\s]+)/);
                            if (pathMatch?.[1]) {
                                foundEditorPath = pathMatch[1];
                                logger.info(`Extracted editor path: ${foundEditorPath}`);
                            }
                        }

                        if (!foundServerUrl) {
                            const urlMatch = line.match(/^URL:\s*(https?:\/\/[^\s]+)/);
                            if (urlMatch?.[1]) {
                                foundServerUrl = urlMatch[1];
                                logger.info(`Extracted server URL: ${foundServerUrl}`);
                            }
                        }

                        if (foundServerUrl) {
                            logger.info(`[+${Date.now() - startTime}ms] URL found, resolving`);
                            rl.close();
                            cleanup();
                        }
                    });

                    rl.on('close', cleanup);
                }

                childProcess.on('error', (error) => {
                    logger.error(`Editor process error: ${error.message}`);
                    cleanup();
                });
            }
        );

        logger.info(`[+${Date.now() - startTime}ms] Promise resolved, serverUrl: ${serverUrl}`);

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

        let port: number | undefined;
        try {
            const urlObj = new URL(serverUrl);
            if (urlObj.port) {
                port = parseInt(urlObj.port, 10);
            } else {
                port = urlObj.protocol === 'https:' ? 443 : 80;
            }
        } catch {
            // URL parse failure is non-critical
        }

        childProcess.unref();

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
