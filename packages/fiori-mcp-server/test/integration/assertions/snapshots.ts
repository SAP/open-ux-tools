import fs from 'fs';
import { basename, join, dirname } from 'path';

/**
 * The function receives these arguments:
 * @param {string} output — the model output string
 * @param {object} context — extra metadata, like test vars etc.
 * @returns { { pass: boolean, reason?: string } | Promise<{pass, reason}> }
 */
export function customAssert(output: string, context: any) {
    let reason = 'Unknown';
    let pass = false;
    if (
        context.vars.PROJECT_PATH &&
        'config' in context &&
        typeof context.config === 'object' &&
        'file' in context.config &&
        typeof context.config.file === 'string' &&
        'snapshot' in context.config &&
        typeof context.config.snapshot === 'string'
    ) {
        let snapshotFolder = join(__dirname, 'snapshots', context.config.snapshot);
        const relativeFolder = dirname(join(context.config.file));
        if (relativeFolder) {
            snapshotFolder = join(snapshotFolder, relativeFolder);
        }
        // Make sure snapshot folder exists
        if (!fs.existsSync(snapshotFolder)) {
            fs.mkdirSync(snapshotFolder, { recursive: true });
        }
        // Check target file
        const filePath = join(context.vars.PROJECT_PATH, context.config.file);
        if (!fs.existsSync(filePath)) {
            return {
                pass: false,
                score: 0,
                reason: `${filePath} does not exists`
            };
        }
        const fileName = basename(filePath);
        const snapshotFile = join(snapshotFolder, fileName);
        if (!fs.existsSync(snapshotFile)) {
            // Write snapshot
            fs.copyFileSync(filePath, snapshotFile);
            pass = true;
            reason = 'Snapshot file is created';
        } else {
            // validate
            const sourceContent = fs.readFileSync(filePath, 'utf8');
            const snapshotContent = fs.readFileSync(snapshotFile, 'utf8');
            pass = sourceContent === snapshotContent;
            reason = pass ? 'Snapshot file is matching' : 'Snapshot file is not matching';
        }
    }

    return {
        pass,
        score: pass ? 1 : 0,
        reason
    };
}
