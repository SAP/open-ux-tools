import type { OpenAdaptationEditorOutput, OpenAdaptationEditorInput } from '../types/index.js';
import { type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import spawn from 'nano-spawn';
import { createInterface } from 'node:readline';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { isAppStudio, exposePort } from '@sap-ux/btp-utils';
import { isCFEnvironment } from '@sap-ux/adp-tooling';
import { logger } from '../utils/index.js';
import {
    registerEditorSession,
    signalEditor,
    terminateEditorProcess,
    trackEditorProcess
} from '../adaptation-editor/editor-session.js';
import { isSimpleBrowserRelayEnabled } from '../adaptation-editor/simple-browser-relay.js';

/** Startup timeout for ABAP projects — `fiori run` is quick to announce its URL. */
const ABAP_TIMEOUT_MS = 30000;
/** Startup timeout for CF projects: the editor boots the embedded approuter (~40s) before printing its URL. */
const CF_TIMEOUT_MS = 300000;

/** Production editor entry path exposed by generated ABAP and CF adaptation projects. */
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
 * In BAS the editor's loopback URL isn't browser-reachable, so rewrite its origin to the
 * BAS-exposed external HTTPS URL for the given port. Outside BAS the URL is returned unchanged.
 *
 * @param editorUrl - The localhost editor URL (origin + editor path).
 * @param port - The local port the editor server listens on.
 * @returns The externally reachable editor URL in BAS, otherwise `editorUrl`.
 */
async function resolveExternalEditorUrl(editorUrl: string, port: number | undefined): Promise<string> {
    if (!isAppStudio() || !port) {
        return editorUrl;
    }
    try {
        const externalBase = await exposePort(port);
        if (!externalBase) {
            return editorUrl;
        }
        // exposePort returns an origin (e.g. https://port<N>-...cloud.sap/);
        // keep the editor's path + search from the original URL.
        const original = new URL(editorUrl);
        const external = new URL(externalBase);
        external.pathname = original.pathname;
        external.search = original.search;
        return external.toString();
    } catch {
        logger.warn(`Could not resolve BAS external URL for port ${port}`);
        return editorUrl;
    }
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
        return { command: process.execPath, args: [fioriBinTarget, 'run', EDITOR_PATH] };
    }
    if (existsSync(fioriBin) || existsSync(`${fioriBin}.cmd`)) {
        return { command: 'fiori', args: ['run', EDITOR_PATH] };
    }
    return { command: 'npm', args: ['run', 'start-editor'] };
}

/**
 * Finds a free TCP port by binding to port 0 on the loopback interface.
 *
 * @returns A promise resolving to an unused port.
 */
function findFreePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = createServer();
        server.unref();
        server.on('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            const port = typeof address === 'object' && address ? address.port : 0;
            server.close(() => (port ? resolve(port) : reject(new Error('Could not determine a free port'))));
        });
    });
}

/**
 * Resolves how to launch the editor for a project. The mechanism is the same for
 * ABAP and CF (`resolveFioriBin`); CF differs only in needing a prior build (when
 * `dist/` is missing, a `reason` is returned so the caller fails fast) and a
 * longer startup timeout for the embedded approuter.
 *
 * @param appPath - Absolute path to the adaptation project root.
 * @returns A launch config, or `{ reason }` when CF prerequisites are not met.
 */
async function resolveLaunch(appPath: string): Promise<LaunchConfig | { reason: string }> {
    const { command, args } = resolveFioriBin(appPath);
    // Bind the editor to a free port so a stale server left on the default port can never
    // be mistaken for this one. The npm fallback runs a fixed script and takes no port flag.
    const launchArgs = command === 'npm' ? args : [...args, '--port', String(await findFreePort())];
    const isCf = await isCFEnvironment(appPath);
    if (!isCf) {
        return { command, args: launchArgs, timeoutMs: ABAP_TIMEOUT_MS };
    }

    if (!existsSync(join(appPath, 'dist'))) {
        return {
            reason:
                'This Cloud Foundry adaptation project has no "dist" folder, which the editor needs to serve. ' +
                'Run "npm run build" once in the project to produce "dist", then try again.'
        };
    }

    return { command, args: launchArgs, timeoutMs: CF_TIMEOUT_MS };
}

/**
 * Waits for the editor server to emit its URL on stdout (or stderr).
 * Resolves when the URL is found or when the timeout elapses.
 *
 * @param childProcess - The spawned editor child process to listen on.
 * @param timeoutMs - Maximum milliseconds to wait before resolving with undefined URL.
 * @param redact - Removes relay credentials from diagnostic output.
 * @returns A promise resolving with the server URL, editor path, and any stderr output.
 */
