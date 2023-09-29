import merge from 'sap/base/util/merge';
import ObjectStorageConnector from 'sap/ui/fl/write/api/connectors/ObjectStorageConnector';
import Layer from 'sap/ui/fl/Layer';
import VersionInfo from 'sap/ui/VersionInfo';

const path = '/preview/api/changes'; 

const connector = merge({}, ObjectStorageConnector, {
    layers: [Layer.VENDOR, Layer.CUSTOMER_BASE],
    storage: {
        _itemsStoredAsObjects: true,
        setItem: function (_key: string, change: unknown) {
            return fetch(path, {
                method: 'POST',
                body: JSON.stringify(change, null, 2),
                headers: {
                    'content-type': 'application/json'
                }
            });
        },
        removeItem: function (key: string) {
            return fetch(path, {
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
            const response = await fetch(path, {
                method: 'GET',
                headers: {
                    'content-type': 'application/json'
                }
            });
            const changes = await response.json();
            return changes;
        }
    },
    loadFeatures: async function () {
        const features = await ObjectStorageConnector.loadFeatures();

        const ui5Version = (await VersionInfo.load()) as { version: string };
        const [majorVersion, minorVersion] = ui5Version.version.split('.').map((v: string) => parseInt(v, 10));
        features.isVariantAdaptationEnabled = majorVersion >= 1 && minorVersion >= 90;  

        const bootstrapConfig = document.getElementById('sap-ui-bootstrap');
        if (bootstrapConfig) {
            const settings = bootstrapConfig.getAttribute('data-open-ux-preview-flex-settings');
            if (settings && JSON.parse(settings).developerMode) {
                features.isVariantAdaptationEnabled = false;
            }
        }

        return features;
    }
}) as typeof ObjectStorageConnector;

export default connector;
