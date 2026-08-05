import prompts from 'prompts';
import type { BackendSystem, BackendSystemKey, Service } from '@sap-ux/store';
import { BackendSystemKey as BackendSystemKeyClass } from '@sap-ux/store';
import { getLogger } from '../../tracing/index.js';
import { text } from '../../i18n.js';

/**
 * Finds a backend system by URL with smart matching when client is not specified or doesn't match.
 *
 * Logic:
 * 1. Try exact match (URL + client).
 * 2. If no match, find all systems with the same URL (across all connection types).
 * 3. If exactly one system found, use it automatically.
 * 4. If multiple systems found, prompt user to select.
 * 5. If none found, return undefined.
 *
 * @param url - URL of the backend system
 * @param client - optional SAP client
 * @param service - backend system service
 * @returns the matched system, or undefined if not found or user cancelled
 */
export async function findSystemByUrl(
    url: string,
    client: string | undefined,
    service: Service<BackendSystem, BackendSystemKey>
): Promise<BackendSystem | undefined> {
    const logger = getLogger();

    // Normalize URL for comparison (remove trailing slash)
    const normalizedUrl = url.trim().replace(/\/$/, '');

    // Try exact match first
    const exactKey = new BackendSystemKeyClass({ url: normalizedUrl, client });
    const exactMatch = await service.read(exactKey);
    if (exactMatch) {
        logger.debug(`Found exact match for ${exactKey.getId()}`);
        return exactMatch;
    }

    // No exact match - search all systems with this URL (across all connection types)
    // Pass backendSystemFilter with connectionType undefined to bypass the default 'abap_catalog' filter
    logger.debug(`No exact match for ${exactKey.getId()}, searching by URL only`);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const allSystems = await service.getAll({ backendSystemFilter: { connectionType: undefined as any } });
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

    logger.info(text('systemLookup.multipleSystemsFound'));
    systems.forEach((s, index) => {
        const clientInfo = s.client
            ? ` ${text('systemLookup.clientInfo', { client: s.client })}`
            : ` ${text('systemLookup.noClient')}`;
        logger.info(`${index + 1}. ${s.name}${clientInfo}`);
    });

    const answer = await prompts({
        type: 'select',
        name: 'index',
        message: text('systemLookup.selectSystemPrompt'),
        choices: systems.map((s, index) => {
            const clientLabel = s.client
                ? ` ${text('systemLookup.clientInfo', { client: s.client })}`
                : ` ${text('systemLookup.noClient')}`;
            return {
                title: `${s.name}${clientLabel}`,
                value: index
            };
        }),
        initial: 0
    });

    if (answer.index === undefined) {
        logger.debug('User cancelled system selection');
        return undefined;
    }

    return systems[answer.index];
}
