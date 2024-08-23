import { join } from 'path';
import type { Manifest, ManifestNamespace } from '../../src';
import { getMainService, getServicesAndAnnotations, filterDataSourcesByType } from '../../src/project/service';

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
