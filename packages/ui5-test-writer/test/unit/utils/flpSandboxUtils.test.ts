import { readHashFromFlpSandbox } from '../../../src/utils/flpSandboxUtils';
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
