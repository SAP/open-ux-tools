import type { AbapServiceProvider, FlexVersion, KeyUserChangeContent } from '@sap-ux/axios-extension';
import { getConfiguredProvider } from '@sap-ux/adp-tooling';
import type { ToolsLogger } from '@sap-ux/logger';

import { logger } from '../../utils/logger.js';

const DEFAULT_ADAPTATION_ID = 'DEFAULT';

/**
 * Options for {@link fetchKeyUserChanges}. The same `system`/credentials supplied
 * to the adaptation project generator are reused to query LREP.
 */
export interface FetchKeyUserChangesOptions {
    system: string;
    application: string;
    client?: string;
    username?: string;
    password?: string;
    logger?: ToolsLogger;
}

/**
 * Picks the active flex version. The LREP response lists the draft (`versionId === '0'`)
 * first when one exists; in that case the second entry is the active version. Mirrors
 * the behaviour of `@sap-ux/generator-adp`'s `determineFlexVersion`.
 *
 * @param flexVersions - Flex versions returned by LREP, in priority order.
 * @returns The version id to use, or `undefined` when no usable version exists.
 */
function determineFlexVersion(flexVersions: FlexVersion[]): string | undefined {
    if (!flexVersions?.length) {
        return undefined;
    }
    if (flexVersions[0]?.versionId === '0') {
        return flexVersions[1]?.versionId;
    }
    return flexVersions[0]?.versionId;
}

/**
 * Fetches the DEFAULT adaptation's key user changes from LREP for the given application,
 * reusing the same system and credentials provided to the adaptation project generator.
 *
 * The flow mirrors the interactive `KeyUserImportPrompter` in `@sap-ux/generator-adp`:
 * authenticate the ABAP provider, resolve the active flex version, list adaptations,
 * locate the DEFAULT adaptation and download its key user changes.
 *
 * Errors propagate (strict-abort): callers should treat any rejection as a reason to
 * abort the surrounding adaptation project generation.
 *
 * @param options - System, application id and optional credentials.
 * @returns The key user changes attached to the DEFAULT adaptation. May be empty.
 * @throws If the LREP API is unsupported, authentication fails, or no DEFAULT adaptation exists.
 */
export async function fetchKeyUserChanges(options: FetchKeyUserChangesOptions): Promise<KeyUserChangeContent[]> {
    const { system, application, client, username, password, logger: providedLogger } = options;
    const log = providedLogger ?? logger;

    const provider: AbapServiceProvider = await getConfiguredProvider({ system, client, username, password }, log);

    // Ensures auth is performed up-front for Cloud Ready systems before subsequent calls.
    await provider.isAbapCloud();

    const lrep = provider.getLayeredRepository();

    const flexVersionsResponse = await lrep.getFlexVersions(application);
    const activeVersion = determineFlexVersion(flexVersionsResponse?.versions ?? []);

    const adaptationsResponse = await lrep.listAdaptations(application, activeVersion);
    const adaptations = adaptationsResponse?.adaptations ?? [];

    if (!adaptations.length) {
        throw new Error(`No adaptations found for application '${application}' on system '${system}'.`);
    }

    const defaultAdaptation = adaptations.find((a) => a.id === DEFAULT_ADAPTATION_ID);
    if (!defaultAdaptation) {
        const available = adaptations.map((a) => a.id).join(', ');
        throw new Error(
            `No DEFAULT adaptation found for application '${application}'. Available adaptations: ${available}.`
        );
    }

    const keyUserDataResponse = await lrep.getKeyUserData(application, DEFAULT_ADAPTATION_ID);
    const contents = keyUserDataResponse?.contents ?? [];

    log.info(
        `Fetched ${contents.length} key user change(s) for DEFAULT adaptation of '${application}' on '${system}'.`
    );

    return contents;
}
