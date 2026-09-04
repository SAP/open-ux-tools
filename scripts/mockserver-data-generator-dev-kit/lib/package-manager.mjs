import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Detect the application's package manager from its lockfile.
 *
 * @param {string} appRoot application root
 * @returns {{name: 'npm'|'pnpm', lockfile: string|null}}
 */
export function detectPackageManager(appRoot) {
    const npmLock = existsSync(join(appRoot, 'package-lock.json'));
    const pnpmLock = existsSync(join(appRoot, 'pnpm-lock.yaml'));
    if (npmLock && pnpmLock) {
        throw new Error('Multiple lockfiles found; keep exactly one of package-lock.json or pnpm-lock.yaml');
    }
    if (pnpmLock) {
        return { name: 'pnpm', lockfile: 'pnpm-lock.yaml' };
    }
    return { name: 'npm', lockfile: npmLock ? 'package-lock.json' : null };
}

/**
 * Build the package-manager step for installing local development artifacts.
 *
 * @param {{name: 'npm'|'pnpm'}} packageManager detected package manager
 * @param {string[]} packageSpecs local file package specifications
 * @param {string} appRoot application root
 * @param {boolean} [offline] require cached transitive dependencies
 * @returns {{command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv}}
 */
export function createInstallStep(packageManager, packageSpecs, appRoot, offline = false) {
    const args =
        packageManager.name === 'pnpm'
            ? ['add', '--save-dev', ...(offline ? ['--offline'] : []), ...packageSpecs]
            : ['install', '--save-dev', '--no-audit', '--no-fund', ...(offline ? ['--offline'] : []), ...packageSpecs];
    return {
        command: process.platform === 'win32' ? `${packageManager.name}.cmd` : packageManager.name,
        args,
        cwd: appRoot,
        env: { ...process.env, ONNXRUNTIME_NODE_INSTALL: 'skip', ONNXRUNTIME_NODE_INSTALL_CUDA: 'skip' }
    };
}

/**
 * Build a dependency reconciliation step after restoring package files.
 *
 * @param {{name: 'npm'|'pnpm', lockfile: string|null}} packageManager detected package manager
 * @param {string} appRoot application root
 * @returns {{command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv}}
 */
export function createRestoreStep(packageManager, appRoot) {
    const args =
        packageManager.name === 'pnpm'
            ? ['install', ...(packageManager.lockfile ? ['--frozen-lockfile'] : [])]
            : packageManager.lockfile
              ? ['ci', '--no-audit', '--no-fund']
              : ['install', '--no-package-lock', '--no-audit', '--no-fund'];
    return {
        command: process.platform === 'win32' ? `${packageManager.name}.cmd` : packageManager.name,
        args,
        cwd: appRoot,
        env: { ...process.env, ONNXRUNTIME_NODE_INSTALL: 'skip', ONNXRUNTIME_NODE_INSTALL_CUDA: 'skip' }
    };
}

/**
 * Execute a command step and reject on nonzero exit or signal.
 *
 * @param {{command: string, args: string[], cwd: string, env?: NodeJS.ProcessEnv}} step command step
 * @returns {Promise<void>}
 */
export function runCommand(step) {
    return new Promise((resolve, reject) => {
        const child = spawn(step.command, step.args, {
            cwd: step.cwd,
            env: step.env,
            stdio: 'inherit',
            shell: false
        });
        child.once('error', reject);
        child.once('exit', (code, signal) => {
            if (code === 0) {
                resolve();
            } else {
                reject(
                    new Error(
                        `${step.command} failed with ${signal ? `signal ${signal}` : `exit code ${String(code)}`}`
                    )
                );
            }
        });
    });
}
