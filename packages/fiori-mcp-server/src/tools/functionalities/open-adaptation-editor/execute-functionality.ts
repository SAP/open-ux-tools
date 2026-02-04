import type { ExecuteFunctionalityInput, ExecuteFunctionalityOutput } from '../../../types';
import { spawn, type ChildProcess, exec } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { promisify } from 'node:util';
import { logger } from '../../../utils';
import details from './details';

const TIMEOUT_MS = 30000; // 30 seconds
const execAsync = promisify(exec);

/**
 * Gets the actual port number that a process is listening on.
 *
 * @param pid Process ID to check
 * @param preferredPort Optional port to prefer if found (e.g., from URL)
 * @returns Port number if found, undefined otherwise
 */
async function getPortFromPid(pid: number, preferredPort?: number): Promise<number | undefined> {
    const isWindows = process.platform === 'win32';
    const foundPorts: number[] = [];

    try {
        if (isWindows) {
            // Windows: netstat -ano | findstr <pid> and extract port from listening connections
            const { stdout } = await execAsync(`netstat -ano | findstr ${pid}`);
            const lines = stdout.split('\n');
            for (const line of lines) {
                // Look for LISTENING state and extract port (format: TCP    0.0.0.0:PORT         0.0.0.0:0              LISTENING       PID)
                const match = line.match(/TCP\s+[\d.]+:(\d+)\s+[\d.]+\s+LISTENING\s+\d+/);
                if (match && match[1]) {
                    const port = parseInt(match[1], 10);
                    if (!isNaN(port)) {
                        foundPorts.push(port);
                        // If this matches the preferred port, return it immediately
                        if (preferredPort && port === preferredPort) {
                            return port;
                        }
                    }
                }
            }
        } else {
            // Mac/Linux: Check the process and its children (the actual server might be a child process)
            // First, get all PIDs (parent + children)
            const pidsToCheck = [pid];
            try {
                // Get child process PIDs using pgrep
                const { stdout: childrenStdout } = await execAsync(`pgrep -P ${pid}`);
                const childPids = childrenStdout
                    .trim()
                    .split('\n')
                    .filter((line) => line.trim())
                    .map((line) => parseInt(line.trim(), 10))
                    .filter((p) => !isNaN(p));
                pidsToCheck.push(...childPids);
                logger.debug(`Checking ports for PID ${pid} and ${childPids.length} child process(es)`);
            } catch (error) {
                // pgrep might fail if no children exist, that's okay
                logger.debug(`No child processes found for PID ${pid}`);
            }

            // Check all PIDs (parent and children)
            for (const checkPid of pidsToCheck) {
                try {
                    const { stdout } = await execAsync(`lsof -p ${checkPid} -iTCP -sTCP:LISTEN -n -P`);
                    const lines = stdout.split('\n');
                    for (const line of lines) {
                        // Skip header line
                        if (line.trim().startsWith('COMMAND')) {
                            continue;
                        }
                        // Extract port from output - handle multiple formats:
                        // Format 1: ... TCP *:PORT (LISTEN)
                        // Format 2: ... TCP 127.0.0.1:PORT (LISTEN)
                        // Format 3: ... TCP [::]:PORT (LISTEN)
                        const match = line.match(/TCP\s+(?:[\d.]+|\[?[\da-f:]+\]?|\*):(\d+)\s+\(LISTEN\)/);
                        if (match && match[1]) {
                            const port = parseInt(match[1], 10);
                            if (!isNaN(port)) {
                                foundPorts.push(port);
                                logger.debug(`Found listening port ${port} for PID ${checkPid}`);
                                // If this matches the preferred port, return it immediately
                                if (preferredPort && port === preferredPort) {
                                    logger.info(`Matched preferred port ${preferredPort} for PID ${checkPid}`);
                                    return port;
                                }
                            }
                        }
                    }
                } catch (error) {
                    // lsof might fail for some PIDs (e.g., if process doesn't exist or has no listening ports)
                    logger.debug(
                        `lsof failed for PID ${checkPid}: ${error instanceof Error ? error.message : String(error)}`
                    );
                }
            }
            if (foundPorts.length > 0) {
                logger.debug(
                    `Found ${foundPorts.length} listening port(s) for PID ${pid} and children: ${foundPorts.join(', ')}`
                );
            }
        }

        // If we found ports but none matched preferred, return the first one
        // If preferred port was specified but not found, still return first found port
        if (foundPorts.length > 0) {
            return foundPorts[0];
        }
    } catch (error) {
        logger.warn(`Failed to get port from PID ${pid}: ${error instanceof Error ? error.message : String(error)}`);
    }

    return undefined;
}

