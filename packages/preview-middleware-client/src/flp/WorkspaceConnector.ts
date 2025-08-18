import merge from 'sap/base/util/merge';
import type ObjectStorageConnector from 'sap/ui/fl/write/api/connectors/ObjectStorageConnector';
import type ObjectStorageConnector176 from 'sap/ui/fl/apply/_internal/connectors/ObjectStorageConnector';
import Layer from 'sap/ui/fl/Layer';
import { CHANGES_API_PATH, FlexChange, getFlexSettings } from './common';
import { getUi5Version, isLowerThanMinimalUi5Version } from '../utils/version';
import { getAdditionalChangeInfo } from '../utils/additional-change-info';

// Use a Promise to hold the initialized connector
const connectorPromise: Promise<typeof ObjectStorageConnector | typeof ObjectStorageConnector176> = (async () => {
    let ObjectStorageConnectorInstance: typeof ObjectStorageConnector | typeof ObjectStorageConnector176;
    let storagePropertyName = 'storage';

    const ui5Version = await getUi5Version();

    // Dynamically import the ObjectStorageConnector based on the UI5 version.
    if (ui5Version.major === 1 && ui5Version.minor === 76) {
        ObjectStorageConnectorInstance = (await import('sap/ui/fl/apply/_internal/connectors/ObjectStorageConnector')).default;
        storagePropertyName = 'oStorage';
    } else {
        ObjectStorageConnectorInstance = (await import('sap/ui/fl/write/api/connectors/ObjectStorageConnector')).default;
    }

    return merge({}, ObjectStorageConnectorInstance, {
        layers: [Layer.VENDOR, Layer.CUSTOMER_BASE],
        [storagePropertyName]: {
            _itemsStoredAsObjects: true,
            fileChangeRequestNotifier: undefined,
            setItem: function (key: string, change: FlexChange) {
                const settings = getFlexSettings();
                if (settings) {
                    change.support ??= {};
                    change.support.generator = settings.generator;
                }

                const additionalChangeInfo = getAdditionalChangeInfo(change);

                if (typeof this.fileChangeRequestNotifier === 'function' && change.fileName) {
                    try {
                        this.fileChangeRequestNotifier(change.fileName, 'create', change, additionalChangeInfo);
                    } catch (e) {
                        // exceptions in the listener call are ignored
                    }
                }

                const body = {
                    change,
                    additionalChangeInfo
                };

                return fetch(CHANGES_API_PATH, {
                    method: 'POST',
                    body: JSON.stringify(body, null, 2),
                    headers: {
                        'content-type': 'application/json'
                    }
                });
            },
            removeItem: function (key: string) {
                if (typeof this.fileChangeRequestNotifier === 'function') {
                    try {
                        this.fileChangeRequestNotifier(key, 'delete');
                    } catch (e) {
                        // exceptions in the listener call are ignored
                    }
                }

                return fetch(CHANGES_API_PATH, {
                    method: 'DELETE',
                    body: JSON.stringify({ fileName: key }),
                    headers: {
                        'content-type': 'application/json'
                    }
                });
            },
            clear: function () {
                // not implemented
            },
            getItem: function () {
                // not implemented
            },
            getItems: async function () {
                const response = await fetch(CHANGES_API_PATH, {
                    method: 'GET',
                    headers: {
                        'content-type': 'application/json'
                    }
                });
                return (await response.json()) as unknown as FlexChange[];
            }
        } as typeof ObjectStorageConnector.storage,
        loadFeatures: async function () {
            const features = await ObjectStorageConnectorInstance.loadFeatures();
            features.isVariantAdaptationEnabled = !isLowerThanMinimalUi5Version(ui5Version, {
                major: 1,
                minor: 90
            });
            const settings = getFlexSettings();
            if (settings?.developerMode) {
                features.isVariantAdaptationEnabled = false;
            }

            if (settings?.scenario === 'ADAPTATION_PROJECT') {
                features.isVariantAdaptationEnabled = true;
            }

            return features;
        }
    }) as typeof ObjectStorageConnector;
})();

/**
 * A Promise that resolves to the initialized ObjectStorageConnector instance.
 */
export default connectorPromise;