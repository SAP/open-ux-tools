sap.ui.define(
    ['sap/base/util/merge', 'sap/ui/fl/write/api/connectors/ObjectStorageConnector', 'sap/ui/fl/Layer'],
    function(merge, ObjectStorageConnector, Layer) {
        'use strict';
        var url = new URL(window.location.toString());
        var trustedHosts = [/^localhost$/, /^.*.applicationstudio.cloud.sap$/];
        var isValidHost = trustedHosts.some((host) => {
            return host.test(url.hostname);
        });

        var WorkspaceConnector = merge({}, ObjectStorageConnector, {
            layers: [Layer.VENDOR],
            storage: {
                _itemsStoredAsObjects: true,
                setItem: function(sKey, vValue) {
                    if (isValidHost) {
                        $.ajax({
                            type: 'POST',
                            url: url.origin + '/FioriTools/api/writeChanges',
                            data: JSON.stringify(vValue, null, 2),
                            contentType: 'application/json'
                        });
                    } else {
                        console.error('cannot save flex changes: invalid host');
                    }
                },
                removeItem: function(sKey) {
                    if (isValidHost) {
                        $.ajax({
                            type: 'DELETE',
                            url: url.origin + '/FioriTools/api/removeChanges',
                            data: JSON.stringify({ fileName: sKey }),
                            contentType: 'application/json'
                        });
                    } else {
                        console.error('cannot delete flex changes: invalid host');
                    }
                },
                clear: function() {
                    // not implemented
                },
                getItem: function(sKey) {
                    // not implemented
                },
                getItems: async function() {
                    if (isValidHost) {
                        const changes = await $.ajax({
                            url: url.origin + '/FioriTools/api/getChanges',
                            type: 'GET',
                            cache: false,
                            dataType: 'json'
                        });
                        return changes;
                    } else {
                        console.error('cannot load flex changes: invalid host');
                        return [];
                    }
                }
            },
            loadFeatures: function() {
                return ObjectStorageConnector.loadFeatures().then(function(settings) {
                    return settings;
                });
            }
        });

        return WorkspaceConnector;
    },
    true
);
