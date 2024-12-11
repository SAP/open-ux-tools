export const expectedEdmxManifestLocalAnnotations = {
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
                    annotations: ['localTest0', 'localTest1'],
                    odataVersion: '2.0'
                }
            },
            localTest0: {
                uri: 'annotations/localTest0.xml',
                type: 'ODataAnnotation',
                settings: {
                    localUri: 'annotations/localTest0.xml'
                }
            },
            localTest1: {
                uri: 'annotations/localTest1.xml',
                type: 'ODataAnnotation',
                settings: {
                    localUri: 'annotations/localTest1.xml'
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
