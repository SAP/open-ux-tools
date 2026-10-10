import { detectMainServiceFromManifest } from '../../../src/utils/service-detection.js';
import type { Manifest } from '@sap-ux/project-access';

describe('service-detection', () => {
    describe('detectMainServiceFromManifest', () => {
        test('should return mainService from getMainService when found', () => {
            const manifest = {
                'sap.app': {
                    id: 'test',
                    dataSources: {
                        mainService: { uri: '/sap/opu/odata/sap/API' }
                    }
                },
                'sap.ui5': {
                    models: {
                        '': { dataSource: 'mainService' }
                    }
                }
            } as unknown as Manifest;

            expect(detectMainServiceFromManifest(manifest)).toBe('mainService');
        });

        test('should return single datasource when only one exists', () => {
            const manifest = {
                'sap.app': {
                    id: 'test',
                    dataSources: {
                        myOnlyService: { uri: '/sap/opu/odata/sap/API', type: 'OData' }
                    }
                }
            } as unknown as Manifest;

            expect(detectMainServiceFromManifest(manifest)).toBe('myOnlyService');
        });

        test('should return first OData service when multiple exist', () => {
            const manifest = {
                'sap.app': {
                    id: 'test',
                    dataSources: {
                        annotationService: { uri: '/annotation.xml', type: 'ODataAnnotation' },
                        odataService: { uri: '/sap/opu/odata/sap/API', type: 'OData' }
                    }
                }
            } as unknown as Manifest;

            expect(detectMainServiceFromManifest(manifest)).toBe('odataService');
        });

        test('should return service with undefined type (defaults to OData)', () => {
            const manifest = {
                'sap.app': {
                    id: 'test',
                    dataSources: {
                        annotationService: { uri: '/annotation.xml', type: 'ODataAnnotation' },
                        defaultService: { uri: '/sap/opu/odata/sap/API' } // no type = OData
                    }
                }
            } as unknown as Manifest;

            expect(detectMainServiceFromManifest(manifest)).toBe('defaultService');
        });

        test('should return mainService as default when no OData found', () => {
            const manifest = {
                'sap.app': {
                    id: 'test',
                    dataSources: {
                        annotationService1: { uri: '/annotation1.xml', type: 'ODataAnnotation' },
                        annotationService2: { uri: '/annotation2.xml', type: 'ODataAnnotation' }
                    }
                }
            } as unknown as Manifest;

            expect(detectMainServiceFromManifest(manifest)).toBe('mainService');
        });

        test('should return undefined when no dataSources exist', () => {
            const manifest = {
                'sap.app': {
                    id: 'test'
                }
            } as unknown as Manifest;

            expect(detectMainServiceFromManifest(manifest)).toBeUndefined();
        });
    });
});
