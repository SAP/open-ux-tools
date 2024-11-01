import type { Manifest } from '@sap-ux/project-access';
import { getMainServiceDataSource, getODataSources, getMockserverAnnotationConfig } from '../../src/app-info';

describe('Tests for getMainServiceDataSource()', () => {
    test('Empty manifest.json, should return undefined', () => {
        expect(getMainServiceDataSource({} as Manifest)).toBeUndefined();
    });

    test('Get main service from OVP like app', () => {
        const manifestJson = {
            'sap.ovp': {
                globalFilterModel: 'mainModel'
            },
            'sap.ui5': {
                models: {
                    'mainModel': {
                        dataSource: 'mainDataSource'
                    }
                }
            },
            'sap.app': {
                dataSources: {
                    mainDataSource: {
                        uri: 'dummy/uri'
                    }
                }
            }
        } as unknown as Manifest;
        expect(getMainServiceDataSource(manifestJson)).toEqual({ uri: 'dummy/uri' });
    });

    test('Get main service from OVP like app, but dataSources missing', () => {
        const manifestJson = {
            'sap.ovp': {
                globalFilterModel: 'mainModel'
            },
            'sap.ui5': {
                models: {
                    'mainModel': {
                        dataSource: 'mainDataSource'
                    }
                }
            },
            'sap.app': {}
        } as unknown as Manifest;
        expect(getMainServiceDataSource(manifestJson)).toBeUndefined();
    });

    test('Get main service', () => {
        const manifestJson = {
            'sap.ui5': {
                models: {
                    '': {
                        dataSource: 'ds'
                    }
                }
            },
            'sap.app': {
                dataSources: {
                    ds: {
                        uri: 'ds/uri/'
                    }
                }
            }
        } as unknown as Manifest;
        expect(getMainServiceDataSource(manifestJson)).toEqual({ uri: 'ds/uri/' });
    });
});

describe('Tests for getODataSources()', () => {
    test('Get list of OData Sources', () => {
        expect(getODataSources({} as Manifest)).toEqual({});
    });

    test('Get list of OData Sources', () => {
        const manifestJson = {
            'sap.app': {
                'dataSources': {
                    'v2': {
                        'uri': '/v2/service/path/',
                        'type': 'OData',
                        'settings': {
                            'odataVersion': '2.0'
                        }
                    },
                    'v4': {
                        'uri': '/v4/service/path/',
                        'type': 'OData',
                        'settings': {
                            'odataVersion': '4.0'
                        }
                    },
                    'nonOdataService': {
                        'uri': '/non/odata/service/',
                        'type': 'NonOdata'
                    }
                }
            }
        } as unknown as Manifest;
        expect(getODataSources(manifestJson)).toEqual({
            'v2': {
                'uri': '/v2/service/path/',
                'type': 'OData',
                'settings': {
                    'odataVersion': '2.0'
                }
            },
            'v4': {
                'uri': '/v4/service/path/',
                'type': 'OData',
                'settings': {
                    'odataVersion': '4.0'
                }
            }
        });
    });
    test('OData Annotations', () => {
        const manifestJson = {
            'sap.app': {
                'dataSources': {
                    'SEPMRA_PROD_MAN': {
                        'type': 'ODataAnnotation',
                        'uri': "/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN',Version='0001')/$value/",
                        'settings': {
                            'localUri': 'localService/SEPMRA_PROD_MAN.xml'
                        }
                    },
                    'annotation': {
                        'type': 'ODataAnnotation',
                        'uri': 'annotations/annotation.xml',
                        'settings': {
                            'localUri': 'annotations/annotation.xml'
                        }
                    }
                }
            }
        } as unknown as Manifest;
        expect(getODataSources(manifestJson, 'ODataAnnotation')).toEqual({
            'SEPMRA_PROD_MAN': {
                'uri': "/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN',Version='0001')/$value/",
                'type': 'ODataAnnotation',
                'settings': {
                    'localUri': 'localService/SEPMRA_PROD_MAN.xml'
                }
            },
            'annotation': {
                'type': 'ODataAnnotation',
                'uri': 'annotations/annotation.xml',
                'settings': {
                    'localUri': 'annotations/annotation.xml'
                }
            }
        });
    });
});

describe('getMockserverAnnotationConfig', () => {
    it('should return an empty array when no ODataAnnotation sources are available', () => {
        const manifestJson = {
            'sap.app': {
                'dataSources': {
                    'v2': {
                        'uri': '/v2/service/path/',
                        'type': 'OData',
                        'settings': {
                            'odataVersion': '2.0'
                        }
                    }
                }
            }
        } as unknown as Manifest;
        const result = getMockserverAnnotationConfig(manifestJson);
        expect(result).toEqual([]);
    });

    it('should return the correct annotation config with localUri and uri', () => {
        const manifestJson = {
            'sap.app': {
                'dataSources': {
                    'annotation': {
                        'type': 'ODataAnnotation',
                        'uri': 'annotations/annotation.xml',
                        'settings': {
                            'localUri': 'annotations/annotation.xml'
                        }
                    }
                }
            }
        } as unknown as Manifest;
        const result = getMockserverAnnotationConfig(manifestJson);
        expect(result).toEqual([
            {
                localPath: './webapp/annotations/annotation.xml',
                urlPath: 'annotations/annotation.xml'
            }
        ]);
    });

    it('should handle multiple annotation sources', () => {
        const manifestJson = {
            'sap.app': {
                'dataSources': {
                    'SEPMRA_PROD_MAN': {
                        'uri': "/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN',Version='0001')/$value/",
                        'type': 'ODataAnnotation',
                        'settings': {
                            'localUri': 'localService/SEPMRA_PROD_MAN.xml'
                        }
                    },
                    'annotation': {
                        'type': 'ODataAnnotation',
                        'uri': 'annotations/annotation.xml',
                        'settings': {
                            'localUri': 'annotations/annotation.xml'
                        }
                    }
                }
            }
        } as unknown as Manifest;
        const result = getMockserverAnnotationConfig(manifestJson);

        expect(result).toEqual([
            {
                localPath: './webapp/localService/SEPMRA_PROD_MAN.xml',
                urlPath: `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/Annotations(TechnicalName='SEPMRA_PROD_MAN',Version='0001')/$value/`
            },
            {
                localPath: './webapp/annotations/annotation.xml',
                urlPath: 'annotations/annotation.xml'
            }
        ]);
    });
});
