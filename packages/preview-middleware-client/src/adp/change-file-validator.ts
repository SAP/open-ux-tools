import log from 'sap/base/Log';
import { MessageBarType } from '@sap-ux-private/control-property-editor-common';

import { sendInfoCenterMessage } from '../utils/info-center-message';

const CHANGE_TYPE = {
    addXML: 'addXML',
    codeExt: 'codeExt'
};

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

interface RelevantChange extends Change {
    changeType: (typeof CHANGE_TYPE)[keyof typeof CHANGE_TYPE];
    reference: string;
}

/**
 * Type guard for changes that reference a fragment or controller extension file.
 *
 * @param change flex change object
 * @returns true if the change is an addXML with fragmentPath or a codeExt with codeRef
 */
function isFragmentOrCodeExtChange(change: Change): change is RelevantChange {
    return (
        !!change.reference &&
        ((change.changeType === CHANGE_TYPE.addXML && !!change.content?.fragmentPath) ||
            (change.changeType === CHANGE_TYPE.codeExt && !!change.content?.codeRef))
    );
}

/**
 * Builds the set of module name patterns to watch for in error messages,
 * derived from addXML and codeExt changes.
 *
 * @param changes record of change objects keyed by flex key
 * @returns set of module name substrings identifying orphaned-change error messages
 */
function buildModuleNameSet(changes: Record<string, Change>): Set<string> {
    const moduleNames = new Set<string>();

    for (const change of Object.values(changes)) {
        if (!isFragmentOrCodeExtChange(change)) {
            continue;
        }

        const prefix = change.reference.replaceAll('.', '/');
        const path =
            change.changeType === CHANGE_TYPE.addXML
                ? change.content?.fragmentPath ?? ''
                : change.content?.codeRef ?? '';
        moduleNames.add(change.moduleName || `${prefix}/changes/${path}`);
    }

    return moduleNames;
}

/**
 * UI5's `sap/base/Log` prefixes every message with a timestamp
 * (`YYYY-MM-DD HH:MM:SS.mmmmmm `). Strip it so the InfoCenter shows just the error text.
 */
const UI5_LOG_TIMESTAMP = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+\s+/;

/**
 * Creates an error handler that matches error messages against known module names
 * and forwards the original browser error to the InfoCenter.
 *
 * @param moduleNames set of module name substrings to watch for
 * @param onAllMatched callback invoked once every watched module name has been matched
 * @returns error handler function
 */
function createErrorHandler(
    moduleNames: Set<string>,
    onAllMatched: () => void
): (message: string) => void {
    return (message: string) => {
        for (const moduleName of moduleNames) {
            if (message.includes(moduleName)) {
                sendInfoCenterMessage({
                    title: { key: 'ADP_CHANGE_ERROR_TITLE' },
                    description: message.replace(UI5_LOG_TIMESTAMP, ''),
                    type: MessageBarType.error
                }).catch((error) => {
                    log.error('Failed to send orphaned change InfoCenter message', error);
                });
                moduleNames.delete(moduleName);
                if (moduleNames.size === 0) {
                    onAllMatched();
                }
                break;
            }
        }
    };
}

/**
 * Initializes orphaned change file detection.
 *
 * Wraps `console.error` synchronously so early errors (emitted during app bootstrap, before
 * the changes list has been fetched) are captured in a buffer. Once the changes are loaded,
 * the buffered messages are replayed against the set of module names derived from addXML and
 * codeExt changes. Subsequent errors are matched live. When UI5 fails to load a fragment or
 * controller extension referenced by a change file, the original error is forwarded to the
 * InfoCenter so the user sees the exact browser message.
 *
 * @returns a cancel function — call it to stop detection and immediately restore console.error.
 */
export function initOrphanedChangeDetection(): () => void {
    const consoleRef = globalThis.console;
    const originalConsoleError = consoleRef.error;

    const BUFFER_LIMIT = 200;
    const buffer: string[] = [];
    let moduleNames: Set<string> | undefined;
    let handler: ((message: string) => void) | undefined;
    let cancelled = false;

    const restore = (): void => {
        consoleRef.error = originalConsoleError;
    };

    const cancel = (): void => {
        cancelled = true;
        restore();
        clearTimeout(safetyTimeout);
    };

    const safetyTimeout = setTimeout(cancel, 60_000);

    consoleRef.error = (...args: unknown[]) => {
        originalConsoleError.apply(consoleRef, args);
        if (cancelled) {
            return;
        }
        const message = args.filter((arg): arg is string => typeof arg === 'string').join('');
        if (handler) {
            handler(message);
            if (moduleNames && moduleNames.size === 0) {
                clearTimeout(safetyTimeout);
            }
        } else if (buffer.length < BUFFER_LIMIT) {
            buffer.push(message);
        }
    };

    void loadModuleNamesAndReplay();

    async function loadModuleNamesAndReplay(): Promise<void> {
        try {
            const baseUrl = document.getElementById('sap-ui-bootstrap')?.dataset.openUxPreviewBaseUrl ?? '';
            const response = await fetch(`${baseUrl}/preview/api/changes`, {
                method: 'GET',
                headers: { 'content-type': 'application/json' }
            });

            if (cancelled) {
                return;
            }

            if (!response.ok) {
                log.error(`Failed to fetch changes for orphaned change detection: ${response.status}`);
                cancel();
                return;
            }

            const changes = (await response.json()) as Record<string, Change>;

            if (cancelled) {
                return;
            }

            moduleNames = buildModuleNameSet(changes);

            if (moduleNames.size === 0) {
                cancel();
                return;
            }

            handler = createErrorHandler(moduleNames, cancel);

            // Replay any errors emitted before the changes list was loaded.
            for (const message of buffer) {
                handler(message);
                if (moduleNames.size === 0) {
                    break;
                }
            }
            buffer.length = 0;
        } catch (error) {
            log.error('Failed to run orphaned change detection', error as Error);
            cancel();
        }
    }

    return cancel;
}
