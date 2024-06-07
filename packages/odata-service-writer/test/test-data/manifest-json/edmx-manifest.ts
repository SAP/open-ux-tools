export const expectedEdmxManifest = {
    'sap.app': {
        id: 'test.update.manifest',
        dataSources: {
            aname: {
                uri: '/a/path',
                type: 'OData',
                settings: {
                    annotations: ['test', 'test'],
                    odataVersion: '2.0'
                }
            },
            test: {
                type: 'ODataAnnotation',
                uri: 'annotations/test.xml',
                settings: {
                    localUri: 'annotations/test.xml'
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
