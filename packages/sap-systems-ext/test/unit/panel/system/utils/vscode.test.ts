import * as vscodeMod from 'vscode';
import { showFileSaveDialog } from '../../../../../src/panel/system/utils';

describe('Test VSCode utils', () => {
    it('should show the save dialog to the user', async () => {
        const showSaveDialogSpy = jest.spyOn(vscodeMod.window, 'showSaveDialog');
        const workspaceFolders: vscodeMod.WorkspaceFolder[] = [
            {
                uri: vscodeMod.Uri.file('/mock/workspace/folder1'),
                name: 'folder1',
                index: 0
            }
        ];
        showSaveDialogSpy.mockResolvedValue(vscodeMod.Uri.file('/mock/workspace/folder1/Test_System_Name.json'));

        const filePathResullt = showFileSaveDialog('Test:System,Name', workspaceFolders);

        await expect(filePathResullt).resolves.toEqual(
            vscodeMod.Uri.file('/mock/workspace/folder1/Test_System_Name.json')
        );
    });

    it('should show the save dialog to the user with no system name and no workspace folders', async () => {
        const showSaveDialogSpy = jest.spyOn(vscodeMod.window, 'showSaveDialog');
        const workspaceFolders: vscodeMod.WorkspaceFolder[] = [];
        showSaveDialogSpy.mockResolvedValue(vscodeMod.Uri.file('/mock/workspace/folder1/system.json'));

        const filePathResullt = showFileSaveDialog(undefined, workspaceFolders);

        expect(showSaveDialogSpy).toHaveBeenCalledWith({
            defaultUri: vscodeMod.Uri.file('system.json'),
            filters: { 'JSON Files': ['json'] }
        });
        await expect(filePathResullt).resolves.toEqual(vscodeMod.Uri.file('/mock/workspace/folder1/system.json'));
    });
});
