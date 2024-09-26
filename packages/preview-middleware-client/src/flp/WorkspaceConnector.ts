import merge from 'sap/base/util/merge';
import ObjectStorageConnector from 'sap/ui/fl/write/api/connectors/ObjectStorageConnector';
import Layer from 'sap/ui/fl/Layer';
import { CHANGES_API_PATH, FlexChange, getFlexSettings } from './common';
import { getUi5Version, isLowerThanMinimalUi5Version } from '../utils/version';

const connector = merge({}, ObjectStorageConnector, {
    layers: [Layer.VENDOR, Layer.CUSTOMER_BASE],
    storage: {
        _itemsStoredAsObjects: true,
        fileChangeRequestNotifier: undefined,
        setItem: function (_key: string, change: FlexChange) {
            const settings = getFlexSettings();
            if (settings) {
                change.support ??= {};
                change.support.generator = settings.generator;
            }

            if (typeof this.fileChangeRequestNotifier === 'function' && change.fileName) {
                try {
                    this.fileChangeRequestNotifier(change.fileName, 'create', change);
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
        getItem: function (_key: string) {
            // not implemented
        },
        getItems: async function () {
            const response = await fetch(CHANGES_API_PATH, {
                method: 'GET',
                headers: {
                    'content-type': 'application/json'
                }
            });
            const changes = await response.json() as unknown as FlexChange[];
            return changes;
        }
    } as typeof ObjectStorageConnector.storage,
    loadFeatures: async function () {
        const features = await ObjectStorageConnector.loadFeatures();
        features.isVariantAdaptationEnabled = !isLowerThanMinimalUi5Version(await getUi5Version(), {
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

export default connector;
