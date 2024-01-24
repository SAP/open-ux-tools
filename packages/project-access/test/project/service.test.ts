import { join } from 'path';
import type { Manifest } from '../../src';
import { getMainService, getServicesAndAnnotations } from '../../src/project/service';

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
    test('No manifest', () => {
        const result = getServicesAndAnnotations(undefined as unknown as Manifest, '');
        expect(result).toEqual({});
    });

    test('Empty manifest', () => {
        const result = getServicesAndAnnotations({} as unknown as Manifest, '');
        expect(result).toEqual({});
    });

    test('No dataSources', () => {
        const result = getServicesAndAnnotations({ 'sap.app': {} } as unknown as Manifest, '');
        expect(result).toEqual({});
    });

    test('No OData dataSources', () => {
        const result = getServicesAndAnnotations(
            { 'sap.app': { dataSources: { 'foo': { type: 'foo' } } } } as unknown as Manifest,
            ''
        );
        expect(result).toEqual({});
    });

    test('OData data source no settings', () => {
        const result = getServicesAndAnnotations(
            { 'sap.app': { dataSources: { 'foo': { type: 'OData' } } } } as unknown as Manifest,
            ''
        );
        expect(result).toEqual({ foo: { uri: undefined, local: '', odataVersion: '2.0', annotations: [] } });
    });

    test('OData dataSources with uri', () => {
        const result = getServicesAndAnnotations(
            {
                'sap.app': {
                    dataSources: { 'foo': { type: 'OData', uri: 'bar/uri' } }
                }
            } as unknown as Manifest,
            ''
        );
        expect(result).toEqual({ foo: { uri: 'bar/uri', local: '', odataVersion: '2.0', annotations: [] } });
    });

    test('OData dataSources with uri and localUri, v 4.0', () => {
        const result = getServicesAndAnnotations(
            {
                'sap.app': {
                    dataSources: {
                        'foo': { type: 'OData', uri: 'bar', settings: { localUri: 'baz/path', odataVersion: '4.0' } }
                    }
                }
            } as unknown as Manifest,
            ''
        );
        expect(result).toEqual({ foo: { uri: 'bar', local: join('baz/path'), odataVersion: '4.0', annotations: [] } });
    });

    test('OData dataSources with annotations', () => {
        const result = getServicesAndAnnotations(
            {
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
            } as unknown as Manifest,
            ''
        );
        expect(result).toEqual({
            foo: {
                uri: 'bar',
                local: '',
                odataVersion: '2.0',
                annotations: [
                    { uri: 'anno1/uri', local: undefined },
                    { uri: 'anno2/uri', local: join('anno2/path') }
                ]
            }
        });
    });
});