function waitForEditorUrl(
    childProcess: ChildProcess,
    timeoutMs: number,
    redact: (text: string) => string
): Promise<{ serverUrl: string | undefined; editorPath: string | undefined; stderrOutput: string }> {
    return new Promise((resolve) => {
        let foundServerUrl: string | undefined;
        let foundEditorPath: string | undefined;
        let stderrOutput = '';
        let settled = false;
        let rl: ReturnType<typeof createInterface> | undefined;
        const timer = { id: undefined as ReturnType<typeof setTimeout> | undefined };

        const done = (): void => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timer.id);
            rl?.close();
            childProcess.removeListener('exit', done);
            resolve({ serverUrl: foundServerUrl, editorPath: foundEditorPath, stderrOutput: redact(stderrOutput) });
        };

        timer.id = setTimeout(() => {
            logger.warn('Timeout waiting for editor URL');
            done();
        }, timeoutMs);

        if (childProcess.stdout) {
            rl = createInterface({ input: childProcess.stdout, crlfDelay: Infinity });

            rl.on('line', (line: string) => {
                const clean = redact(
                    line.replace(new RegExp(String.fromCodePoint(27) + String.raw`\[[0-9;]*m`, 'g'), '')
                );
                logger.debug(`Editor: ${clean}`);

                if (!foundEditorPath) {
                    const pathMatch = /fiori run --open\s+([^\s]+)/.exec(clean);
                    if (pathMatch?.[1]) {
                        foundEditorPath = pathMatch[1];
                    }
                }

                if (!foundServerUrl) {
                    const urlMatch = /^URL:\s*(https?:\/\/[^\s]+)/.exec(clean);
                    if (urlMatch?.[1]) {
                        foundServerUrl = urlMatch[1];
                        logger.info(`Extracted server URL: ${foundServerUrl}`);
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
            logger.error(`Editor process error: ${redact(error.message)}`);
            done();
        });
        childProcess.once('exit', done);
        if (childProcess.exitCode != null || childProcess.signalCode != null) {
            done();
        }
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
 * @param isWindows - Whether the current platform is Windows.
 * @param useHttpRelay - Whether the editor uses the RTA HTTP relay.
 * @returns A formatted string with platform-appropriate instructions for stopping the process.
 */
function buildKillInstructions(pid: number, isWindows: boolean, useHttpRelay: boolean): string {
    if (useHttpRelay) {
        return 'To stop the editor, use run_rta_workflow_step with step "stop" and the exact Editor URL above.';
    }
    return isWindows
        ? `To stop the owned editor process tree:\nWindows: taskkill /PID ${pid} /T /F`
        : `To stop the owned editor process group:\nMac/Linux: kill -TERM -- -${pid}`;
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
    let childProcess: ChildProcess | undefined;
    let relayToken: string | undefined;
    const inheritedToken = process.env.SAP_FIORI_MCP_ADP_RELAY_TOKEN;
    const redact = (text: string): string => {
        for (const token of [relayToken, inheritedToken]) {
            if (token) {
                text = text.replaceAll(token, '[redacted]');
            }
        }
        return text;
    };

    try {
        const isWindows = process.platform === 'win32';
        const useHttpRelay = isSimpleBrowserRelayEnabled();
        relayToken = useHttpRelay ? randomBytes(32).toString('hex') : undefined;
        const launch = await resolveLaunch(appPath);
        if ('reason' in launch) {
            return { status: 'Error', message: launch.reason };
        }
        const { command, args, timeoutMs } = launch;

        logger.info(redact(`Spawning editor process: ${command} ${args.join(' ')} in ${appPath}`));

        // nano-spawn handles .cmd/.bat shims on Windows without shell: true.
        // Its env API merges with process.env; undefined explicitly removes an inherited token.
        const subprocess = spawn(command, args, {
            cwd: appPath,
            detached: !isWindows,
            env: { SAP_FIORI_MCP_ADP_RELAY_TOKEN: relayToken }
        });
        // nano-spawn also returns a completion promise: termination must not cause an unhandled rejection.
        subprocess.catch(() => {});
        childProcess = await subprocess.nodeChildProcess;
        trackEditorProcess(childProcess, !isWindows);

        const { serverUrl, editorPath, stderrOutput } = await waitForEditorUrl(childProcess, timeoutMs, redact);

        if (!serverUrl) {
            await terminateEditorProcess(childProcess);
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
            await terminateEditorProcess(childProcess);
            return {
                status: 'Error',
                message: 'Failed to get process ID from spawned editor process'
            };
        }

        const port = parsePort(serverUrl);
        const finalEditorPath = editorPath || EDITOR_PATH;
        const localEditorUrl = `${serverUrl}${finalEditorPath}`;
        const editorUrl = await resolveExternalEditorUrl(localEditorUrl, port);
        const autoOpen = isAppStudio() || process.env.SAP_FIORI_MCP_ADP_FORCE_AUTOOPEN === 'true';

        // Keep draining stdout so its pipe buffer never fills and blocks the child.
        childProcess.stdout?.resume();
        childProcess.unref();
        registerEditorSession({ localUrl: localEditorUrl, browserUrl: editorUrl, relayToken, childProcess, autoOpen });
        if (autoOpen) {
            signalEditor('open', editorUrl);
        }

        const killCommandsSection = buildKillInstructions(processId, isWindows, useHttpRelay);
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
        if (childProcess) {
            await terminateEditorProcess(childProcess);
        }
        const detail = redact(error instanceof Error ? error.message : String(error));
        logger.error(`Error opening adaptation editor: ${detail}`);
        return {
            status: 'Error',
            message: 'Error opening adaptation editor: ' + detail
        };
    }
}
