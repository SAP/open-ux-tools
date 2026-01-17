import { AppRouterType } from '@sap-ux/adp-tooling';
import type { AdaptationDescriptor } from '@sap-ux/axios-extension';
import type { CFApp, Endpoint, SourceApplication } from '@sap-ux/adp-tooling';

import {
    getApplicationChoices,
    getCFAppChoices,
    getAppRouterChoices,
    getAdaptationChoices,
    getKeyUserSystemChoices
} from '../../../../src/app/questions/helper/choices';

describe('Choices Helper Functions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getApplicationChoices', () => {
        const mockSourceApp: SourceApplication = {
            id: 'test-app-id',
            title: 'Test Application',
            registrationIds: ['REG123'],
            ach: 'ACH456',
            fileType: 'application',
            bspUrl: '/test.bsp.com',
            bspName: 'test-bsp'
        };

        const mockSourceAppWithoutTitle: SourceApplication = {
            id: 'test-app-id-2',
            title: '',
            registrationIds: ['REG456'],
            ach: 'ACH789',
            fileType: 'application',
            bspUrl: '/test2.bsp.com',
            bspName: 'test-bsp-2'
        };

        test('should create choices from applications with title', () => {
            const apps = [mockSourceApp];
            const result = getApplicationChoices(apps);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                value: mockSourceApp,
                name: 'Test Application (test-app-id, REG123, ACH456)'
            });
        });

        test('should create choices from applications without title', () => {
            const apps = [mockSourceAppWithoutTitle];
            const result = getApplicationChoices(apps);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                value: mockSourceAppWithoutTitle,
                name: 'test-app-id-2 (REG456, ACH789)'
            });
        });

        test('should handle multiple applications', () => {
            const apps = [mockSourceApp, mockSourceAppWithoutTitle];
            const result = getApplicationChoices(apps);

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('Test Application (test-app-id, REG123, ACH456)');
            expect(result[1].name).toBe('test-app-id-2 (REG456, ACH789)');
        });

        test('should handle empty array', () => {
            const result = getApplicationChoices([]);
            expect(result).toHaveLength(0);
        });

        test('should handle non-array input', () => {
            const nonArray = 'not an array';
            const result = getApplicationChoices(nonArray as any);
            expect(result).toBe(nonArray);
        });
    });

    describe('getCFAppChoices', () => {
        const mockCFApp: CFApp = {
            appId: 'test-app-id',
            appName: 'Test App',
            appVersion: '1.0.0',
            appHostId: 'host-123',
            serviceName: 'test-service',
            title: 'Test Application'
        };

        const mockCFApp2: CFApp = {
            appId: 'test-app-id-2',
            appName: 'Test App 2',
            appVersion: '2.0.0',
            appHostId: 'host-456',
            serviceName: 'test-service-2',
            title: 'Test Application 2'
        };

        test('should create choices when available', () => {
            const apps = [mockCFApp];

            const result = getCFAppChoices(apps);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                value: mockCFApp,
                name: 'Test Application (test-app-id 1.0.0)'
            });
        });

        test('should handle multiple apps', () => {
            const apps = [mockCFApp, mockCFApp2];

            const result = getCFAppChoices(apps);

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                value: mockCFApp,
                name: 'Test Application (test-app-id 1.0.0)'
            });
            expect(result[1]).toEqual({
                value: mockCFApp2,
                name: 'Test Application 2 (test-app-id-2 2.0.0)'
            });
        });

        test('should handle empty array', () => {
            const result = getCFAppChoices([]);
            expect(result).toHaveLength(0);
        });
    });

    describe('getAppRouterChoices', () => {
        test('should return only MANAGED option when isInternalUsage is false', () => {
            const result = getAppRouterChoices(false);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                name: AppRouterType.MANAGED,
                value: AppRouterType.MANAGED
            });
        });

        test('should return both MANAGED and STANDALONE options when isInternalUsage is true', () => {
            const result = getAppRouterChoices(true);

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                name: AppRouterType.MANAGED,
                value: AppRouterType.MANAGED
            });
            expect(result[1]).toEqual({
                name: AppRouterType.STANDALONE,
                value: AppRouterType.STANDALONE
            });
        });
    });

    describe('getAdaptationChoices', () => {
        const mockAdaptation1: AdaptationDescriptor = {
            id: 'DEFAULT',
            title: '',
            type: 'DEFAULT'
        };

        const mockAdaptation2: AdaptationDescriptor = {
            id: 'CTX1',
            title: 'Context 1',
            type: 'CONTEXT',
            contexts: { role: ['/UI2/ADMIN'] }
        };

        const mockAdaptation3: AdaptationDescriptor = {
            id: 'CTX2',
            type: 'CONTEXT'
        };

        test('should handle multiple adaptations', () => {
            const adaptations = [mockAdaptation1, mockAdaptation2, mockAdaptation3];
            const result = getAdaptationChoices(adaptations);

            expect(result).toHaveLength(3);
            expect(result[0]).toEqual({
                value: mockAdaptation1,
                name: 'DEFAULT'
            });
            expect(result[1]).toEqual({
                value: mockAdaptation2,
                name: 'Context 1 (CTX1)'
            });
            expect(result[2]).toEqual({
                value: mockAdaptation3,
                name: 'CTX2'
            });
        });

        test('should handle undefined/null adaptations', () => {
            const result = getAdaptationChoices(undefined as any);
            expect(result).toBeUndefined();
        });
    });

    describe('getKeyUserSystemChoices', () => {
        const mockSystems: Endpoint[] = [
            { Name: 'SystemA', Client: '100', Url: '/systema', Authentication: 'NoAuthentication' },
            { Name: 'SystemB', Client: '200', Url: '/systemb', Authentication: 'Basic' },
            { Name: 'SystemC', Client: '300', Url: '/systemc', Authentication: 'Basic' }
        ];

        test('should create choices with default system marked as "Source system"', () => {
            const result = getKeyUserSystemChoices(mockSystems, 'SystemA');

            expect(result).toHaveLength(3);
            expect(result[0]).toEqual({
                name: 'SystemA (Source system)',
                value: 'SystemA'
            });
            expect(result[1]).toEqual({
                name: 'SystemB',
                value: 'SystemB'
            });
            expect(result[2]).toEqual({
                name: 'SystemC',
                value: 'SystemC'
            });
        });

        test('should handle empty array', () => {
            const result = getKeyUserSystemChoices([], 'SystemA');
            expect(result).toHaveLength(0);
        });
    });
});
