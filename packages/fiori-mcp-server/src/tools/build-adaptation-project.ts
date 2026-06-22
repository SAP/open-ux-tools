import { spawn, type ChildProcess } from 'node:child_process';
import { createInterface } from 'node:readline';
import { access, readFile, appendFile } from 'node:fs/promises';
import { join, isAbsolute, resolve as resolvePath } from 'node:path';
import type { BuildAdaptationProjectInput, ExecuteFunctionalityOutput } from '../types';
import { logger } from '../utils';
import { BUILD_ADAPTATION_PROJECT_ID } from '../constant';

const BUILD_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_LOG_LINES = 500;
const DEFAULT_EXCLUDE_TASKS = ['generateFlexChangesBundle', 'generateComponentPreload', 'minify'];

/**
 * Detects whether the given ui5.yaml already wires the adaptation task as a
 * builder custom task. The task is published by `@ui5/task-adaptation` under
 * the extension name `app-variant-bundler-build` (see the package's own
 * ui5.yaml). Uses a regex scan rather than a YAML parser to avoid adding a
 * runtime dependency. Comments are stripped first to avoid matching
 * commented-out wiring.
 *
 * @param yaml Raw ui5.yaml contents.
 * @returns True when a `customTasks` entry referencing the adaptation task is present.
 */
