import type { InputQuestion } from '@sap-ux/inquirer-common';
import type { Answers, ListQuestion, Question, NumberQuestion } from 'inquirer';
import type { AdpChangeDataSourceAnswers, AdpChangeDataSourceQuestions } from '../../../types';
import { t } from '../../../i18n';
import { validateURI, validateODataServices } from '../../validators';

const ODATA_V2_PREFIX_ABAP = '/sap/opu/odata/';
const ODATA_V4_PREFIX_ABAP = '/sap/opu/odata4/';
const ODATA_V2_PREFIX_CF = 'odata/v2/';
const ODATA_V4_PREFIX_CF = 'odata/v4/';
const ODATA_V2 = 'V2';
const ODATA_V4 = 'V4';

type ShowDataVersionInfoMessage = {
    currentURI: string;
    isForV2: boolean;
    replaceURI: string;
    isCFEnv: boolean;
};

type ShowAnnotationDataVersionInfoMessage = {
    selectedDataSource: string;
    isForV2: boolean;
    replaceURI: string;
    isCFEnv: boolean;
    oDataSourcesDictionary: { [key: string]: string | undefined };
    oDataAnnotations: { [key: string]: string };
};

/**
 * Checks if the OData URI message should be shown.
 *
 * @param {string} uri - the new OData URI from prompt answers
 * @param {boolean} isCFEnv - is the project CF or ABAP
 * @returns {boolean} - true if the OData URI message should be shown
 */
function shouldShowODataUriInfo(uri: string, isCFEnv: boolean): boolean {
    if (!uri || uri.includes(' ')) {
        return false;
    }
    return !(
        uri.startsWith(isCFEnv ? ODATA_V2_PREFIX_CF : ODATA_V2_PREFIX_ABAP) ||
        uri.startsWith(isCFEnv ? ODATA_V4_PREFIX_CF : ODATA_V4_PREFIX_ABAP)
    );
}

/**
 * Get the prefix of the OData service.
 *
 * @param {boolean} isCFEnv - is the project CF or ABAP
 * @param {number} version - the version of the OData service
 * @returns {string} - the prefix of the OData service
 */
function getPrefix(isCFEnv: boolean, version: number) {
    if (isCFEnv) {
        return version === 2 ? ODATA_V2_PREFIX_CF : ODATA_V4_PREFIX_CF;
    }
    return version === 2 ? ODATA_V2_PREFIX_ABAP : ODATA_V4_PREFIX_ABAP;
}

/**
 * Get the version of the OData service.
 *
 * @param {string} uri - the URI of the OData service
 * @param {boolean} isCFEnv - is the project CF or ABAP
 * @returns {string} - the version of the OData service
 */
function getVersion(uri: string, isCFEnv: boolean) {
    return uri.split('/').filter(Boolean)[isCFEnv ? 1 : 2];
}
/**
 * Checks if the OData version info message should be shown.
 *
 * @param {ShowDataVersionInfoMessage} data - the data for the OData service
 * @returns {boolean} - true if the OData version info message should be shown
 */
function shouldShowODataVersionInfoMessage(data: ShowDataVersionInfoMessage): boolean {
    if (!data.currentURI || !data.currentURI.startsWith(getPrefix(data.isCFEnv, data.isForV2 ? 2 : 4))) {
        return false;
    }
    const currentVersion = getVersion(data.currentURI, data.isCFEnv);
    const currentODataPrefix = getPrefix(data.isCFEnv, data.isForV2 ? 4 : 2);
    return data.replaceURI.startsWith(currentODataPrefix) && currentVersion.endsWith(data.isForV2 ? 'v2' : 'v4');
}

/**
 * Checks if the Annotation OData version info message should be shown.
 *
 * @param {ShowAnnotationDataVersionInfoMessage} data - the data for the OData service
 * @returns {boolean} - true if the Annotation OData version info message should be shown
 */
