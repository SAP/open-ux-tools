import { readHashFromFlpSandbox } from '../../../src/utils/flpSandboxUtils';
import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';

jest.mock('@sap-ux/project-access', () => ({
    getWebappPath: jest.fn().mockResolvedValue('webapp')
}));

describe('readHashFromFlpSandbox()', () => {
    const basePath = join('/', 'project');

    function makeFsMock(content: string): jest.Mocked<Pick<Editor, 'read'>> {
        return { read: jest.fn().mockReturnValue(content) };
    }

    test('extracts the first application key from sap-ushell-config', async () => {
        const content = `
            window["sap-ushell-config"] = {
                applications: {
                    "fincashbankmanage-tile": {
                        title: "Manage Banks",
                        applicationType: "URL",
                        url: "../"
                    }
                }
            };`;
        const fs = makeFsMock(content) as unknown as Editor;

        await expect(readHashFromFlpSandbox('test/flpSandbox.html', basePath, fs)).resolves.toBe(
            'fincashbankmanage-tile'
        );
        expect(fs.read).toHaveBeenCalledWith(join(basePath, 'webapp', 'test', 'flpSandbox.html'));
    });

    test('extracts key when multiple applications exist', async () => {
        const content = `
            applications: {
                "first-app-tile": {
                    title: "First App"
                },
                "second-app-tile": {
                    title: "Second App"
                }
            }`;
        const fs = makeFsMock(content) as unknown as Editor;

        await expect(readHashFromFlpSandbox('test/flpSandbox.html', basePath, fs)).resolves.toBe('first-app-tile');
    });

    test('returns undefined when no applications block is found', async () => {
        const content = `<html><body>No config here</body></html>`;
        const fs = makeFsMock(content) as unknown as Editor;

        await expect(readHashFromFlpSandbox('test/flpSandbox.html', basePath, fs)).resolves.toBeUndefined();
    });

    test('returns undefined when file cannot be read', async () => {
        const fs = {
            read: jest.fn().mockImplementation(() => {
                throw new Error('file not found');
            })
        } as unknown as Editor;

        await expect(readHashFromFlpSandbox('test/flpSandbox.html', basePath, fs)).resolves.toBeUndefined();
    });
});
