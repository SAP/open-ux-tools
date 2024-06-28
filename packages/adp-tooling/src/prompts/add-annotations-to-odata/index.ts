import type { ListQuestion, YUIQuestion } from '@sap-ux/inquirer-common';
import type { ManifestNamespace } from '@sap-ux/project-access';
import type { AddAnnotationsAnswers } from '../../types';
import { t } from '../../i18n';
import { filterDataSourcesByType } from '@sap-ux/project-access';
import { isNotEmptyString } from '../../base/helper';

enum AnnotationFileSelectType {
    ExistingFile = 1,
    NewEmptyFile = 2
}

/**
 * Gets the prompts for adding annotations to OData service.
 *
 * @param {Record<string, ManifestNamespace.DataSource>} dataSources - Data sources from the manifest.
 * @returns {YUIQuestion<AddAnnotationsAnswers>[]} The questions/prompts.
 */
export function getPrompts(
    dataSources: Record<string, ManifestNamespace.DataSource>
): YUIQuestion<AddAnnotationsAnswers>[] {
    const dataSourceIds = Object.keys(filterDataSourcesByType(dataSources, 'OData'));
    const annotationFileSelectOptions = [
        { name: 'Select annotation file from workspace', value: AnnotationFileSelectType.ExistingFile },
        { name: 'Create an empty annotation file', value: AnnotationFileSelectType.NewEmptyFile }
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
            guiOptions: {
                type: 'file-browser',
                mandatory: true,
                hint: t('prompts.filePathTooltip')
            },
            default: '',
            when: (answers: AddAnnotationsAnswers) =>
                answers.id !== '' && answers.fileSelectOption === AnnotationFileSelectType.ExistingFile,
            validate: isNotEmptyString
        }
    ];
}
