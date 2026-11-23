import { execSync } from 'node:child_process';
import { delimiter, join } from 'node:path';

function hasbinSync(bin) {
    const envPath = process.env.PATH || '';
    const pathDirs = envPath.split(delimiter);
    for (const dir of pathDirs) {
        try {
            const fullPath = join(dir, bin);
            execSync(`test -f "${fullPath}" && test -x "${fullPath}"`, { stdio: 'ignore' });
            return true;
        } catch {
            // continue
        }
    }
    return false;
}

export const sync = hasbinSync;
export default hasbinSync;
