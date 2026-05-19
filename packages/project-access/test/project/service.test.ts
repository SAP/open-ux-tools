import { join } from 'node:path';
import type { Manifest, ManifestNamespace } from '../../src';
import {
    getMainService,
    getServicesAndAnnotations,
    filterDataSourcesByType,
    getUsedEntitiesFromManifest
} from '../../src/project/service';

describe('Test getMainService()', () => {
    test('No manifest', () => {
        const result = getMainService(undefined as unknown as Manifest);
        expect(result).toBeUndefined();
    });

    test('Empty manifest', () => {
        const result = getMainService({} as unknown as Manifest);
        expect(result).toBeUndefined();
    });

    test('No globalFilterModel', () => {
        const result = getMainService({ 'sap.ovp': {} } as unknown as Manifest);
        expect(result).toBeUndefined();
    });

    test('No dataSource', () => {
        const result = getMainService({ 'sap.ovp': { globalFilterModel: 'model' } } as unknown as Manifest);
        expect(result).toBeUndefined();
    });

    test('No dataSource string', () => {
        const result = getMainService({
            'sap.ovp': { globalFilterModel: 'model' },
            'sap.ui5': { models: { model: { dataSource: {} } } }
        } as unknown as Manifest);
        expect(result).toBeUndefined();
    });

    test('OVP with globalFilter', () => {
        const result = getMainService({
            'sap.ovp': { globalFilterModel: 'model' },
            'sap.ui5': { models: { model: { dataSource: 'service' } } }
        } as unknown as Manifest);
        expect(result).toBe('service');
    });

    test('Main service without ovp', () => {
        const result = getMainService({
            'sap.ui5': { models: { '': { dataSource: 'service' } } }
        } as unknown as Manifest);
        expect(result).toBe('service');
    });
});

describe('Test getServicesAndAnnotations()', () => {
    test('No manifest, should throw error', async () => {
        try {
            await getServicesAndAnnotations('not-valid-manifest-path', undefined as unknown as Manifest);
            throw Error('getI18nPropertiesPaths() should have thrown an error but did not.');
        } catch (error) {
            expect(error.message).toContain('not-valid-manifest-path');
        }
    });

    test('Empty manifest', async () => {
        const result = await getServicesAndAnnotations('', {} as unknown as Manifest);
        expect(result).toEqual({});
    });

    test('No dataSources', async () => {
        const result = await getServicesAndAnnotations('', { 'sap.app': {} } as unknown as Manifest);
        expect(result).toEqual({});
    });

    test('No OData dataSources', async () => {
        const result = await getServicesAndAnnotations('', {
            'sap.app': { dataSources: { 'foo': { type: 'foo' } } }
        } as unknown as Manifest);
        expect(result).toEqual({});
    });

    test('OData data source no settings', async () => {
        const result = await getServicesAndAnnotations('', {
            'sap.app': { dataSources: { 'foo': { type: 'OData' } } }
        } as unknown as Manifest);
        expect(result).toEqual({ foo: { uri: undefined, local: '', odataVersion: '2.0', annotations: [] } });
    });

    test('OData dataSources with uri', async () => {
        const result = await getServicesAndAnnotations('', {
            'sap.app': {
                dataSources: { 'foo': { type: 'OData', uri: 'bar/uri' } }
            }
        } as unknown as Manifest);
        expect(result).toEqual({ foo: { uri: 'bar/uri', local: '', odataVersion: '2.0', annotations: [] } });
    });

    test('OData dataSources with uri and localUri, v 4.0', async () => {
        const result = await getServicesAndAnnotations(join('foo/manifest.json'), {
            'sap.app': {
                dataSources: {
                    'foo': { type: 'OData', uri: 'bar', settings: { localUri: 'baz/path', odataVersion: '4.0' } }
                }
            }
        } as unknown as Manifest);
        expect(result).toEqual({
            foo: { uri: 'bar', local: join('foo/baz/path'), odataVersion: '4.0', annotations: [] }
        });
    });

    test('OData dataSources with annotations', async () => {
        const result = await getServicesAndAnnotations('/some/path/manifest.json', {
            'sap.app': {
                dataSources: {
                    'foo': {
                        type: 'OData',
                        uri: 'bar',
                        settings: { annotations: ['anno1', 'anno2', 'not_existing_anno'] }
                    },
                    'anno1': { uri: 'anno1/uri' },
                    'anno2': { uri: 'anno2/uri', settings: { localUri: 'anno2/path' } }
                }
            }
        } as unknown as Manifest);
        expect(result).toEqual({
            foo: {
                uri: 'bar',
                local: '',
                odataVersion: '2.0',
                annotations: [
                    { uri: 'anno1/uri', local: undefined },
                    { uri: 'anno2/uri', local: join('/some/path/anno2/path') }
                ]
            }
        });
    });
});

describe('Test filterDataSourcesByType()', () => {
    const dataSources = {
        'foo': {
            'uri': 'bar',
            'type': 'OData',
            'settings': {
                'annotations': ['anno1']
            }
        },
        'anno1': {
            'uri': 'anno1/uri',
            'type': 'ODataAnnotation',
            'settings': {
                'localUri': 'anno1/path'
            }
        }
    } as Record<string, ManifestNamespace.DataSource>;

    test('Filter Sources of type OData', async () => {
        const result = filterDataSourcesByType(dataSources, 'OData');
        expect(result).toEqual({ 'foo': dataSources['foo'] });
    });
});

