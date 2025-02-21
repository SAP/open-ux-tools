import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { join } from 'path';

export function generateFreestyleTestFiles(
    basePath: string,
    testConfig: {
        AppId?: string;
        ViewName?: string;
        ViewNamePage?: string;
        UI5Theme?: string;
        AppIdWithSlash?: string;
        ApplicationTitle?: string;
        NavigationIntent?: string;
        ApplicationDescription?: string;
    },
    fs?: Editor
): Editor {
    const fsEd: Editor = fs || create(createStorage());
    const freestyleTemplateDirPath = join(__dirname, `../templates/freestyle/simple/webapp/test/`);
    const testOutDirPath = join(basePath, 'webapp/test');

    fsEd.copyTpl(join(freestyleTemplateDirPath, '*.*'), join(testOutDirPath, 'integration'), testConfig, undefined, {
        globOptions: { dot: true }
    });

    return fsEd;
}
