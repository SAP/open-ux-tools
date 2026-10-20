import { readHashFromFlpSandbox, resolveFlpSandboxHtmlTarget } from '../../../src/utils/flpSandboxUtils.js';
import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';

describe('readHashFromFlpSandbox()', () => {
    const basePath = join('/', 'project');
    const webappPath = join(basePath, 'webapp');

    function makeFsMock(content: string): jest.Mocked<Pick<Editor, 'read'>> {
        return { read: jest.fn().mockReturnValue(content) };
    }

    test('extracts the first application key from sap-ushell-config', () => {
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

        expect(readHashFromFlpSandbox('test/flpSandbox.html', webappPath, fs)).toBe('fincashbankmanage-tile');
        expect(fs.read).toHaveBeenCalledWith(join(webappPath, 'test', 'flpSandbox.html'));
    });

    test('extracts key when multiple applications exist', () => {
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

        expect(readHashFromFlpSandbox('test/flpSandbox.html', webappPath, fs)).toBe('first-app-tile');
    });

    test('returns undefined when no applications block is found', () => {
        const content = `<html><body>No config here</body></html>`;
        const fs = makeFsMock(content) as unknown as Editor;

        expect(readHashFromFlpSandbox('test/flpSandbox.html', webappPath, fs)).toBeUndefined();
    });

    test('returns undefined when file cannot be read', () => {
        const fs = {
            read: jest.fn().mockImplementation(() => {
                throw new Error('file not found');
            })
        } as unknown as Editor;

        expect(readHashFromFlpSandbox('test/flpSandbox.html', webappPath, fs)).toBeUndefined();
    });
});

describe('resolveFlpSandboxHtmlTarget()', () => {
    const basePath = join('/', 'project');
    const webappPath = join(basePath, 'webapp');
    const testOutDirPath = join(webappPath, 'test');
    const flpContent = `applications: { "C_Arbankstatement-display": { title: "App" } }`;

    test('returns flpSandbox target with the app intent when flpSandbox.html exists', () => {
        const fs = {
            exists: jest.fn().mockReturnValue(true),
            read: jest.fn().mockReturnValue(flpContent)
        } as unknown as Editor;

        expect(resolveFlpSandboxHtmlTarget(testOutDirPath, webappPath, fs)).toBe(
            'test/flpSandbox.html#C_Arbankstatement-display'
        );
        expect(fs.exists).toHaveBeenCalledWith(join(testOutDirPath, 'flpSandbox.html'));
    });

    test('returns undefined when flpSandbox.html is absent', () => {
        const fs = {
            exists: jest.fn().mockReturnValue(false),
            read: jest.fn()
        } as unknown as Editor;

        expect(resolveFlpSandboxHtmlTarget(testOutDirPath, webappPath, fs)).toBeUndefined();
        expect(fs.read).not.toHaveBeenCalled();
    });

    test('returns undefined when flpSandbox.html has no application key', () => {
        const fs = {
            exists: jest.fn().mockReturnValue(true),
            read: jest.fn().mockReturnValue('<html>no config</html>')
        } as unknown as Editor;

        expect(resolveFlpSandboxHtmlTarget(testOutDirPath, webappPath, fs)).toBeUndefined();
    });
});
