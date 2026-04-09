import { jest } from '@jest/globals';
import path from 'node:path';

const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();

jest.unstable_mockModule('node:fs', () => ({
    default: { existsSync: mockExistsSync, readFileSync: mockReadFileSync },
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync
}));

const mockGetServicesForFile = jest.fn();
const mockUpdateServiceInstance = jest.fn();

jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    getServicesForFile: mockGetServicesForFile,
    updateServiceInstance: mockUpdateServiceInstance
}));

const { updateXsuaaService } = await import('../../../src/platform/xssecurity');

describe('xssecurity', () => {
    const logger = { info: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('updateXsuaaService', () => {
        const rootPath = '/project/app';
        const projectRoot = path.resolve(rootPath, '..');
        const xsSecurityPath = path.resolve(projectRoot, 'xs-security.json');
        const mtaPath = path.resolve(projectRoot, 'mta.yaml');

        const xsSecurityContent = {
            xsappname: 'test_app_1234567890',
            'tenant-mode': 'dedicated',
            description: 'Security profile of called application',
            scopes: [],
            'role-templates': []
        };

        test('should warn and skip when xs-security.json not found', async () => {
            mockExistsSync.mockImplementation((p: string) => p !== xsSecurityPath);

            await updateXsuaaService(rootPath, logger as never);

            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('xs-security.json not found'));
            expect(mockUpdateServiceInstance).not.toHaveBeenCalled();
        });

        test('should warn and skip when mta.yaml not found', async () => {
            mockExistsSync.mockImplementation((p: string) => p !== mtaPath);

            await updateXsuaaService(rootPath, logger as never);

            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('mta.yaml not found'));
            expect(mockUpdateServiceInstance).not.toHaveBeenCalled();
        });

        test('should warn and skip when no xsuaa service instance name in mta.yaml', async () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(xsSecurityContent));
            mockGetServicesForFile.mockReturnValue([{ name: 'some-destination', label: 'destination' }]);

            await updateXsuaaService(rootPath, logger as never);

            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('No xsuaa service instance name found'));
            expect(mockUpdateServiceInstance).not.toHaveBeenCalled();
        });

        test('should update xsuaa service instance with augmented xs-security', async () => {
            const serviceInstanceName = 'test_app_1234567890-xsuaa';
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(xsSecurityContent));
            mockGetServicesForFile.mockReturnValue([{ name: serviceInstanceName, label: 'xsuaa' }]);
            mockUpdateServiceInstance.mockResolvedValue(undefined);

            await updateXsuaaService(rootPath, logger as never);

            expect(mockReadFileSync).toHaveBeenCalledWith(xsSecurityPath, 'utf-8');
            expect(mockGetServicesForFile).toHaveBeenCalledWith(mtaPath, logger);
            expect(mockUpdateServiceInstance).toHaveBeenCalledWith(serviceInstanceName, {
                ...xsSecurityContent,
                'oauth2-configuration': {
                    'redirect-uris': ['https://**.applicationstudio.cloud.sap/**', 'http://localhost:*/**']
                }
            });
        });

        test('should log error but not throw when updateServiceInstance fails', async () => {
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(xsSecurityContent));
            mockGetServicesForFile.mockReturnValue([{ name: 'test-xsuaa', label: 'xsuaa' }]);
            mockUpdateServiceInstance.mockRejectedValue(new Error('CF CLI failed'));

            await updateXsuaaService(rootPath, logger as never);

            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to update XSUAA service instance for BAS')
            );
        });
    });
});
