import type { SystemConfigFile } from '../../../../../src/types';
import { exportSystem } from '../../../../../src/panel/system/actions/exportSystem';
import { initI18n } from '../../../../../src/utils';
import * as vscodeMod from 'vscode';
import * as fs from 'node:fs';
import * as panelActionUtils from '../../../../../src/panel/system/utils';

const systemServiceReadMock = jest.fn();

jest.mock('@sap-ux/store', () => ({
    ...jest.requireActual('@sap-ux/store'),
    getService: jest.fn().mockImplementation(() => ({
        read: systemServiceReadMock
    }))
}));

jest.mock('../../../../../src/panel/system/utils', () => ({
    ...jest.requireActual('../../../../../src/panel/system/utils'),
    showFileSaveDialog: jest.fn()
}));

jest.mock('fs');

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
        systemType: 'OnPrem'
    };

    it('should call writeFileSync to export the system', async () => {
        systemServiceReadMock.mockResolvedValue(backendSystem);
        const writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation();
        const showInformationMessageSpy = jest.spyOn(vscodeMod.window, 'showInformationMessage').mockImplementation();
        const showSaveDialogSpy = jest
            .spyOn(panelActionUtils, 'showFileSaveDialog')
            .mockResolvedValue({ fsPath: '/mock/path/system.json' } as vscodeMod.Uri);

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

        expect(showSaveDialogSpy).toHaveBeenCalled();
        expect(writeFileSyncSpy).toHaveBeenCalledWith(
            '/mock/path/system.json',
            JSON.stringify(
                {
                    systems: [
                        {
                            name: 'Test System',
                            url: 'https://example.com',
                            client: '100'
                        }
                    ]
                } as SystemConfigFile,
                null,
                2
            )
        );
        expect(showInformationMessageSpy).toHaveBeenCalledWith('System [Test System] exported.');
    });

    it('should show the error when exporting the system fails', async () => {
        systemServiceReadMock.mockResolvedValue(backendSystem);
        const writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync').mockImplementationOnce(() => {
            throw new Error('Writing failure');
        });
        const showErrorMessageSpy = jest.spyOn(vscodeMod.window, 'showErrorMessage').mockImplementation();
        const showSaveDialogSpy = jest
            .spyOn(panelActionUtils, 'showFileSaveDialog')
            .mockResolvedValue({ fsPath: '/mock/path/system.json' } as vscodeMod.Uri);

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

        expect(showSaveDialogSpy).toHaveBeenCalled();
        expect(writeFileSyncSpy).toHaveBeenCalledWith(
            '/mock/path/system.json',
            JSON.stringify(
                {
                    systems: [
                        {
                            name: 'Test System',
                            url: 'https://example.com',
                            client: '100'
                        }
                    ]
                },
                null,
                2
            )
        );
        expect(showErrorMessageSpy).toHaveBeenCalledWith('Failed to export system information: Writing failure.');
    });
});
