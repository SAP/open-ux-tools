sap.ui.define(
    [
        'sap/base/util/merge',
        'sap/ui/fl/write/api/connectors/ObjectStorageConnector',
        'sap/ui/fl/Layer',
        'sap/base/util/UriParameters'
    ],
    function (merge, ObjectStorageConnector, Layer, UriParameters) {
        'use strict';
        var url = new URL(window.location.toString());
        var uriParameters = UriParameters.fromURL(url.href);
        var rtaMode = uriParameters.get('fiori-tools-rta-mode');
        var generator =
            rtaMode === 'forAdaptation'
                ? 'changeUtils: SAPFioriTools-propertyEditor'
                : 'changeUtils: SAPFioriTools-variants';
        var path = '/preview/api/changes'; 
        var WorkspaceConnector = merge({}, ObjectStorageConnector, {
            layers: [Layer.VENDOR, Layer.CUSTOMER_BASE],
            storage: {
                _itemsStoredAsObjects: true,
                setItem: function (_sKey, vValue) {
                    // update generator
                    if (vValue && vValue.support) {
                        vValue.support.generator = generator;
                    }
                    $.ajax({
                        type: 'POST',
                        url: path,
                        data: JSON.stringify(vValue, null, 2),
                        contentType: 'application/json'
                    });
                },
                removeItem: function (sKey) {
                    $.ajax({
                        type: 'DELETE',
                        url: path,
                        data: JSON.stringify({ fileName: sKey }),
                        contentType: 'application/json'
                    });
                },
                clear: function () {
                    // not implemented
                },
                getItem: function (_sKey) {
                    // not implemented
                },
                getItems: async function () {
                    const changes = await $.ajax({
                        url: path,
                        type: 'GET',
                        cache: false,
                        dataType: 'json'
                    });
                    return changes;
                }
            },
            loadFeatures: function () {
                return ObjectStorageConnector.loadFeatures().then(function (settings) {
                    const [majorVersion, minorVersion] = sap.ui.version.split('.').map((v) => parseInt(v, 10));
                    if (majorVersion >= 1 && minorVersion >= 90) {
                        settings.isVariantAdaptationEnabled = true;
                    }

                    if (rtaMode === 'forAdaptation') {
                        settings.isVariantAdaptationEnabled = false;
                    }
                    return settings;
                });
            }
        });

        return WorkspaceConnector;
    },
    true
);