function shouldShowAnnotationODataVersionInfoMessage(data: ShowAnnotationDataVersionInfoMessage): boolean {
    const selectOdataSourceAnnotation = data.oDataSourcesDictionary[data.selectedDataSource];
    if (!selectOdataSourceAnnotation) {
        return false;
    }
    const annotationUri = data.oDataAnnotations[selectOdataSourceAnnotation];
    return shouldShowODataVersionInfoMessage({
        currentURI: annotationUri,
        isForV2: data.isForV2,
        replaceURI: data.replaceURI,
        isCFEnv: data.isCFEnv
    });
}

/**
 * Gets the questions for changing the data source.
 *
 * @param {AdpChangeDataSourceQuestions} data - the data for the questions
 * @returns {Question<AdpChangeDataSourceAnswers>[]} - the questions
 */
export function getQuestions(data: AdpChangeDataSourceQuestions): Question<AdpChangeDataSourceAnswers>[] {
    return [
        {
            type: 'input',
            name: 'isInSafeMode',
            message: t('prompts.isInSafeModeLabel'),
            guiOptions: {
                type: 'label'
            },
            when: () => data.isInSafeMode && data.isYUI
        } as InputQuestion<AdpChangeDataSourceAnswers>,
        {
            type: 'list',
            name: 'oDataSource',
            message: t('prompts.oDataSourceLabel'),
            choices: data.oDataSources?.map((dS) => dS.dataSourceName) ?? [],
            default: data.oDataSources?.[0]?.dataSourceName,
            store: false,
            guiOptions: {
                mandatory: true,
                hint: t('prompts.oDataSourceTooltip')
            },
            validate: (value: string) => validateODataServices(value, data.oDataSources)
        } as ListQuestion<AdpChangeDataSourceAnswers>,
        {
            type: 'input',
            name: 'oDataSourceURI',
            message: t('prompts.oDataSourceURILabel'),
            guiOptions: {
                mandatory: true,
                hint: t('prompts.oDataSourceURITooltip')
            },
            validate: (value: string) => validateURI(value, t('prompts.oDataSourceURILabel')),
            when: !!data.oDataSources.length,
            store: false
        } as InputQuestion<AdpChangeDataSourceAnswers>,
        {
            type: 'input',
            name: 'oDataURIInfo',
            message: () => {
                let v2Prefix: string, v4Prefix: string;
                if (data.isCFEnv) {
                    v2Prefix = ODATA_V2_PREFIX_CF;
                    v4Prefix = ODATA_V4_PREFIX_CF;
                } else {
                    v2Prefix = ODATA_V2_PREFIX_ABAP;
                    v4Prefix = ODATA_V4_PREFIX_ABAP;
                }
                return t('prompts.oDataURIInfoLabel', { v2Prefix, v4Prefix });
            },
            when: (answers: Answers) => data.isYUI && shouldShowODataUriInfo(answers.oDataSourceURI, data.isCFEnv),
            guiOptions: {
                type: 'label',
                applyDefaultWhenDirty: true
            }
        } as InputQuestion<AdpChangeDataSourceAnswers>,
        {
            type: 'input',
            name: 'oDataURIV2Info',
            message: () => {
                const versionOne = 'V2';
                const versionTwo = 'V4';
                return t('prompts.oDataURIV2InfoLabel', { versionOne, versionTwo });
            },
            when: (answers: Answers) =>
                data.isYUI &&
                shouldShowODataVersionInfoMessage({
                    currentURI: data.oDataServicesWithURI[answers.targetODataSource],
                    isForV2: true,
                    replaceURI: answers.oDataSourceURI,
                    isCFEnv: data.isCFEnv
                }),
            guiOptions: {
                type: 'label',
                applyDefaultWhenDirty: true
            }
        } as InputQuestion<AdpChangeDataSourceAnswers>,
        {
            type: 'input',
            name: 'oDataURIV4Info',
            message: () => {
                return t('prompts.oDataURIV2InfoLabel', { versionOne: ODATA_V4, versionTwo: ODATA_V2 });
            },
            when: (answers: Answers) =>
                data.isYUI &&
                shouldShowODataVersionInfoMessage({
                    currentURI: data.oDataServicesWithURI[answers.targetODataSource],
                    isForV2: false,
                    replaceURI: answers.oDataSourceURI,
                    isCFEnv: data.isCFEnv
                }),
            guiOptions: {
                type: 'label',
                applyDefaultWhenDirty: true
            }
        } as InputQuestion<AdpChangeDataSourceAnswers>,
        {
            type: 'number',
            name: 'maxAge',
            message: t('prompts.maxAgeLabel'),
            guiOptions: {
                mandatory: false
            },
            when: (answers: Answers) => answers.oDataSourceURI !== '',
            default: null
        } as NumberQuestion<AdpChangeDataSourceAnswers>,
        {
            type: 'input',
            name: 'oDataAnnotationSourceURI',
            message: t('prompts.oDataAnnotationSourceURILabel'),
            validate: (value: string) => validateURI(value, t('prompts.oDataAnnotationSourceURILabel'), false),
            guiOptions: {
                mandatory: false,
                hint: t('prompts.oDataAnnotationSourceURITooltip')
            },
            when: (answers: Answers) => {
                const selectedOdataSource = answers.oDataSource;
                const selectOdataSourceAnnotation = data.oDataSourcesDictionary[selectedOdataSource];
                if (!selectOdataSourceAnnotation) {
                    return false;
                }
                const annotationUri = data.oDataAnnotations[selectOdataSourceAnnotation];

                return annotationUri.startsWith(ODATA_V2_PREFIX_ABAP) || annotationUri.startsWith(ODATA_V4_PREFIX_ABAP);
            }
        } as InputQuestion<AdpChangeDataSourceAnswers>,
        {
            type: 'input',
            name: 'oDataAnnotationURIInfo',
            message: () => {
                let v2Prefix: string, v4Prefix: string;
                if (data.isCFEnv) {
                    v2Prefix = ODATA_V2_PREFIX_CF;
                    v4Prefix = ODATA_V4_PREFIX_CF;
                } else {
                    v2Prefix = ODATA_V2_PREFIX_ABAP;
                    v4Prefix = ODATA_V4_PREFIX_ABAP;
                }
                return t('prompts.oDataURIInfoLabel', { v2Prefix, v4Prefix });
            },
            when: (answers: Answers) =>
                data.isYUI && shouldShowODataUriInfo(answers.oDataAnnotationSourceURI, data.isCFEnv),
            guiOptions: {
                type: 'label',
                applyDefaultWhenDirty: true
            }
        } as InputQuestion<AdpChangeDataSourceAnswers>,
        {
            type: 'input',
            name: 'oDataAnnotationURIV2Info',
            message: () => t('prompts.oDataURIV2InfoLabel', { versionOne: ODATA_V2, versionTwo: ODATA_V4 }),
            when: (answers: Answers) =>
                data.isYUI &&
                shouldShowAnnotationODataVersionInfoMessage({
                    selectedDataSource: answers.targetODataSource,
                    isForV2: true,
                    replaceURI: answers.oDataAnnotationSourceURI,
                    isCFEnv: data.isCFEnv,
                    oDataSourcesDictionary: data.oDataSourcesDictionary,
                    oDataAnnotations: data.oDataAnnotations
                }),
            guiOptions: {
                type: 'label',
                applyDefaultWhenDirty: true
            }
        } as InputQuestion<AdpChangeDataSourceAnswers>,
        {
            type: 'input',
            name: 'oDataAnnotationURIV4Info',
            message: () => t('prompts.oDataURIV2InfoLabel', { versionOne: ODATA_V4, versionTwo: ODATA_V2 }),
            when: (answers: Answers) =>
                data.isYUI &&
                shouldShowAnnotationODataVersionInfoMessage({
                    selectedDataSource: answers.targetODataSource,
                    isForV2: false,
                    replaceURI: answers.oDataAnnotationSourceURI,
                    isCFEnv: data.isCFEnv,
                    oDataSourcesDictionary: data.oDataSourcesDictionary,
                    oDataAnnotations: data.oDataAnnotations
                }),
            guiOptions: {
                type: 'label',
                applyDefaultWhenDirty: true
            }
        } as InputQuestion<AdpChangeDataSourceAnswers>
    ];
}
