import type { OpenAdaptationEditorOutput, OpenAdaptationEditorInput } from '../types/index.js';
import { type ChildProcess } from 'node:child_process';
import spawn from 'nano-spawn';
import { createInterface } from 'node:readline';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { isCFEnvironment } from '@sap-ux/adp-tooling';
import { logger } from '../utils/index.js';

/** Startup timeout for ABAP projects — `fiori run` is quick to announce its URL. */
const ABAP_TIMEOUT_MS = 30000;
/**
 * Startup timeout for CF projects. The CF editor (`ui5 serve`) fetches service
 * keys and boots the embedded approuter before it prints its URL — observed to
 * take ~40s even on the no-build path — so it needs far more headroom than ABAP.
 */
const CF_TIMEOUT_MS = 300000;

/**
 * Editor entry path. This is the production editor path that generated
 * adaptation projects expose (see `@sap-ux/adp-tooling` writer `editors` config)
 * for both ABAP and CF — the server serves it regardless of scenario. (Open-source
 * middleware test setups may also expose `/local/editor.html`, but that is a
 * testing artifact, not what production projects use.)
 */
const EDITOR_PATH = '/test/adaptation-editor.html';

/**
 * Launch configuration resolved per scenario.
 */
interface LaunchConfig {
    command: string;
    args: string[];
    timeoutMs: number;
}

/**
 * Resolves the command and arguments to launch the Fiori editor CLI.
 * Prefers the local node binary directly over the .bin symlink, falls back to npm.
 *
 * @param appPath - Absolute path to the adaptation project root.
 * @returns An object containing the command and its arguments.
 */
function resolveFioriBin(appPath: string): { command: string; args: string[] } {
    const fioriBinTarget = join(appPath, 'node_modules', '@sap', 'ux-ui5-tooling', 'bin', 'fiori.cjs');
    const fioriBin = join(appPath, 'node_modules', '.bin', 'fiori');

    if (existsSync(fioriBinTarget)) {
        return { command: process.execPath, args: [fioriBinTarget, 'run', '/test/adaptation-editor.html'] };
    }
    if (existsSync(fioriBin) || existsSync(`${fioriBin}.cmd`)) {
        return { command: 'fiori', args: ['run', '/test/adaptation-editor.html'] };
    }
    return { command: 'npm', args: ['run', 'start-editor'] };
}

/**
 * Resolves how to launch the editor for the given project. The launch mechanism
 * is the same for ABAP and Cloud Foundry (CF) — `resolveFioriBin`, which starts
 * the server (reading the project's `ui5.yaml`, including the CF proxy
 * middleware) without opening a browser; the browser is opened later by the
 * `start` RTA step. CF differs only in two respects: it needs a prior build so
 * the approuter can serve `dist/` (when missing, a `reason` is returned so the
 * caller fails fast with guidance instead of starting a server that cannot
 * serve the app), and it needs a longer startup timeout because the embedded
 * approuter and service-key resolution take significantly longer to come up.
 *
 * @param appPath - Absolute path to the adaptation project root.
 * @returns A launch config, or `{ reason }` when CF prerequisites are not met.
 */
async function resolveLaunch(appPath: string): Promise<LaunchConfig | { reason: string }> {
    const { command, args } = resolveFioriBin(appPath);
    const isCf = await isCFEnvironment(appPath);
    if (!isCf) {
        return { command, args, timeoutMs: ABAP_TIMEOUT_MS };
    }

    if (!existsSync(join(appPath, 'dist'))) {
        return {
            reason:
                'This Cloud Foundry adaptation project has no "dist" folder, which the editor needs to serve. ' +
                'Run "npm run build" once in the project to produce "dist", then try again.'
        };
    }

    return { command, args, timeoutMs: CF_TIMEOUT_MS };
}

/**
 * Waits for the editor server to emit its URL on stdout (or stderr).
 * Resolves when the URL is found or when the timeout elapses.
 *
 * @param childProcess - The spawned editor child process to listen on.
 * @param timeoutMs - Maximum milliseconds to wait before resolving with undefined URL.
 * @returns A promise resolving with the server URL, editor path, and any stderr output.
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
        const timer = { id: undefined as ReturnType<typeof setTimeout> | undefined };

        const done = (): void => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timer.id);
            resolve({ serverUrl: foundServerUrl, editorPath: foundEditorPath, stderrOutput });
        };

        timer.id = setTimeout(() => {
            logger.warn('Timeout waiting for editor URL');
            done();
        }, timeoutMs);

        if (childProcess.stdout) {
            const rl = createInterface({ input: childProcess.stdout, crlfDelay: Infinity });

            rl.on('line', (line: string) => {
                const clean = line.replace(new RegExp(String.fromCodePoint(27) + String.raw`\[[0-9;]*m`, 'g'), '');
                logger.debug(`Editor: ${clean}`);

                if (!foundEditorPath) {
                    const pathMatch = /fiori run --open\s+([^\s]+)/.exec(line);
                    if (pathMatch?.[1]) {
                        foundEditorPath = pathMatch[1];
                    }
                }

                if (!foundServerUrl) {
                    const urlMatch = /^URL:\s*(https?:\/\/[^\s]+)/.exec(line);
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
 *
 * @param serverUrl - The full server URL to extract the port from.
 * @returns The numeric port, or `undefined` if the URL cannot be parsed.
 */
function parsePort(serverUrl: string): number | undefined {
    try {
        const urlObj = new URL(serverUrl);
        if (urlObj.port) {
            return Number.parseInt(urlObj.port, 10);
        }
        return urlObj.protocol === 'https:' ? 443 : 80;
    } catch {
        return undefined;
    }
}

/**
 * Builds the kill instructions string returned to the caller so they can stop the editor process.
 *
 * @param pid - The process ID of the running editor server.
 * @param port - The listening port, used to generate an alternative port-based kill command.
 * @param isWindows - Whether the current platform is Windows.
 * @returns A formatted string with platform-appropriate instructions for stopping the process.
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
export async function openAdaptationEditor(params: OpenAdaptationEditorInput): Promise<OpenAdaptationEditorOutput> {
    const { appPath } = params;

    try {
        const isWindows = process.platform === 'win32';
        const launch = await resolveLaunch(appPath);
        if ('reason' in launch) {
            return { status: 'Error', message: launch.reason };
        }
        const { command, args, timeoutMs } = launch;

        logger.info(`Spawning editor process: ${command} ${args.join(' ')} in ${appPath}`);

        // nano-spawn handles .cmd/.bat shims on Windows without shell: true.
        const subprocess = spawn(command, args, { cwd: appPath });
        const childProcess: ChildProcess = await subprocess.nodeChildProcess;

        const { serverUrl, editorPath, stderrOutput } = await waitForEditorUrl(childProcess, timeoutMs);

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
                status: 'Error',
                message: `Timeout: Could not extract server URL from editor output within ${Math.round(
                    timeoutMs / 1000
                )} seconds${detail}`
            };
        }

        const processId = childProcess.pid;
        if (!processId) {
            return {
                status: 'Error',
                message: 'Failed to get process ID from spawned editor process'
            };
        }

        const port = parsePort(serverUrl);
        const finalEditorPath = editorPath || EDITOR_PATH;
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
            status: 'Success',
            message,
            editorUrl,
            processId,
            ...(port && { port })
        };
    } catch (error) {
        logger.error(`Error opening adaptation editor: ${error}`);
        return {
            status: 'Error',
            message: 'Error opening adaptation editor: ' + (error instanceof Error ? error.message : String(error))
        };
    }
}
