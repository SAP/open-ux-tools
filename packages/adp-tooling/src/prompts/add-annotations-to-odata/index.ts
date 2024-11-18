import type { ListQuestion, FileBrowserQuestion, YUIQuestion } from '@sap-ux/inquirer-common';
import type { ManifestNamespace } from '@sap-ux/project-access';
import { AnnotationFileSelectType, type AddAnnotationsAnswers } from '../../types';
import { t } from '../../i18n';
import { filterDataSourcesByType } from '@sap-ux/project-access';
import { existsSync } from 'fs';
import { validateEmptyString } from '@sap-ux/project-input-validator';
import { join, isAbsolute, sep } from 'path';

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
        { name: t('choices.annotationFile.createTemplateFile'), value: AnnotationFileSelectType.NewEmptyFile }
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
                const validationResult = validateEmptyString(value);
                if (typeof validationResult === 'string') {
                    return validationResult;
                }

                const filePath = isAbsolute(value) ? value : join(basePath, value);
                if (!existsSync(filePath)) {
                    return t('validators.fileDoesNotExist');
                }

                const fileName = filePath.split(sep).pop();
                if (existsSync(join(basePath, 'webapp', 'changes', 'annotations', fileName))) {
                    return t('validators.annotationFileAlreadyExists');
                }

                return true;
            }
        } as FileBrowserQuestion<AddAnnotationsAnswers>
    ];
}