/**
 * Executes the open-adaptation-editor functionality to start the adaptation editor server.
 *
 * @param params Input parameters for opening the adaptation editor.
 * @returns Editor URL and process ID execution output.
 */
export default async function (params: ExecuteFunctionalityInput): Promise<ExecuteFunctionalityOutput> {
    const { appPath } = params;

    try {
        // 1. Validate appPath exists and contains package.json with start-editor script
        const packageJsonPath = join(appPath, 'package.json');
        let packageJson: { scripts?: Record<string, string> };

        try {
            const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
            packageJson = JSON.parse(packageJsonContent);
        } catch (error) {
            return {
                functionalityId: details.functionalityId,
                status: 'Error',
                message: `Failed to read package.json: ${error instanceof Error ? error.message : String(error)}`,
                parameters: params.parameters,
                appPath,
                changes: [],
                timestamp: new Date().toISOString()
            };
        }

        if (!packageJson.scripts?.['start-editor']) {
            return {
                functionalityId: details.functionalityId,
                status: 'Error',
                message: "package.json does not contain a 'start-editor' script",
                parameters: params.parameters,
                appPath,
                changes: [],
                timestamp: new Date().toISOString()
            };
        }

        // 2. Spawn npm run start-editor process
        const isWindows = process.platform === 'win32';
        const command = isWindows ? 'npm.cmd' : 'npm';
        const args = ['run', 'start-editor'];

        logger.info(`Spawning editor process: ${command} ${args.join(' ')} in ${appPath}`);

        const childProcess: ChildProcess = spawn(command, args, {
            cwd: appPath,
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: false
        });

        let editorPath: string | undefined;
        let serverUrl: string | undefined;
        let resolved = false;

        // 3. Read stdout line by line using readline interface
        if (childProcess.stdout) {
            const rl = createInterface({
                input: childProcess.stdout,
                crlfDelay: Infinity
            });

            rl.on('line', (line: string) => {
                logger.debug(`Editor output: ${line}`);

                // 4. Extract editor path from line containing "fiori run --open <path>"
                if (!editorPath) {
                    const pathMatch = line.match(/fiori run --open\s+([^\s]+)/);
                    if (pathMatch && pathMatch[1]) {
                        editorPath = pathMatch[1];
                        logger.info(`Extracted editor path: ${editorPath}`);
                    }
                }

                // 5. Extract URL from line matching "URL: <url>"
                if (!serverUrl) {
                    const urlMatch = line.match(/^URL:\s*(https?:\/\/[^\s]+)/);
                    if (urlMatch && urlMatch[1]) {
                        serverUrl = urlMatch[1];
                        logger.info(`Extracted server URL: ${serverUrl}`);
                    }
                }

                // If we have both URL and path, we can resolve
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

        // Also read stderr for potential errors
        if (childProcess.stderr) {
            const stderrRl = createInterface({
                input: childProcess.stderr,
                crlfDelay: Infinity
            });

            stderrRl.on('line', (line: string) => {
                logger.debug(`Editor stderr: ${line}`);
            });
        }

        // Handle process errors
        childProcess.on('error', (error) => {
            logger.error(`Editor process error: ${error.message}`);
            if (!resolved) {
                resolved = true;
            }
        });

        // 6. Wait up to 30 seconds for URL to appear (with timeout handling)
        const timeoutId = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                logger.warn('Timeout waiting for editor URL');
            }
        }, TIMEOUT_MS);

        // Wait for resolution (either URL found or timeout)
        await new Promise<void>((resolve) => {
            const checkInterval = setInterval(() => {
                if (resolved) {
                    clearInterval(checkInterval);
                    clearTimeout(timeoutId);
                    resolve();
                }
            }, 100);
        });

        // Check if we got the required information
        if (!serverUrl) {
            // Kill the process if we didn't get the URL
            if (childProcess.pid) {
                try {
                    process.kill(childProcess.pid, 'SIGTERM');
                } catch (error) {
                    logger.warn(`Failed to kill process ${childProcess.pid}: ${error}`);
                }
            }

            return {
                functionalityId: details.functionalityId,
                status: 'Error',
                message: 'Timeout: Could not extract server URL from editor output within 30 seconds',
                parameters: params.parameters,
                appPath,
                changes: [],
                timestamp: new Date().toISOString()
            };
        }

        // Use default editor path if not found in output
        const finalEditorPath = editorPath || '/test/adaptation-editor.html';

        // 7. Combine URL + editor path
        const editorUrl = `${serverUrl}${finalEditorPath}`;

        // 8. Capture the process PID
        const processId = childProcess.pid;

        if (!processId) {
            return {
                functionalityId: details.functionalityId,
                status: 'Error',
                message: 'Failed to get process ID from spawned editor process',
                parameters: params.parameters,
                appPath,
                changes: [],
                timestamp: new Date().toISOString()
            };
        }

        // 9. Extract preferred port from server URL to help identify the correct listening port
        let preferredPort: number | undefined;
        try {
            const urlObj = new URL(serverUrl);
            if (urlObj.port) {
                preferredPort = parseInt(urlObj.port, 10);
            } else {
                preferredPort = urlObj.protocol === 'https:' ? 443 : 80;
            }
        } catch (error) {
            logger.warn(`Failed to parse server URL for preferred port: ${error}`);
        }

        // 10. Detach process using childProcess.unref() so it runs independently in the background
        childProcess.unref();

        // 11. Get the actual port the process is listening on (wait a bit for process to bind to port)
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second for process to start listening
        const detectedPort = await getPortFromPid(processId, preferredPort);
        // Use detected port if available, otherwise fall back to preferred port from URL
        const port = detectedPort ?? preferredPort;

        if (port) {
            logger.info(
                `Editor started successfully. URL: ${editorUrl}, PID: ${processId}, Actual listening port: ${port}`
            );
        } else {
            logger.info(
                `Editor started successfully. URL: ${editorUrl}, PID: ${processId}, Port: could not be determined`
            );
        }

        // 12. Generate platform-specific kill commands (prioritize port-based since PID changes)
        // Use the port we determined (detected or from URL)
        const killPort = port;

        let killPortCommands = '';
        let killProcessCommands = '';

        if (killPort) {
            // Primary method: kill by port (recommended since PID changes)
            killPortCommands = isWindows
                ? `Windows: for /f "tokens=5" %a in ('netstat -ano ^| findstr :${killPort}') do taskkill /PID %a /F`
                : `Mac/Linux: kill -9 $(lsof -ti:${killPort})`;
        }

        // Secondary method: kill by PID (as fallback)
        killProcessCommands = isWindows
            ? `Windows: taskkill /PID ${processId} /F`
            : `Mac/Linux: kill ${processId} (or kill -9 ${processId} for force kill)`;

        // 13. Return structured output with message, PID, and port
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
            functionalityId: details.functionalityId,
            status: 'Success',
            message,
            parameters: {
                ...params.parameters,
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
            functionalityId: details.functionalityId,
            status: 'Error',
            message: 'Error opening adaptation editor: ' + (error instanceof Error ? error.message : String(error)),
            parameters: params.parameters,
            appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }
}
