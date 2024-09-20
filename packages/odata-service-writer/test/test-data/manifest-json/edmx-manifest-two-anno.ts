export const expectedEdmxManifestTwoAnno = {
    'sap.app': {
        id: 'test.update.manifest',
        dataSources: {
            aname: {
                uri: '/a/path',
                type: 'OData',
                settings: {
                    annotations: ['test', 'test2', 'testlocal'],
                    odataVersion: '2.0'
                }
            },
            test: {
                type: 'ODataAnnotation',
                uri: `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='test',Version='0001')/$value/`,
                settings: {
                    localUri: 'localService/test.xml'
                }
            },
            test2: {
                type: 'ODataAnnotation',
                uri: `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='test2',Version='0001')/$value/`,
                settings: {
                    localUri: 'localService/test2.xml'
                }
            },
            testlocal: {
                type: 'ODataAnnotation',
                uri: 'annotations/testlocal.xml',
                settings: {
                    localUri: 'annotations/testlocal.xml'
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
