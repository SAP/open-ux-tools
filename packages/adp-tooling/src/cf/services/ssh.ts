import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { ToolsLogger } from '@sap-ux/logger';

import { checkAppExists, pushApp, enableSsh, restartApp } from './cli';

/**
 * Default CF app name used for SSH tunneling to the connectivity proxy.
 */
export const DEFAULT_TUNNEL_APP_NAME = 'adp-ssh-tunnel-app';

/**
 * Ensure a tunnel app exists in CF. If not found, deploy a minimal no-route app
 * using the binary_buildpack with minimum memory so it can serve as an SSH target.
 *
 * @param appName - CF app name.
 * @param logger - Logger instance.
 */
export async function ensureTunnelAppExists(appName: string, logger: ToolsLogger): Promise<void> {
    if (await checkAppExists(appName)) {
        logger.info(`Tunnel app "${appName}" already exists.`);
        return;
    }

    logger.debug(`Tunnel app "${appName}" not found. Deploying minimal app...`);

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adp-tunnel-'));
    fs.writeFileSync(path.join(tmpDir, '.keep'), '');

    try {
        await pushApp(appName, tmpDir, [
            '--no-route',
            '-m',
            '64M',
            '-k',
            '256M',
            '-b',
            'binary_buildpack',
            '-c',
            'sleep infinity',
            '--health-check-type',
            'process'
        ]);
        logger.info(`Tunnel app "${appName}" deployed successfully.`);
    } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
}

/**
 * Enable SSH on a CF app and restart it.
 *
 * @param appName - CF app name.
 * @param logger - Logger instance.
 */
export async function enableSshAndRestart(appName: string, logger: ToolsLogger): Promise<void> {
    logger.info(`Enabling SSH on "${appName}"...`);
    await enableSsh(appName);

    logger.info(`Restarting "${appName}"...`);
    await restartApp(appName);
}
