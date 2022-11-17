//Loads and extends the openui5 FileListBaseConnector

const parsedUI5Version = sap.ui.version.split('.');

//For UI5 version >= 1.80, the location of the FileListBaseConnector is different
const connectorPath =
    parseInt(parsedUI5Version[0], 10) >= 1 && parseInt(parsedUI5Version[1], 10) >= 80
        ? 'sap/ui/fl/write/api/connectors/FileListBaseConnector'
        : 'sap/ui/fl/initial/api/connectors/FileListBaseConnector';

sap.ui.define(['sap/base/util/merge', connectorPath], function(merge, FileListBaseConnector) {
    var trustedHosts = [
        /^localhost$/,
        /^((?!-)[A-Za-z0-9-]{1,63}(?<!-)\.)+applicationstudio\.cloud\.sap$/,
        /^((?!-)[A-Za-z0-9-]{1,63}(?<!-)\.)+applicationstudio\.sapcloud\.cn$/,
        /^((?!-)[A-Za-z0-9-]{1,63}(?<!-)\.)+applicationstudio\.vlab-sapcloudplatformdev\.cn$/
    ];
    var url = new URL(window.location.toString());
    var isValidHost = trustedHosts.some((host) => {
        return host.test(url.hostname);
    });
    return merge({}, FileListBaseConnector, {
        getFileList: function() {
            return new Promise(function(resolve, reject) {
                // If no changes found, maybe because the app was executed without doing a build.
                // Check for changes folder and load the changes, if any.
                if (!isValidHost) {
                    reject('cannot load flex changes: invalid host');
                }
                $.ajax({
                    url: url.origin + '/changes/',
                    type: 'GET',
                    cache: false
                })
                    .then(function(sChangesFolderContent) {
                        var regex = /(\/changes\/[^"]*\.[a-zA-Z]*)/g;
                        var result = regex.exec(sChangesFolderContent);
                        var aChanges = [];
                        while (result !== null) {
                            aChanges.push(result[1]);
                            result = regex.exec(sChangesFolderContent);
                        }
                        resolve(aChanges);
                    })
                    .fail(function(obj) {
                        // No changes folder, then just resolve
                        resolve();
                    });
            });
        }
    });
});
