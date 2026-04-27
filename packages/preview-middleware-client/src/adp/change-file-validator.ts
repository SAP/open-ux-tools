import log from 'sap/base/Log';
import { MessageBarType } from '@sap-ux-private/control-property-editor-common';

import { sendInfoCenterMessage } from '../utils/info-center-message';

interface ChangeContent {
    fragmentPath?: string;
    codeRef?: string;
}

interface Change {
    changeType: string;
    fileName: string;
    fileType?: string;
    reference: string;
    moduleName?: string;
    content?: ChangeContent;
}

interface OrphanedChangeEntry {
    changeFileName: string;
    filePath: string;
    changeType: 'addXML' | 'codeExt';
}

/**
 * Builds a lookup map from module name patterns to change metadata
 * for addXML and codeExt changes.
 *
 * @param changes record of change objects keyed by flex key
 * @returns map from module name substring to orphaned change entry
 */
function buildModuleNameMap(changes: Record<string, Change>): Map<string, OrphanedChangeEntry> {
    const map = new Map<string, OrphanedChangeEntry>();

    for (const change of Object.values(changes)) {
        const prefix = change.reference?.replace(/\./g, '/');
        if (!prefix) {
            continue;
        }

        if (change.changeType === 'addXML' && change.content?.fragmentPath) {
            const fragmentPath = change.content.fragmentPath;
            const moduleName = change.moduleName ?? `${prefix}/changes/${fragmentPath}`;
            const changeFileName = `${change.fileName}.${change.fileType ?? 'change'}`;
            map.set(moduleName, { changeFileName, filePath: fragmentPath, changeType: 'addXML' });
        }

        if (change.changeType === 'codeExt' && change.content?.codeRef) {
            const codeRef = change.content.codeRef;
            const moduleName = change.moduleName ?? `${prefix}/changes/${codeRef}`;
            const changeFileName = `${change.fileName}.${change.fileType ?? 'change'}`;
            map.set(moduleName, { changeFileName, filePath: codeRef, changeType: 'codeExt' });
        }
    }

    return map;
}

/**
 * Creates an error handler that matches error messages against known module names
 * and sends InfoCenter errors for orphaned change files.
 *
 * @param moduleNameMap map from module name substring to orphaned change entry
 * @returns error handler function
 */
function createErrorHandler(
    moduleNameMap: Map<string, OrphanedChangeEntry>,
    restoreConsole: () => void
): (message: string) => void {
    return (message: string) => {
        for (const [moduleName, entry] of moduleNameMap) {
            if (message.includes(moduleName)) {
                moduleNameMap.delete(moduleName);
                sendInfoCenterMessage({
                    title: { key: 'ADP_ORPHANED_CHANGE_ERROR_TITLE' },
                    description: {
                        key: 'ADP_ORPHANED_FILE_DESCRIPTION',
                        params: [entry.filePath, entry.changeFileName]
                    },
                    type: MessageBarType.error
                }).catch((error) => {
                    log.error('Failed to send orphaned change InfoCenter message', error);
                });
                if (moduleNameMap.size === 0) {
                    restoreConsole();
                }
                break;
            }
        }
    };
}

/**
 * Initializes orphaned change file detection.
 *
 * Fetches loaded flex changes, builds a lookup map of module names for addXML and codeExt changes,
 * and wraps console.error to intercept UI5 flex change application errors. When UI5 fails to load
 * a fragment or controller extension referenced by a change file, the error is intercepted and an
 * actionable message is shown in the InfoCenter advising the user to delete the orphaned change file.
 */
export async function initOrphanedChangeDetection(): Promise<void> {
    const baseUrl = document.getElementById('sap-ui-bootstrap')?.dataset.openUxPreviewBaseUrl ?? '';
    const response = await fetch(`${baseUrl}/preview/api/changes`, {
        method: 'GET',
        headers: { 'content-type': 'application/json' }
    });

    if (!response.ok) {
        log.error(`Failed to fetch changes for orphaned change detection: ${response.status}`);
        return;
    }

    const changes = (await response.json()) as Record<string, Change>;
    const moduleNameMap = buildModuleNameMap(changes);

    if (moduleNameMap.size === 0) {
        return;
    }

    const consoleRef = globalThis.console;
    const originalConsoleError = consoleRef.error;

    const handler = createErrorHandler(moduleNameMap, () => {
        consoleRef.error = originalConsoleError;
    });

    consoleRef.error = (...args: unknown[]) => {
        originalConsoleError.apply(consoleRef, args);
        const message = args.map((arg) => (typeof arg === 'string' ? arg : '')).join(' ');
        handler(message);
    };
}
