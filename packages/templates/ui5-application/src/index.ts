import { join } from 'path';
import { Ui5App, mergeWithDefaults } from './data';
import { create as createStorage } from 'mem-fs';
import { create, Editor } from 'mem-fs-editor';

async function generate(basePath: string, data: Ui5App, fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    const fullData = mergeWithDefaults(data);
    const tmpPath = join(__dirname, '..', 'templates');

    fs.copyTpl(join(tmpPath, '**/*.*'), join(basePath), fullData);

    return fs;
}

export { Ui5App, generate };
