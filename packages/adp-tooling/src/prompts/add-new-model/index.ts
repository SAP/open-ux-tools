import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type {
    ListQuestion,
    InputQuestion,
    YUIQuestion,
    EditorQuestion,
    ConfirmQuestion
} from '@sap-ux/inquirer-common';
import type { UI5FlexLayer } from '@sap-ux/project-access';
import type { Destination } from '@sap-ux/btp-utils';
import { listDestinations, isOnPremiseDestination } from '@sap-ux/btp-utils';
import { Severity, type IMessageSeverity } from '@sap-devx/yeoman-ui-types';
import type { ToolsLogger } from '@sap-ux/logger';

import { t } from '../../i18n';
import { getChangesByType } from '../../base/change-utils';
import { getBtpDestinations } from '../../cf/services/destinations';
import {
    ChangeType,
    NamespacePrefix,
    ServiceType,
    type DescriptorVariant,
    type NewModelAnswers,
    type NewModelData,
    type ManifestChangeProperties,
    FlexLayer,
    type XsApp,
    type XsAppRoute
} from '../../types';
import { isCFEnvironment } from '../../base/cf';
import { getAdpConfig } from '../../base/helper';
import {
    validateEmptyString,
    validateEmptySpaces,
    validateSpecialChars,
    hasContentDuplication,
    hasCustomerPrefix,
    isDataSourceURI,
    validateJSON
} from '@sap-ux/project-input-validator';

/**
 * Reads the routes array from the xs-app.json file in the project's webapp folder.
 * Returns an empty array if the file does not exist or cannot be parsed.
 *
 * @param {string} projectPath - The root path of the project.
 * @returns {XsAppRoute[]} The existing routes.
 */
function readXsAppRoutes(projectPath: string): XsAppRoute[] {
    try {
        const xsAppPath = join(projectPath, 'webapp', 'xs-app.json');
        const content = JSON.parse(readFileSync(xsAppPath, 'utf-8')) as XsApp;
        return Array.isArray(content?.routes) ? content.routes : [];
    } catch {
        return [];
    }
}

const serviceTypeChoices = [
    { name: ServiceType.ODATA_V2, value: ServiceType.ODATA_V2 },
    { name: ServiceType.ODATA_V4, value: ServiceType.ODATA_V4 },
    { name: ServiceType.HTTP, value: ServiceType.HTTP }
];

/**
 * Exucute generic validation for input.
 *
 * @param value The value to validate.
 * @returns {string | boolean} An error message if the value is an empty string, or true if it is not.
 */
function validatePromptInput(value: string): boolean | string {
    const validators = [validateEmptyString, validateEmptySpaces, validateSpecialChars];

    for (const validator of validators) {
        const validationResult = validator(value);
        if (typeof validationResult === 'string') {
            return validationResult;
        }
    }

    if (!/[a-zA-Z0-9]$/.test(value)) {
        return t('validators.errorInputMustEndWithAlphanumeric');
    }

    return true;
}

/**
 * Validates if a value has a customer prefix and is empty except for customer prefix.
 *
 * @param value The value to validate.
 * @param label The label of the prompt.
 * @returns {boolean | string} True if the value is valid, or an error message if validation fails.
 */
function validateCustomerValue(value: string, label: string): boolean | string {
    if (!hasCustomerPrefix(value)) {
        return t('validators.errorInputInvalidValuePrefix', {
            value: t(label),
            prefix: NamespacePrefix.CUSTOMER
        });
    }

    if (!value.replace('customer.', '').length) {
        return t('validators.errorCustomerEmptyValue', {
            value: t(label),
            prefix: NamespacePrefix.CUSTOMER
        });
    }

    return true;
}

/**
 * Validates a JSON string.
 *
 * @param value The JSON string to validate.
 * @returns {boolean | string} True if the JSON is valid, or an error message if validation fails.
 */
function validatePromptJSON(value: string): boolean | string {
    const validationResult = validateEmptyString(value);
    if (typeof validationResult === 'string') {
        return true;
    }

    return validateJSON(value);
}

