import merge from 'sap/base/util/merge';
import ObjectStorageConnector from 'sap/ui/fl/write/api/connectors/ObjectStorageConnector';
import Layer from 'sap/ui/fl/Layer';
import VersionInfo from 'sap/ui/VersionInfo';

const path = '/preview/api/changes';
interface Change {
    support?: {
        generator?: string;
    };
}

function getFlexSettings(): {
    generator?: string;
    developerMode?: boolean;
    scenario?: string;
} | undefined {
    let result;
    const bootstrapConfig = document.getElementById('sap-ui-bootstrap');
    const flexSetting = bootstrapConfig?.getAttribute('data-open-ux-preview-flex-settings');
    if (flexSetting) {
        result = JSON.parse(flexSetting);
    }
    return result;
}

const connector = merge({}, ObjectStorageConnector, {
    layers: [Layer.VENDOR, Layer.CUSTOMER_BASE],
    storage: {
        _itemsStoredAsObjects: true,
        setItem: function (_key: string, change: Change) {
            const settings = getFlexSettings();
            if (settings) {
                change.support ??= {};
                change.support.generator = settings.generator;
            }

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
