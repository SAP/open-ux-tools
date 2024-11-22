import { join } from 'path';
import { homedir } from 'os';
import { existsSync, readFileSync } from 'fs';
import { type Logger } from '@sap-ux/logger';

/**
 * Reads the systems.json file from the user's .fioritools directory and extracts the accounts.
 * @param log - Logger instance for logging warnings and errors.
 * @returns An array of account keys or an empty array if the file doesn't exist or is invalid.
 */
export function getAccountsFromSystemsFile(log: Logger): string[] {
    const systemsFilePath = join(homedir(), '.fioritools', 'systems.json');

    try {
        // Check if the systems file exists
        if (!existsSync(systemsFilePath)) {
            log.warn(`Systems file not found at path: ${systemsFilePath}`);
            return [];
        }

        // Read and parse the systems.json file
        const systemsFileContent = readFileSync(systemsFilePath, 'utf-8');
        const systemsData = JSON.parse(systemsFileContent);

        // Extract and return the account keys
        return Object.keys(systemsData?.systems || {});
    } catch (error) {
        log.error(`Error reading or parsing systems file at path: ${systemsFilePath}`);
        log.error(error.message);
        return [];
    }
}