describe('Test getUsedEntitiesFromManifest()', () => {
    test('No manifest throws error', () => {
        expect(() => getUsedEntitiesFromManifest(undefined as unknown as Manifest)).toThrow();
    });

    test('Empty manifest returns empty array', () => {
        expect(getUsedEntitiesFromManifest({} as unknown as Manifest)).toEqual([]);
    });

    test('Manifest with no routing targets returns empty array', () => {
        expect(getUsedEntitiesFromManifest({ 'sap.ui5': {} } as unknown as Manifest)).toEqual([]);
    });

    test('Manifest with no mainService returns entity with empty service string', () => {
        const result = getUsedEntitiesFromManifest({
            'sap.ui5': {
                routing: {
                    targets: {
                        MyList: { options: { settings: { entitySet: 'Products' } } }
                    }
                }
            }
        } as unknown as Manifest);
        expect(result).toEqual([{ service: '', entity: 'Products' }]);
    });

    test('Manifest with entitySet in target returns entity with service URI', () => {
        const result = getUsedEntitiesFromManifest({
            'sap.app': { dataSources: { mainService: { uri: '/odata/v4/my-service/' } } },
            'sap.ui5': {
                models: { '': { dataSource: 'mainService' } },
                routing: {
                    targets: {
                        MyListReport: { options: { settings: { entitySet: 'Products' } } }
                    }
                }
            }
        } as unknown as Manifest);
        expect(result).toEqual([{ service: '/odata/v4/my-service/', entity: 'Products' }]);
    });

    test('Manifest with multiple targets returns all entities', () => {
        const result = getUsedEntitiesFromManifest({
            'sap.app': { dataSources: { mainService: { uri: '/odata/v4/my-service/' } } },
            'sap.ui5': {
                models: { '': { dataSource: 'mainService' } },
                routing: {
                    targets: {
                        ListPage: { options: { settings: { entitySet: 'Orders' } } },
                        ObjectPage: { options: { settings: { entitySet: 'OrderItems' } } }
                    }
                }
            }
        } as unknown as Manifest);
        expect(result).toEqual([
            { service: '/odata/v4/my-service/', entity: 'Orders' },
            { service: '/odata/v4/my-service/', entity: 'OrderItems' }
        ]);
    });

    test('Duplicate entitySet across targets is deduplicated', () => {
        const result = getUsedEntitiesFromManifest({
            'sap.app': { dataSources: { mainService: { uri: '/odata/v4/my-service/' } } },
            'sap.ui5': {
                models: { '': { dataSource: 'mainService' } },
                routing: {
                    targets: {
                        ListPage: { options: { settings: { entitySet: 'Products' } } },
                        ObjectPage: { options: { settings: { entitySet: 'Products' } } }
                    }
                }
            }
        } as unknown as Manifest);
        expect(result).toEqual([{ service: '/odata/v4/my-service/', entity: 'Products' }]);
    });

    test('Manifest with entitySet in views.paths returns entities', () => {
        const result = getUsedEntitiesFromManifest({
            'sap.app': { dataSources: { mainService: { uri: '/odata/v4/my-service/' } } },
            'sap.ui5': {
                models: { '': { dataSource: 'mainService' } },
                routing: {
                    targets: {
                        MyView: {
                            options: {
                                settings: {
                                    views: {
                                        paths: [{ entitySet: 'SalesOrders' }, { entitySet: 'Products' }]
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } as unknown as Manifest);
        expect(result).toEqual([
            { service: '/odata/v4/my-service/', entity: 'SalesOrders' },
            { service: '/odata/v4/my-service/', entity: 'Products' }
        ]);
    });

    test('Fiori Elements V4 manifest with contextPath only returns empty array', () => {
        // V4 apps use contextPath; the function only handles entitySet, so no entities are extracted
        const result = getUsedEntitiesFromManifest({
            'sap.app': {
                dataSources: {
                    mainService: {
                        uri: '/odata/v4/kitchen-cabinet-app-srv/',
                        type: 'OData',
                        settings: { odataVersion: '4.0', annotations: [] }
                    }
                }
            },
            'sap.ui5': {
                models: { '': { dataSource: 'mainService' } },
                routing: {
                    targets: {
                        KitchenCabinetsList: {
                            type: 'Component',
                            name: 'sap.fe.templates.ListReport',
                            options: { settings: { contextPath: '/KitchenCabinets' } }
                        },
                        KitchenCabinetsObjectPage: {
                            type: 'Component',
                            name: 'sap.fe.templates.ObjectPage',
                            options: { settings: { contextPath: '/KitchenCabinets' } }
                        }
                    }
                }
            }
        } as unknown as Manifest);
        expect(result).toEqual([]);
    });

    test('Target with options as string returns empty array', () => {
        const result = getUsedEntitiesFromManifest({
            'sap.ui5': {
                routing: {
                    targets: {
                        MyPage: { options: 'invalid' }
                    }
                }
            }
        } as unknown as Manifest);
        expect(result).toEqual([]);
    });

    test('Target with settings as string returns empty array', () => {
        const result = getUsedEntitiesFromManifest({
            'sap.ui5': {
                routing: {
                    targets: {
                        MyPage: { options: { settings: 'invalid' } }
                    }
                }
            }
        } as unknown as Manifest);
        expect(result).toEqual([]);
    });

    test('Target with views as string still returns entitySet from page', () => {
        const result = getUsedEntitiesFromManifest({
            'sap.app': { dataSources: { mainService: { uri: '/odata/v4/my-service/' } } },
            'sap.ui5': {
                models: { '': { dataSource: 'mainService' } },
                routing: {
                    targets: {
                        MyPage: { options: { settings: { entitySet: 'Products', views: 'invalid' } } }
                    }
                }
            }
        } as unknown as Manifest);
        expect(result).toEqual([{ service: '/odata/v4/my-service/', entity: 'Products' }]);
    });
});
