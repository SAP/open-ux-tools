import type { ChildProcess } from 'node:child_process';
import type { EventEmitter } from 'node:events';
import crossSpawn from 'cross-spawn';
import { assertCompatibleMockserver } from './host-compatibility.js';
import type { PreparedModelArtifacts } from './model/release.js';

const ACTIVATION_ENVIRONMENT_VARIABLE = 'SAP_UX_MOCKGEN_ENABLED';
const MODEL_MANIFEST_ENVIRONMENT_VARIABLE = 'SAP_UX_MOCKGEN_MODEL_MANIFEST';
const MODEL_CACHE_ENVIRONMENT_VARIABLE = 'SAP_UX_MOCKGEN_MODEL_CACHE';
const PRIVATE_ENVIRONMENT_VARIABLES = new Set([
    ACTIVATION_ENVIRONMENT_VARIABLE,
    MODEL_MANIFEST_ENVIRONMENT_VARIABLE,
    MODEL_CACHE_ENVIRONMENT_VARIABLE
]);
const FORWARDED_SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const;
const MODEL_ACQUISITION_WARNING =
    'MODEL_ACQUISITION_FAILED: learned generation is unavailable; deterministic generation remains active.';

type ForwardedSignal = (typeof FORWARDED_SIGNALS)[number];

interface StartSignalSource {
    /** Register a forwarded signal handler. */
    on(event: ForwardedSignal, listener: () => void): EventEmitter;
    /** Remove a forwarded signal handler. */
    off(event: ForwardedSignal, listener: () => void): EventEmitter;
}

interface StartSpawnOptions {
    env: NodeJS.ProcessEnv;
    shell: false;
    stdio: 'inherit';
}

type StartSpawn = (command: string, args: ReadonlyArray<string>, options: StartSpawnOptions) => ChildProcess;
type ModelStatusReporter = (message: string) => void;

interface StartCommandDependencies {
    assertHostCompatibility?: () => void;
    env?: NodeJS.ProcessEnv;
    info?: ModelStatusReporter;
    prepareModelArtifacts?: (onStatus: ModelStatusReporter) => Promise<PreparedModelArtifacts | undefined>;
    signalSource?: StartSignalSource;
    spawn?: StartSpawn;
    warn?: (message: string) => void;
}

export interface ParsedStartCommand {
    command: string;
    args: ReadonlyArray<string>;
    env: NodeJS.ProcessEnv;
    mockgenEnabled: boolean;
}

/**
 * Parse the shell-free command used behind an application's `start-mock` script.
 *
 * @param argv CLI arguments including `start`
 * @param parentEnvironment environment inherited from the npm process
 * @returns validated child process inputs
 */
export function parseStartCommand(
    argv: ReadonlyArray<string>,
    parentEnvironment: NodeJS.ProcessEnv = process.env
): ParsedStartCommand {
    if (argv[0] !== 'start' || argv[1] !== '--') {
        throw new TypeError('The start command requires -- before the child command');
    }
    const command = argv[2];
    if (!command) {
        throw new TypeError('The start command requires a child command after --');
    }
    const childArguments = argv.slice(3);
    const activationFlags = childArguments.filter((argument) => argument === '--mockgen');
    if (activationFlags.length > 1) {
        throw new TypeError('--mockgen may be specified only once');
    }
    const mockgenEnabled = activationFlags.length === 1;
    const environment = { ...parentEnvironment };
    for (const name of Object.keys(environment)) {
        if (PRIVATE_ENVIRONMENT_VARIABLES.has(name.toUpperCase())) {
            delete environment[name];
        }
    }
    environment[ACTIVATION_ENVIRONMENT_VARIABLE] = mockgenEnabled ? '1' : '0';
    return Object.freeze({
        command,
        args: Object.freeze(childArguments.filter((argument) => argument !== '--mockgen')),
        env: Object.freeze(environment),
        mockgenEnabled
    });
}

/**
 * Convert the supported termination signals to conventional shell exit codes.
 *
 * @param signal child termination signal
 * @returns conventional signal exit code, or one for an unknown signal
 */
function signalExitCode(signal: NodeJS.Signals | null): number {
    switch (signal) {
        case 'SIGHUP':
            return 129;
        case 'SIGINT':
            return 130;
        case 'SIGTERM':
            return 143;
        default:
            return 1;
    }
}

/**
 * Launch the application's original Fiori command and mirror its lifecycle.
 *
 * @param argv CLI arguments including `start`
 * @param dependencies injectable process adapters used by tests
 * @returns child exit code
 */
export async function executeStartCommand(
    argv: ReadonlyArray<string>,
    dependencies: StartCommandDependencies = {}
): Promise<number> {
    const parsed = parseStartCommand(argv, dependencies.env ?? process.env);
    let childEnvironment = parsed.env;
    if (parsed.mockgenEnabled) {
        (dependencies.assertHostCompatibility ?? assertCompatibleMockserver)();
        try {
            const info =
                dependencies.info ??
                ((message: string): void => {
                    process.stdout.write(`${message}\n`);
                });
            const prepareModelArtifacts =
                dependencies.prepareModelArtifacts ??
                (async (onStatus: ModelStatusReporter): Promise<PreparedModelArtifacts | undefined> =>
                    (await import('./model/release.js')).prepareDefaultModelArtifacts({ onStatus }));
            const prepared = await prepareModelArtifacts(info);
            if (prepared) {
                childEnvironment = Object.freeze({
                    ...parsed.env,
                    [MODEL_MANIFEST_ENVIRONMENT_VARIABLE]: prepared.manifestPath,
                    [MODEL_CACHE_ENVIRONMENT_VARIABLE]: prepared.cacheRoot
                });
            }
        } catch {
            const warn =
                dependencies.warn ??
                ((message: string): void => {
                    process.stderr.write(`${message}\n`);
                });
            warn(MODEL_ACQUISITION_WARNING);
        }
    }
    const spawn = dependencies.spawn ?? (crossSpawn as StartSpawn);
    const signalSource = dependencies.signalSource ?? process;
    const child = spawn(parsed.command, parsed.args, {
        env: childEnvironment,
        shell: false,
        stdio: 'inherit'
    });

    return new Promise<number>((resolve, reject) => {
        const signalHandlers = new Map<ForwardedSignal, () => void>();
        const cleanup = (): void => {
            for (const [signal, handler] of signalHandlers) {
                signalSource.off(signal, handler);
            }
        };
        for (const signal of FORWARDED_SIGNALS) {
            const handler = (): void => {
                child.kill(signal);
            };
            signalHandlers.set(signal, handler);
            signalSource.on(signal, handler);
        }
        child.once('error', (error) => {
            cleanup();
            reject(error);
        });
        child.once('close', (code, signal) => {
            cleanup();
            resolve(code ?? signalExitCode(signal));
        });
    });
}
