export const expectedEdmxManifestOlderServices = {
    'sap.app': {
        id: 'test.update.manifest',
        dataSources: {
            mainService: {
                type: 'OData',
                settings: {
                    annotations: ['SEPMRA_OVW_ANNO_MDL']
                }
            },
            SEPMRA_OVW_ANNO_MDL: {
                type: 'ODataAnnotation',
                settings: {
                    localUri: 'localService/mainService/SEPMRA_OVW_ANNO_MDL.xml'
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