/**
 * Validates the OData Service name prompt.
 *
 * @param value The value to validate.
 * @param isCustomerBase Whether the validation is for customer usage.
 * @param changeFiles The list of existing change files to check against.
 * @returns {boolean | string} True if no duplication is found, or an error message if validation fails.
 */
function validatePromptODataName(
    value: string,
    isCustomerBase: boolean,
    changeFiles: ManifestChangeProperties[]
): boolean | string {
    let validationResult = validatePromptInput(value);
    if (typeof validationResult === 'string') {
        return validationResult;
    }

    if (isCustomerBase) {
        validationResult = validateCustomerValue(value, 'prompts.modelAndDatasourceNameLabel');
        if (typeof validationResult === 'string') {
            return validationResult;
        }
    }

    if (hasContentDuplication(value, 'dataSource', changeFiles)) {
        return t('validators.errorDuplicatedValueOData');
    }

    return true;
}

/**
 * Validates the OData Source URI prompt.
 *
 * @param value The value to validate.
 * @returns {boolean | string} True if the URI is valid, or an error message if validation fails.
 */
function validatePromptURI(value: string): boolean | string {
    const validationResult = validateEmptyString(value);
    if (typeof validationResult === 'string') {
        return validationResult;
    }

    if (!isDataSourceURI(value)) {
        return t('validators.errorInvalidDataSourceURI');
    }

    return true;
}

/**
 * Builds the full resulting service URL from a destination URL and a service URI.
 * Returns undefined if either value is absent or the URI fails basic validation.
 *
 * @param {string | undefined} destinationUrl - The destination base URL.
 * @param {string | undefined} serviceUri - The relative service URI from the prompt.
 * @returns {string | undefined} The concatenated URL, or undefined if it cannot be formed.
 */
function buildResultingServiceUrl(
    destinationUrl: string | undefined,
    serviceUri: string | undefined
): string | undefined {
    if (!destinationUrl || !serviceUri || validatePromptURI(serviceUri) !== true) {
        return undefined;
    }
    return destinationUrl.replace(/\/$/, '') + serviceUri;
}

/**
 * Returns the OData version string for use in change content based on the selected service type.
 * Returns undefined for HTTP service type as it has no OData version.
 *
 * @param {ServiceType} serviceType - The selected service type.
 * @returns {string | undefined} The OData version string ('2.0' or '4.0'), or undefined for HTTP.
 */
export function getODataVersionFromServiceType(serviceType: ServiceType): string | undefined {
    if (serviceType === ServiceType.ODATA_V2) {
        return '2.0';
    }
    if (serviceType === ServiceType.ODATA_V4) {
        return '4.0';
    }
    return undefined;
}

/**
 * Resolves the backend base URL for ABAP (non-CF) projects.
 * For VS Code projects the URL is read directly from the `target.url` field in ui5.yaml.
 * For BAS projects the destination name is read from `target.destination` and the URL
 * is resolved via the BAS destination service.
 *
 * @param {string} projectPath - The root path of the project.
 * @returns {Promise<string | undefined>} The resolved base URL, or undefined if it cannot be determined.
 */
async function getAbapServiceUrl(projectPath: string): Promise<string | undefined> {
    try {
        const { target } = (await getAdpConfig(projectPath, 'ui5.yaml')) as any;

        if (!target) {
            return undefined;
        }

        if (target.url) {
            return target.url;
        }
        if (target.destination) {
            const destinations = await listDestinations();
            return destinations[target.destination]?.Host;
        }
    } catch {
        // Message will not be shown
    }
    return undefined;
}

/**
 * Fetches destination choices for CF environments.
 * Returns the choices and a generic UI error message if the fetch fails, logging the original error.
 *
 * @param {string} projectPath - The root path of the project.
 * @param {ToolsLogger} [logger] - Optional logger for error details.
 * @returns {Promise<{ choices: { name: string; value: Destination }[]; error?: string }>} The destination choices and an optional error message.
 */
