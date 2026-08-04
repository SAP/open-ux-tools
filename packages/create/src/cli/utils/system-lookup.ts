import prompts from 'prompts';
import type { BackendSystem, BackendSystemKey, Service } from '@sap-ux/store';
import { getLogger } from '../../tracing/index.js';

/**
 * Finds a backend system by URL, with smart matching when client is not specified or doesn't match.
 *
 * Logic:
 * 1. Try exact match (URL + client)
 * 2. If no match, find all systems with the same URL
 * 3. If exactly one system found, use it automatically
 * 4. If multiple systems found, prompt user to select
 * 5. If none found, return undefined
 *
 * @param url - URL of the backend system
 * @param client - optional SAP client
 * @param service - backend system service
 * @param keyConstructor
 * @returns the matched system, or undefined if not found or user cancelled
 */
export async function findSystemByUrl(
    url: string,
    client: string | undefined,
    service: Service<BackendSystem, BackendSystemKey>,
    keyConstructor: new (params: { url: string; client?: string }) => BackendSystemKey
): Promise<BackendSystem | undefined> {
    const logger = getLogger();

    // Normalize URL for comparison (remove trailing slash)
    const normalizedUrl = url.trim().replace(/\/$/, '');

    // Try exact match first
    const exactKey = new keyConstructor({ url: normalizedUrl, client });
    const exactMatch = await service.read(exactKey);
    if (exactMatch) {
        logger.debug(`Found exact match for ${exactKey.getId()}`);
        return exactMatch;
    }

    // No exact match - search all systems with this URL (across all connection types)
    logger.debug(`No exact match for ${exactKey.getId()}, searching by URL only`);
    const allSystems = await service.getAll({});
    const matches = allSystems.filter((s) => {
        const systemUrl = s.url.trim().replace(/\/$/, '');
        return systemUrl === normalizedUrl;
    });

    if (matches.length === 0) {
        logger.debug(`No systems found with URL: ${normalizedUrl}`);
        return undefined;
    }

    if (matches.length === 1) {
        logger.debug(`Found single system with URL ${normalizedUrl}: ${matches[0].name}`);
        return matches[0];
    }

    // Multiple matches - prompt user to select
    return await promptToSelectSystem(matches);
}

/**
 * Prompts the user to select a system from multiple matches.
 *
 * @param systems - list of matching systems
 * @returns the selected system, or undefined if cancelled
 */
async function promptToSelectSystem(systems: BackendSystem[]): Promise<BackendSystem | undefined> {
    const logger = getLogger();

    logger.info(`Multiple systems found with this URL:`);
    systems.forEach((s, index) => {
        const clientInfo = s.client ? ` (client: ${s.client})` : ' (no client)';
        logger.info(`${index + 1}. ${s.name}${clientInfo}`);
    });

    const answer = await prompts({
        type: 'select',
        name: 'index',
        message: 'Which system do you want to use?',
        choices: systems.map((s, index) => ({
            title: `${s.name}${s.client ? ` (client: ${s.client})` : ' (no client)'}`,
            value: index
        })),
        initial: 0
    });

    if (answer.index === undefined) {
        logger.debug('User cancelled system selection');
        return undefined;
    }

    return systems[answer.index];
}
