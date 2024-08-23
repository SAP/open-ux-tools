export const expectedCdsManifest = {
    'sap.app': {
        id: 'test.update.manifest',
        dataSources: {
            aname: {
                uri: '/a/path',
                type: 'OData',
                settings: {
                    annotations: [],
                    odataVersion: '2.0'
                }
            }
        }
    },
    'sap.ui5': {
        models: {
            amodel: {
                dataSource: 'aname',
                preload: true,
                settings: {}
            }
        }
    }
};
