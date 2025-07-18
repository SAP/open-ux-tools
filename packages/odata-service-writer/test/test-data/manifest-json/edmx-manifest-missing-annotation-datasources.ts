export const expectedEdmxManifestMissingAnnotations = {
    'sap.app': {
        id: 'test.update.manifest',
        dataSources: {
            mainService: {
                type: 'OData',
                settings: {
                    annotations: ['annotation']
                }
            },
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
            '': {
                dataSource: 'mainService'
            },
            amodel: {
                dataSource: 'aname',
                preload: true,
                settings: {}
            }
        }
    }
};
