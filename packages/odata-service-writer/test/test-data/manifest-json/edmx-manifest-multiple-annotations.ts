export const expectedEdmxManifestMultipleAnnotations = {
    'sap.app': {
        id: 'test.update.manifest',
        dataSources: {
            aname: {
                uri: '/a/path',
                type: 'OData',
                settings: {
                    annotations: ['annotation1', 'annotation2', 'localTest'],
                    odataVersion: '2.0'
                }
            },
            annotation1: {
                uri: `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='annotation1Technical',Version='0001')/$value/`,
                type: 'ODataAnnotation',
                settings: {
                    localUri: 'localService/annotation1Technical.xml'
                }
            },
            annotation2: {
                uri: `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='annotation2Technical',Version='0001')/$value/`,
                type: 'ODataAnnotation',
                settings: {
                    localUri: 'localService/annotation2Technical.xml'
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
            amodel: {
                dataSource: 'aname',
                preload: true,
                settings: {}
            }
        }
    }
};