async function getDestinationChoices(
    projectPath: string,
    logger?: ToolsLogger
): Promise<{ choices: { name: string; value: Destination }[]; error?: string }> {
    try {
        const destinations = await getBtpDestinations(projectPath);
        const choices = Object.entries(destinations).map(([name, dest]) => ({
            name,
            value: dest as Destination
        }));
        return { choices };
    } catch (e) {
        logger?.error((e as Error).message);
        return { choices: [], error: t('error.errorFetchingDestinations') };
    }
}

/**
 * Gets the prompts for adding the new model.
 *
 * @param {string} projectPath - The root path of the project.
 * @param {UI5FlexLayer} layer - UI5 Flex layer.
 * @param {ToolsLogger} [logger] - Optional logger.
 * @returns {YUIQuestion<NewModelAnswers>[]} The questions/prompts.
 */
export async function getPrompts(
    projectPath: string,
    layer: UI5FlexLayer,
    logger?: ToolsLogger
): Promise<YUIQuestion<NewModelAnswers>[]> {
    const isCustomerBase = FlexLayer.CUSTOMER_BASE === layer;
    const defaultSeviceName = isCustomerBase ? NamespacePrefix.CUSTOMER : NamespacePrefix.EMPTY;
    const isCFEnv = await isCFEnvironment(projectPath);
    const abapServiceUrl = isCFEnv ? undefined : await getAbapServiceUrl(projectPath);

    const changeFiles = [
        ...getChangesByType(projectPath, ChangeType.ADD_NEW_MODEL),
        ...getChangesByType(projectPath, ChangeType.ADD_NEW_DATA_SOURCE)
    ];
    let destinationError: string | undefined;
    let destinationChoices: { name: string; value: Destination }[] | undefined;

    if (isCFEnv) {
        ({ choices: destinationChoices, error: destinationError } = await getDestinationChoices(projectPath, logger));
    }

    const buildResultingUrlMessage = (
        i18nKey: string,
        uri: unknown,
        previousAnswers?: NewModelAnswers
    ): IMessageSeverity | undefined => {
        const destinationUrl = isCFEnv ? previousAnswers?.destination?.Host : abapServiceUrl;
        const resultingUrl = buildResultingServiceUrl(destinationUrl, uri as string | undefined);
        if (!resultingUrl) {
            return undefined;
        }
        return {
            message: t(i18nKey, { url: resultingUrl, interpolation: { escapeValue: false } }),
            severity: Severity.information
        };
    };

    return [
        {
            type: 'list',
            name: 'serviceType',
            message: t('prompts.serviceTypeLabel'),
            choices: isCFEnv ? serviceTypeChoices : serviceTypeChoices.filter((c) => c.value !== ServiceType.HTTP),
            store: false,
            validate: validateEmptyString,
            guiOptions: {
                mandatory: true,
                hint: t('prompts.serviceTypeTooltip')
            }
        } as ListQuestion<NewModelAnswers>,
        {
            type: 'list',
            name: 'destination',
            message: t('prompts.destinationLabel'),
            choices: (): { name: string; value: Destination }[] => destinationChoices ?? [],
            when: () => isCFEnv,
            guiOptions: {
                mandatory: true,
                hint: t('prompts.destinationTooltip')
            },
            validate: (value: Destination): boolean | string => destinationError ?? validateEmptyString(value?.Name)
        } as ListQuestion<NewModelAnswers>,
        {
            type: 'input',
            name: 'uri',
            message: t('prompts.serviceUriLabel'),
            guiOptions: {
                mandatory: true,
                hint: t('prompts.oDataServiceUriTooltip')
            },
            validate: (value: string): boolean | string => {
                const uriResult = validatePromptURI(value);
                if (typeof uriResult === 'string') {
                    return uriResult;
                }
                if (isCFEnv && readXsAppRoutes(projectPath).some((r) => r.target === `${value}$1`)) {
                    return t('validators.errorRouteAlreadyExists');
                }
                return true;
            },
            store: false,
            additionalMessages: (uri: unknown, previousAnswers?: NewModelAnswers): IMessageSeverity | undefined =>
                buildResultingUrlMessage('prompts.resultingServiceUrl', uri, previousAnswers)
        } as InputQuestion<NewModelAnswers>,
        {
            type: 'input',
            name: 'modelAndDatasourceName',
            message: (answers: NewModelAnswers) =>
                answers.serviceType === ServiceType.HTTP
                    ? t('prompts.datasourceNameLabel')
                    : t('prompts.modelAndDatasourceNameLabel'),
            default: defaultSeviceName,
            store: false,
            validate: (value: string) => {
                return validatePromptODataName(value, isCustomerBase, changeFiles);
            },
            guiOptions: {
                mandatory: true,
                hint: t('prompts.modelAndDatasourceNameTooltip')
            }
        } as InputQuestion<NewModelAnswers>,
        {
            type: 'editor',
            name: 'modelSettings',
            message: t('prompts.oDataServiceModelSettingsLabel'),
            store: false,
            validate: validatePromptJSON,
            when: (answers: NewModelAnswers) => answers.serviceType !== ServiceType.HTTP,
            guiOptions: {
                hint: t('prompts.oDataServiceModelSettingsTooltip')
            }
        } as EditorQuestion<NewModelAnswers>,
        {
            type: 'confirm',
            name: 'addAnnotationMode',
            message: 'Do you want to add annotation?',
            default: false,
            when: (answers: NewModelAnswers) => answers.serviceType !== ServiceType.HTTP
        } as ConfirmQuestion<NewModelAnswers>,
        {
            type: 'input',
            name: 'dataSourceURI',
            message: t('prompts.oDataAnnotationDataSourceUriLabel'),
            validate: validatePromptURI,
            store: false,
            guiOptions: {
                mandatory: true,
                hint: t('prompts.oDataAnnotationDataSourceUriTooltip')
            },
            when: (answers: NewModelAnswers) => answers.addAnnotationMode,
            additionalMessages: (uri: unknown, previousAnswers?: NewModelAnswers): IMessageSeverity | undefined =>
                buildResultingUrlMessage('prompts.resultingAnnotationUrl', uri, previousAnswers)
        } as InputQuestion<NewModelAnswers>,
        {
            type: 'editor',
            name: 'annotationSettings',
            message: t('prompts.oDataAnnotationSettingsLabel'),
            validate: validatePromptJSON,
            store: false,
            guiOptions: {
                hint: t('prompts.oDataAnnotationSettingsTooltip')
            },
            when: (answers: NewModelAnswers) => answers.addAnnotationMode
        } as EditorQuestion<NewModelAnswers>
    ];
}

