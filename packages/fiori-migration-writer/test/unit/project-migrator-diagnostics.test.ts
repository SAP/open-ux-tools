import { describe, it, expect, beforeEach } from '@jest/globals';
import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import { createMemFsEditor } from '../../src/utils/fs-adapter.js';
import { initI18n } from '../../src/i18n.js';
import { ProjectMigrator } from '../../src/ProjectMigrator.js';

const projectRoot = join('/', 'work', 'my-app');
const projectInfo = { isSAPApp: false, rootPath: projectRoot, webappPath: 'webapp' };

type Result = { result: boolean; messages: { type: string; description: string }[] };

// copyCommonFiles is private, it is what reports the failing step of the migration
const copyCommonFiles = async (fs: Editor): Promise<Result> =>
    (ProjectMigrator as any).copyCommonFiles(fs, projectInfo, undefined);

// The first step scans the staged files, so an error of the store fails that step with real code
const editorThatFailsWith = (error: Error): Editor => {
    const fs = createMemFsEditor();
    (fs as any).store.each = () => {
        throw error;
    };
    return fs;
};

describe('ProjectMigrator error diagnostics', () => {
    beforeEach(async () => {
        await initI18n();
    });

    it('reports the file, the code and the step of a file system error', async () => {
        const error = Object.assign(new Error("EPERM: operation not permitted, open 'x'"), {
            code: 'EPERM',
            path: join(projectRoot, 'webapp', 'Component.js')
        });

        const { result, messages } = await copyCommonFiles(editorThatFailsWith(error));

        expect(result).toBe(false);
        expect(messages).toEqual([
            {
                type: 'ERROR',
                description:
                    'Error copying common files: A permission error occurred in webapp/Component.js. Ensure the file is accessible. (code: EPERM, step: detectTypeScript)'
            }
        ]);
    });

    it('treats EACCES like EPERM', async () => {
        const error = Object.assign(new Error("EACCES: permission denied, mkdir 'x'"), {
            code: 'EACCES',
            path: join(projectRoot, 'webapp', 'localService')
        });

        const { messages } = await copyCommonFiles(editorThatFailsWith(error));

        expect(messages[0].description).toBe(
            'Error copying common files: A permission error occurred in webapp/localService. Ensure the file is accessible. (code: EACCES, step: detectTypeScript)'
        );
    });

    it('reports the step of a syntax error, which has no file', async () => {
        const { messages } = await copyCommonFiles(
            editorThatFailsWith(new SyntaxError('Unexpected token } in JSON at position 120'))
        );

        expect(messages[0].description).toBe(
            'Error copying common files: A syntax error occurred. (step: detectTypeScript)'
        );
    });

    it('keeps the text of other errors and adds the step', async () => {
        const error = Object.assign(new Error('ENOSPC: no space left on device, write'), { code: 'ENOSPC' });

        const { messages } = await copyCommonFiles(editorThatFailsWith(error));

        expect(messages[0].description).toBe(
            'Error copying common files: ENOSPC: no space left on device, write (step: detectTypeScript)'
        );
    });

    it('does not add details to a message that is written for the user', async () => {
        // a project that is not an SAP app and has no floor plan fails in a later step with a message for the user
        const { result, messages } = await copyCommonFiles(createMemFsEditor());

        expect(result).toBe(false);
        expect(messages).toHaveLength(1);
        expect(messages[0].description).toMatch(/^Error copying common files: The\s+floorplan is not supported/);
        expect(messages[0].description).not.toContain('step:');
    });
});
