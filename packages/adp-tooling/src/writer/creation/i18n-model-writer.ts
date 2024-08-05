import { Editor } from 'mem-fs-editor';

import { ResourceModel } from './i18n-model';

const MAIN_I18N_PATH = 'i18n/i18n.properties';

/**
 * Writes internationalization (i18n) model files to the specified paths within the project structure.
 *
 * @param {Editor} fs - The file system editor interface used for writing files.
 * @param {string} basePath - The base path of the project where i18n files are located, typically the root.
 * @param {ResourceModel[]} [i18nModels] - An optional array of i18n models to be written. Each model contains
 *                                         the key, path, and content for an i18n file.
 *
 * This function ensures that:
 * - Only i18n models that are not the main i18n file (`i18n/i18n.properties`) are processed.
 * - Models are written only if they have content and do not match the main i18n path.
 * - The file path for each model is constructed using the provided base path and model's specified path.
 */
export function writeI18nModels(fs: Editor, basePath: string, i18nModels: ResourceModel[] | undefined): void {
    if (i18nModels) {
        i18nModels.forEach((i18nModel) => {
            if (i18nModel.key !== 'i18n' && i18nModel.path !== MAIN_I18N_PATH && i18nModel.content) {
                const i18nPath = basePath + '/webapp/' + i18nModel.path;
                fs.write(i18nPath, i18nModel.content);
            }
        });
    }
}
