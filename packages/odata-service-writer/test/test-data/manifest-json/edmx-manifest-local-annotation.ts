export const expectedEdmxManifestLocalAnnotation = {
    'sap.app': {
        id: 'test.update.manifest',
        dataSources: {
            mainService: {
                type: 'OData'
            },
            aname: {
                uri: '/a/path',
                type: 'OData',
                settings: {
                    annotations: ['localTest'],
                    odataVersion: '2.0'
                }
            },
            localTest: {
                type: 'ODataAnnotation',
                uri: 'annotations/localTest.xml',
                settings: {
                    localUri: 'annotations/localTest.xml'
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
