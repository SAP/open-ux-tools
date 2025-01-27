import LrepConnector from 'sap/ui/fl/LrepConnector';
import FakeLrepConnector from 'sap/ui/fl/FakeLrepConnector';

import { CHANGES_API_PATH, FlexChange, getFlexSettings } from './common';

interface FetchedChanges {
    [key: string]: FlexChange;
}

interface LoadChangesResult {
    changes: {
        loadModules: boolean;
        changes: FlexChange[];
        settings: {
            [key: string]: string | boolean | undefined;
        };
    };
    componentClassName: string;
    etag: string;
    loadModules: boolean;
    messagebundle: string | undefined;
}

/**
 * Processes an array of FlexChange objects.
 * It updates each change object with settings and sends them to a API endpoint.
 *
 * @param {FlexChange | FlexChange[]} changes - Array of FlexChange objects to be processed.
 * @returns {Promise<void>} A promise that resolves when all changes are processed.
 */
export async function create(changes: FlexChange | FlexChange[]): Promise<void> {
    const settings = getFlexSettings();
    await Promise.all(
        (Array.isArray(changes) ? changes : [changes]).map((change) => {
            if (settings) {
                change.support ??= {};
                change.support.generator = settings.generator;
            }

            if (typeof FakeLrepConnector.fileChangeRequestNotifier === 'function' && change.fileName) {
                try {
                    FakeLrepConnector.fileChangeRequestNotifier(change.fileName, 'create', change);
                } catch (e) {
                    // exceptions in the listener call are ignored
                }
            }

            return fetch(CHANGES_API_PATH, {
                method: 'POST',
                body: JSON.stringify(change, null, 2),
                headers: {
                    'content-type': 'application/json'
                }
            });
        })
    );
}

/**
 * Loads changes from a given path and processes them using an LrepConnector instance.
 * The changes are then formatted and returned in a specified structure.
 *
 * @returns {Promise<LoadChangesResult>} A promise that resolves to an object of type LoadChangesResult.
 */
export async function loadChanges(...args: []): Promise<LoadChangesResult> {
    const lrep = new LrepConnector();

    const response = await fetch(CHANGES_API_PATH, {
        method: 'GET',
        headers: {
            'content-type': 'application/json'
        }
    });
    const changes = (await response.json()) as FetchedChanges;

    return LrepConnector.prototype.loadChanges.apply(lrep, args).then((res: LoadChangesResult) => {
        res.changes.changes = Object.values(changes);
        return res;
    });
}

/**
 * Configures and enables the FakeLrepConnector based on the SAP UI5 version.
 * If the minor version of the SAP UI5 is less than 72, this function extends
 * the FakeLrepConnector's prototype with specific methods and enables the fake connector.
 *
 * Assumes the existence of a global 'sap' object with a 'ui.version' property,
 * and global jQuery object with 'extend' method.
 *
 * @returns {void}
 */
export default function (): void {
    jQuery.extend(FakeLrepConnector.prototype, {
        create,
        loadChanges,
        loadSettings: () => Promise.resolve()
    });
    FakeLrepConnector.enableFakeConnector();
}