/**
 * Builds the NewModelData object from the prompts answers.
 *
 * @param {string} projectPath - The root path of the project.
 * @param {DescriptorVariant} variant - The descriptor variant of the adaptation project.
 * @param {NewModelAnswers} answers - The answers to the prompts.
 * @param {ToolsLogger} [logger] - Optional logger instance.
 * @returns {Promise<NewModelData>} The data required by NewModelWriter.
 */
export async function createNewModelData(
    projectPath: string,
    variant: DescriptorVariant,
    answers: NewModelAnswers,
    logger?: ToolsLogger
): Promise<NewModelData> {
    const { modelAndDatasourceName, uri, serviceType, modelSettings, addAnnotationMode } = answers;
    const isCloudFoundry = await isCFEnvironment(projectPath);
    return {
        variant,
        serviceType,
        isCloudFoundry,
        destinationName: isCloudFoundry ? answers.destination?.Name : undefined,
        ...(isCloudFoundry &&
            answers.destination && {
                isOnPremiseDestination: isOnPremiseDestination(answers.destination)
            }),
        logger,
        service: {
            name: modelAndDatasourceName,
            uri,
            modelName: serviceType === ServiceType.HTTP ? undefined : modelAndDatasourceName,
            version: getODataVersionFromServiceType(serviceType),
            modelSettings
        },
        ...(addAnnotationMode && {
            annotation: {
                dataSourceName: `${modelAndDatasourceName}.annotation`,
                dataSourceURI: answers.dataSourceURI,
                settings: answers.annotationSettings
            }
        })
    };
}