function hasAdaptationTaskWiring(yaml: string): boolean {
    const stripped = yaml.replace(/^\s*#.*$/gm, '');
    return /customTasks:[\s\S]*?-\s*name:\s*app-variant-bundler-build/.test(stripped);
}

const ADAPTATION_TASK_SNIPPET = `
builder:
  customTasks:
    - name: app-variant-bundler-build
      beforeTask: escapeNonAsciiCharacters
      configuration:
        type: abap
        # appName: <reference id from manifest.appdescr_variant — the original ABAP app being adapted>
        # target:
        #   destination: <BAS destination name>
        #   # OR for URL-based targets:
        #   # url: https://<host>:<port>
        #   # client: '<client>'
        #   ignoreCertErrors: false
        # credentials:
        #   username: env:ABAP_USERNAME
        #   password: env:ABAP_PASSWORD
`;

interface PreflightOk {
    ok: true;
}
interface PreflightError {
    ok: false;
    message: string;
}

/**
 * Checks whether a filesystem path exists and is accessible.
 *
 * @param path Absolute or relative filesystem path.
 * @returns True when the path is accessible.
 */
async function fileExists(path: string): Promise<boolean> {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
}

/**
 * Validates the project shape and required dependencies before building, and
 * optionally patches `ui5.yaml` to wire `ui5-task-adaptation` as a custom task
 * when the wiring is missing.
 *
 * @param appPath Absolute path to the adaptation project root.
 * @param fixYaml When true, append the missing wiring instead of returning an error.
 * @returns A success descriptor (with whether the YAML was patched) or an error descriptor.
 */
async function preflight(appPath: string, fixYaml: boolean): Promise<PreflightOk | PreflightError> {
    if (!isAbsolute(appPath)) {
        return { ok: false, message: `appPath must be an absolute path. Received: ${appPath}` };
    }
    if (!(await fileExists(appPath))) {
        return { ok: false, message: `appPath does not exist: ${appPath}` };
    }
    const manifestPath = join(appPath, 'webapp', 'manifest.appdescr_variant');
    if (!(await fileExists(manifestPath))) {
        return {
            ok: false,
            message: `Not an adaptation project: missing webapp/manifest.appdescr_variant at ${appPath}`
        };
    }
    if (!(await fileExists(join(appPath, 'node_modules', '@ui5', 'cli')))) {
        return {
            ok: false,
            message: `node_modules/@ui5/cli not found in ${appPath}. Run npm install before building.`
        };
    }
    if (!(await fileExists(join(appPath, 'node_modules', '@ui5', 'task-adaptation')))) {
        return {
            ok: false,
            message: `node_modules/@ui5/task-adaptation not found in ${appPath}. Run npm install before building.`
        };
    }
    const yamlPath = join(appPath, 'ui5.yaml');
    if (!(await fileExists(yamlPath))) {
        return { ok: false, message: `ui5.yaml not found at ${yamlPath}` };
    }
    const yaml = await readFile(yamlPath, 'utf8');
    if (hasAdaptationTaskWiring(yaml)) {
        return { ok: true };
    }
    if (!fixYaml) {
        return {
            ok: false,
            message:
                `ui5.yaml does not declare the adaptation task (app-variant-bundler-build) under builder.customTasks. ` +
                `Add a block like the following to ui5.yaml — fill in real values for appName (the original ABAP ` +
                `application id, found in webapp/manifest.appdescr_variant under "reference"), target (destination ` +
                `or url + client), and credentials (env-var references). Or re-run with fixYaml: true to append a ` +
                `commented template that you can fill in before retrying.\n` +
                ADAPTATION_TASK_SNIPPET
        };
    }
    const trailing = yaml.endsWith('\n') ? '' : '\n';
    await appendFile(yamlPath, trailing + ADAPTATION_TASK_SNIPPET);
    logger.info(`Patched ${yamlPath} with a commented adaptation-task template.`);
    return {
        ok: false,
        message:
            `Appended a commented adaptation-task template to ui5.yaml. Fill in appName, target, and credentials, ` +
            `then re-run the build.`
    };
}

/**
 * Composes the argv for `npx ui5 build` from the tool input, mirroring the
 * defaults used by the project's own build script.
 *
 * @param params Tool input.
 * @returns Argument array starting with `ui5 build`.
 */
function buildArgs(params: BuildAdaptationProjectInput): string[] {
    const args = ['ui5', 'build'];
    const exclude = params.excludeTasks ?? DEFAULT_EXCLUDE_TASKS;
    if (exclude.length > 0) {
        args.push('--exclude-task', ...exclude);
    }
    if (params.includeTasks && params.includeTasks.length > 0) {
        args.push('--include-task', ...params.includeTasks);
    }
    if (params.destPath) {
        const dest = isAbsolute(params.destPath) ? params.destPath : resolvePath(params.destPath);
        args.push('--dest', dest);
    }
    if (params.clean !== false) {
        args.push('--clean-dest');
    }
    return args;
}

/**
 * Builds the standard {@link ExecuteFunctionalityOutput} envelope used by all
 * fiori-mcp tools.
 *
 * @param status Either 'Success' or 'Error'.
 * @param message Human-readable summary.
 * @param params Original tool input, echoed back into `parameters`.
 * @param extra Additional fields merged into `parameters`.
 * @returns Standard tool envelope.
 */
function envelope(
    status: 'Success' | 'Error',
    message: string,
    params: BuildAdaptationProjectInput,
    extra: Record<string, unknown> = {}
): ExecuteFunctionalityOutput {
    return {
        functionalityId: BUILD_ADAPTATION_PROJECT_ID,
        status,
        message,
        parameters: { ...params, ...extra },
        appPath: params.appPath,
        changes: [],
        timestamp: new Date().toISOString()
    };
}

/**
 * Builds an SAP UI5 Adaptation Project by invoking the `ui5 build` CLI from
 * the project directory. The UI5 builder discovers `@ui5/task-adaptation` as a
 * custom task via `ui5.yaml`; no programmatic invocation of the task itself is
 * required. The tool validates the project layout, ensures the YAML wiring is
 * present (optionally patching it), spawns the build, and returns the result.
 *
 * @param params Tool input.
 * @returns Standard tool execution envelope.
 */
export async function buildAdaptationProject(params: BuildAdaptationProjectInput): Promise<ExecuteFunctionalityOutput> {
    const { appPath } = params;
    if (!appPath) {
        return envelope('Error', 'Missing required parameter: appPath.', params);
    }

    const pre = await preflight(appPath, params.fixYaml === true);
    if (!pre.ok) {
        return envelope('Error', pre.message, params);
    }

    const args = buildArgs(params);
    const isWindows = process.platform === 'win32';
    const command = isWindows ? 'npx.cmd' : 'npx';

    logger.info(`Spawning UI5 build: ${command} ${args.join(' ')} (cwd=${appPath})`);

    const child: ChildProcess = spawn(command, args, {
        cwd: appPath,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false
    });

    const recentLines: string[] = [];
    const pushLine = (line: string): void => {
        recentLines.push(line);
        if (recentLines.length > MAX_LOG_LINES) {
            recentLines.splice(0, recentLines.length - MAX_LOG_LINES);
        }
    };

    if (child.stdout) {
        const rl = createInterface({ input: child.stdout, crlfDelay: Infinity });
        rl.on('line', (line) => {
            logger.debug(`ui5 build: ${line}`);
            pushLine(line);
        });
    }
    if (child.stderr) {
        const rl = createInterface({ input: child.stderr, crlfDelay: Infinity });
        rl.on('line', (line) => {
            logger.debug(`ui5 build [stderr]: ${line}`);
            pushLine(line);
        });
    }

    const result = await new Promise<{ code: number | null; signal: NodeJS.Signals | null; error?: Error }>(
        (resolve) => {
            const timeout = setTimeout(() => {
                logger.error(`UI5 build timed out after ${BUILD_TIMEOUT_MS}ms; killing child process.`);
                try {
                    child.kill('SIGTERM');
                } catch {
                    // already exited
                }
            }, BUILD_TIMEOUT_MS);

            child.on('error', (error) => {
                clearTimeout(timeout);
                resolve({ code: null, signal: null, error });
            });
            child.on('exit', (code, signal) => {
                clearTimeout(timeout);
                resolve({ code, signal });
            });
        }
    );

    const tail = recentLines.slice(-50).join('\n');
    const dest = params.destPath ?? 'dist';

    if (result.error) {
        return envelope('Error', `Failed to spawn ui5 build: ${result.error.message}\n\nLast output:\n${tail}`, params);
    }
    if (result.code === 0) {
        return envelope(
            'Success',
            `UI5 build completed successfully.\nOutput: ${dest}\n\nLast log lines:\n${tail}`,
            params,
            { destPath: dest }
        );
    }
    return envelope(
        'Error',
        `UI5 build failed (exit code=${result.code ?? 'null'}, signal=${result.signal ?? 'null'}).\n\nLast log lines:\n${tail}`,
        params
    );
}
