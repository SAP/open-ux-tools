import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { getServicesForFile, updateServiceInstance } from '@sap-ux/adp-tooling';

import { updateXsuaaService } from '../../../src/platform/xssecurity';

jest.mock('node:fs', () => ({
    ...jest.requireActual('node:fs'),
    existsSync: jest.fn(),
    readFileSync: jest.fn()
}));

jest.mock('@sap-ux/adp-tooling', () => ({
    ...jest.requireActual('@sap-ux/adp-tooling'),
    getServicesForFile: jest.fn(),
    updateServiceInstance: jest.fn()
}));

const existsSyncMock = existsSync as jest.Mock;
const readFileSyncMock = readFileSync as jest.Mock;

const getServicesForFileMock = getServicesForFile as jest.Mock;
const updateServiceInstanceMock = updateServiceInstance as jest.Mock;

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
            existsSyncMock.mockImplementation((p: string) => p !== xsSecurityPath);

            await updateXsuaaService(rootPath, logger as never);

            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('xs-security.json not found'));
            expect(updateServiceInstanceMock).not.toHaveBeenCalled();
        });

        test('should warn and skip when mta.yaml not found', async () => {
            existsSyncMock.mockImplementation((p: string) => p !== mtaPath);

            await updateXsuaaService(rootPath, logger as never);

            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('mta.yaml not found'));
            expect(updateServiceInstanceMock).not.toHaveBeenCalled();
        });

        test('should warn and skip when no xsuaa service instance name in mta.yaml', async () => {
            existsSyncMock.mockReturnValue(true);
            readFileSyncMock.mockReturnValue(JSON.stringify(xsSecurityContent));
            getServicesForFileMock.mockReturnValue([{ name: 'some-destination', label: 'destination' }]);

            await updateXsuaaService(rootPath, logger as never);

            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('No xsuaa service instance name found'));
            expect(updateServiceInstanceMock).not.toHaveBeenCalled();
        });

        test('should update xsuaa service instance with augmented xs-security', async () => {
            const serviceInstanceName = 'test_app_1234567890-xsuaa';
            existsSyncMock.mockReturnValue(true);
            readFileSyncMock.mockReturnValue(JSON.stringify(xsSecurityContent));
            getServicesForFileMock.mockReturnValue([{ name: serviceInstanceName, label: 'xsuaa' }]);
            updateServiceInstanceMock.mockResolvedValue(undefined);

            await updateXsuaaService(rootPath, logger as never);

            expect(readFileSyncMock).toHaveBeenCalledWith(xsSecurityPath, 'utf-8');
            expect(getServicesForFileMock).toHaveBeenCalledWith(mtaPath, logger);
            expect(updateServiceInstanceMock).toHaveBeenCalledWith(serviceInstanceName, {
                ...xsSecurityContent,
                'oauth2-configuration': {
                    'redirect-uris': ['https://**.applicationstudio.cloud.sap/**', 'http://localhost:*/**']
                }
            });
        });

        test('should log error but not throw when updateServiceInstance fails', async () => {
            existsSyncMock.mockReturnValue(true);
            readFileSyncMock.mockReturnValue(JSON.stringify(xsSecurityContent));
            getServicesForFileMock.mockReturnValue([{ name: 'test-xsuaa', label: 'xsuaa' }]);
            updateServiceInstanceMock.mockRejectedValue(new Error('CF CLI failed'));

            await updateXsuaaService(rootPath, logger as never);

            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to update XSUAA service instance for BAS')
            );
        });
    });
});
