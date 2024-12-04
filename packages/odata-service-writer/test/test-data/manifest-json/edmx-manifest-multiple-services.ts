export const expectedEdmxManifestMultipleServices = {
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
                    annotations: ['annotation1', 'localTest'],
                    odataVersion: '2.0'
                }
            },
            annotation1: {
                uri: "/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='annotation1Technical',Version='0001')/$value/",
                type: 'ODataAnnotation',
                settings: {
                    localUri: 'localService/aname/annotation1Technical.xml'
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
