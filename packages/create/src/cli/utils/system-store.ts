import type { BackendSystem, BackendSystemKey } from '@sap-ux/store';
import { getService } from '@sap-ux/store';
import { NullTransport, ToolsLogger } from '@sap-ux/logger';
import { getLogger } from '../../tracing/index.js';

/**
 * Create a store service for BackendSystem entities.
 * When `silentForJson` is true, uses a NullTransport logger so that store
 * diagnostic messages do not appear on stdout before a JSON payload.
 *
 * @param silentForJson - suppress store log output when true
 * @returns configured store service
 */
export function getSystemService(silentForJson: boolean) {
    const logger = getLogger();
    const storeLogger = silentForJson ? new ToolsLogger({ transports: [new NullTransport()] }) : logger;
    return getService<BackendSystem, BackendSystemKey>({
        entityName: 'system',
        logger: storeLogger
    });
}

/**
 * Returns a view of a BackendSystem with only non-sensitive fields.
 *
 * @param system - the backend system
 * @returns non-sensitive system data
 */
export function toPublicView(system: BackendSystem): Record<string, unknown> {
    return {
        name: system.name,
        url: system.url,
        client: system.client,
        systemType: system.systemType,
        authenticationType: system.authenticationType,
        connectionType: system.connectionType,
        userDisplayName: system.userDisplayName,
        hasSensitiveData: system.hasSensitiveData
    };
}
