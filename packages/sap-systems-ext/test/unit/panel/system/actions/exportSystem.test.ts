import { jest } from '@jest/globals';
import type { SystemConfigFile } from '../../../../../src/types';
import * as vscodeMod from 'vscode';

const systemServiceReadMock = jest.fn();
const mockShowFileSaveDialog = jest.fn();
const mockWriteFileSync = jest.fn();

const realStore = await import('@sap-ux/store');
jest.unstable_mockModule('@sap-ux/store', () => ({
    ...realStore,
    getService: jest.fn().mockImplementation(() => ({
        read: systemServiceReadMock
    }))
}));

const realPanelUtils = await import('../../../../../src/panel/system/utils');
jest.unstable_mockModule('../../../../../src/panel/system/utils', () => ({
    ...realPanelUtils,
    showFileSaveDialog: mockShowFileSaveDialog
}));

const realNodeFs = await import('node:fs');
jest.unstable_mockModule('node:fs', () => ({
    ...realNodeFs,
    writeFileSync: mockWriteFileSync
}));

const { exportSystem } = await import('../../../../../src/panel/system/actions/exportSystem');
const { initI18n } = await import('../../../../../src/utils');

describe('Test the export system action', () => {
    beforeAll(async () => {
        await initI18n();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const backendSystem = {
        url: 'https://example.com',
        client: '100',
        name: 'Test System',
        systemType: 'OnPrem' as const,
        connectionType: 'abap_catalog' as const
    };

    it('should call writeFileSync to export the system', async () => {
        systemServiceReadMock.mockResolvedValue(backendSystem);
        const showInformationMessageSpy = jest.spyOn(vscodeMod.window, 'showInformationMessage').mockImplementation();
        mockShowFileSaveDialog.mockResolvedValue({ fsPath: '/mock/path/system.json' } as vscodeMod.Uri);

        await exportSystem({} as any, {
            type: 'EXPORT_SYSTEM',
            payload: {
                system: {
                    name: 'Test System',
                    url: 'https://example.com',
                    client: '100',
                    systemType: 'OnPrem',
                    connectionType: 'abap_catalog'
                }
            }
        });

        expect(mockShowFileSaveDialog).toHaveBeenCalled();
        expect(mockWriteFileSync).toHaveBeenCalledWith(
            '/mock/path/system.json',
            JSON.stringify(
                {
                    systems: [
                        {
                            name: 'Test System',
                            url: 'https://example.com',
                            client: '100',
                            connectionType: 'abap_catalog'
                        }
                    ]
                } as SystemConfigFile,
                null,
                2
            )
        );
        expect(showInformationMessageSpy).toHaveBeenCalledWith('Connection [Test System] exported.');
    });

    it('should show the error when exporting the system fails', async () => {
        systemServiceReadMock.mockResolvedValue(backendSystem);
        mockWriteFileSync.mockImplementationOnce(() => {
            throw new Error('Writing failure');
        });
        const showErrorMessageSpy = jest.spyOn(vscodeMod.window, 'showErrorMessage').mockImplementation();
        mockShowFileSaveDialog.mockResolvedValue({ fsPath: '/mock/path/system.json' } as vscodeMod.Uri);

        await exportSystem({} as any, {
            type: 'EXPORT_SYSTEM',
            payload: {
                system: {
                    name: 'Test System',
                    url: 'https://example.com',
                    client: '100',
                    systemType: 'OnPrem',
                    connectionType: 'abap_catalog'
                }
            }
        });

        expect(mockShowFileSaveDialog).toHaveBeenCalled();
        expect(mockWriteFileSync).toHaveBeenCalled();
        expect(showErrorMessageSpy).toHaveBeenCalledWith('Failed to export connection information: Writing failure.');
    });

    it('should export system without client when not provided', async () => {
        const systemWithoutClient = {
            url: 'https://example.com/service',
            name: 'OData Service System',
            systemType: 'OnPrem' as const,
            connectionType: 'odata_service' as const
        };
        systemServiceReadMock.mockResolvedValue(systemWithoutClient);
        const showInformationMessageSpy = jest.spyOn(vscodeMod.window, 'showInformationMessage').mockImplementation();
        mockShowFileSaveDialog.mockResolvedValue({ fsPath: '/mock/path/odata-system.json' } as vscodeMod.Uri);

        await exportSystem({} as any, {
            type: 'EXPORT_SYSTEM',
            payload: {
                system: systemWithoutClient
            }
        });

        expect(mockShowFileSaveDialog).toHaveBeenCalled();
        expect(mockWriteFileSync).toHaveBeenCalledWith(
            '/mock/path/odata-system.json',
            JSON.stringify(
                {
                    systems: [
                        {
                            name: 'OData Service System',
                            url: 'https://example.com/service',
                            connectionType: 'odata_service'
                        }
                    ]
                } as SystemConfigFile,
                null,
                2
            )
        );
        expect(showInformationMessageSpy).toHaveBeenCalledWith('Connection [OData Service System] exported.');
    });

    it('should not export if file path is not provided', async () => {
        systemServiceReadMock.mockResolvedValue(backendSystem);
        const showInformationMessageSpy = jest.spyOn(vscodeMod.window, 'showInformationMessage').mockImplementation();
        mockShowFileSaveDialog.mockResolvedValue(undefined);

        await exportSystem({} as any, {
            type: 'EXPORT_SYSTEM',
            payload: {
                system: backendSystem
            }
        });

        expect(mockShowFileSaveDialog).toHaveBeenCalled();
        expect(mockWriteFileSync).not.toHaveBeenCalled();
        expect(showInformationMessageSpy).not.toHaveBeenCalled();
    });

    it('should return early if system is not found in store', async () => {
        systemServiceReadMock.mockResolvedValue(undefined);

        await exportSystem({} as any, {
            type: 'EXPORT_SYSTEM',
            payload: {
                system: {
                    name: 'Non-existent System',
                    url: 'https://nonexistent.com',
                    client: '100',
                    systemType: 'OnPrem',
                    connectionType: 'abap_catalog'
                }
            }
        });

        expect(mockShowFileSaveDialog).not.toHaveBeenCalled();
        expect(mockWriteFileSync).not.toHaveBeenCalled();
    });
});
