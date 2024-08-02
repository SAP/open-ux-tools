import { Editor } from 'mem-fs-editor';
import { ResourceModel } from './i18n-model';

const MAIN_I18N_PATH = 'i18n/i18n.properties';

export function writeI18nModels(fs: Editor, basePath: string, i18nModels: ResourceModel[] | undefined) {
    if (i18nModels) {
        i18nModels.forEach((i18nModel) => {
            if (i18nModel.key !== 'i18n' && i18nModel.path !== MAIN_I18N_PATH && i18nModel.content) {
                const i18nPath = basePath + '/webapp/' + i18nModel.path;
                fs.write(i18nPath, i18nModel.content);
            }
        });
    }
}
