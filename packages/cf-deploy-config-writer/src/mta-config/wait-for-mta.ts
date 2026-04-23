import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Mta } from '@sap/mta-lib';
import { FileName } from '@sap-ux/project-access';
import { t } from '../i18n';

export interface WaitForMtaOptions {
    /** Maximum time to wait in milliseconds. Default: 5000 */
    maxWaitMs?: number;
    /** Polling interval in milliseconds. Default: 100 */
    pollIntervalMs?: number;
}

/**
 * Waits until mta.yaml exists on disk and is readable by mta-lib.
 * Replaces hardcoded setTimeout delays used to work around mta-lib requiring
 * files to be fully written before they can be read.
 *
 * @param mtaPath Directory containing (or that will contain) mta.yaml
 * @param options Polling configuration
 * @throws {Error} If the file is not ready within maxWaitMs
 */
export async function waitForMtaFile(mtaPath: string, options: WaitForMtaOptions = {}): Promise<void> {
    const { maxWaitMs = 5000, pollIntervalMs = 100 } = options;
    const mtaFilePath = join(mtaPath, FileName.MtaYaml);
    const deadline = Date.now() + maxWaitMs;

    while (Date.now() < deadline) {
        if (existsSync(mtaFilePath)) {
            try {
                const mta = new Mta(mtaPath, false);
                const id = await mta.getMtaID();
                if (id) {
                    return;
                }
            } catch {
                // File exists but not yet parseable — keep polling
            }
        }
        await new Promise<void>((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(t('error.mtaFileNotReady', { mtaPath }));
}
