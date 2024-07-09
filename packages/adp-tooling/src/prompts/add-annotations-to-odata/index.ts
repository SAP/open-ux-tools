import type { ListQuestion, FileBrowserQuestion, YUIQuestion } from '@sap-ux/inquirer-common';
import type { ManifestNamespace } from '@sap-ux/project-access';
import { AnnotationFileSelectType, type AddAnnotationsAnswers } from '../../types';
import { t } from '../../i18n';
import { filterDataSourcesByType } from '@sap-ux/project-access';
import { checkFileExists, checkDuplicateFile } from '../../base/helper';
import { isNotEmptyString } from '../../base/validators';
import { join, isAbsolute } from 'path';

/**
 * Gets the prompts for adding annotations to OData service.
 *
 * @param {string} basePath - The base path of the project.
 * @param {Record<string, ManifestNamespace.DataSource>} dataSources - Data sources from the manifest.
 * @returns {YUIQuestion<AddAnnotationsAnswers>[]} The questions/prompts.
 */
export function getPrompts(
    basePath: string,
    dataSources: Record<string, ManifestNamespace.DataSource>
): YUIQuestion<AddAnnotationsAnswers>[] {
    const dataSourceIds = Object.keys(filterDataSourcesByType(dataSources, 'OData'));
    const annotationFileSelectOptions = [
        { name: t('choices.annotationFile.selectFromWorkspace'), value: AnnotationFileSelectType.ExistingFile },
        { name: t('choices.annotationFile.createEmptyFile'), value: AnnotationFileSelectType.NewEmptyFile }
    ];
    return [
        {
            type: 'list',
            name: 'id',
            message: t('prompts.oDataSourceLabel'),
            choices: dataSourceIds,
            default: dataSourceIds[0],
            store: false,
            guiOptions: {
                mandatory: true,
                hint: t('prompts.addAnnotationOdataSourceTooltip')
            }
        } as ListQuestion<AddAnnotationsAnswers>,
        {
            type: 'list',
            name: 'fileSelectOption',
            message: t('prompts.fileSelectOptionLabel'),
            choices: annotationFileSelectOptions,
            default: 0,
            guiOptions: {
                mandatory: true,
                hint: t('prompts.fileSelectOptionTooltip')
            },
            when: (answers: AddAnnotationsAnswers) => answers.id !== ''
        } as ListQuestion<AddAnnotationsAnswers>,
        {
            type: 'input',
            name: 'filePath',
            message: t('prompts.filePathLabel'),
            guiType: 'file-browser',
            guiOptions: {
                mandatory: true,
                hint: t('prompts.filePathTooltip')
            },
            default: '',
            when: (answers: AddAnnotationsAnswers) =>
                answers.id !== '' && answers.fileSelectOption === AnnotationFileSelectType.ExistingFile,
            validate: (value) => {
                if (!isNotEmptyString(value)) {
                    return t('validators.inputCannotBeEmpty');
                }
                const filePath = isAbsolute(value) ? value : join(basePath, value);
                if (!checkFileExists(filePath)) {
                    return t('validators.fileDoesNotExist');
                }
                if (checkDuplicateFile(filePath, join(basePath, 'webapp', 'changes', 'annotations'))) {
                    return t('validators.annotationFileAlreadyExists');
                }
                return true;
            }
        } as FileBrowserQuestion<AddAnnotationsAnswers>
    ];
}
