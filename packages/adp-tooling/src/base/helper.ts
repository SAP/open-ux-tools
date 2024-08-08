import { readFileSync } from 'fs';
import { join, isAbsolute } from 'path';

import { UI5Config } from '@sap-ux/ui5-config';
import type { DescriptorVariant, AdpPreviewConfig, ParamCheck, Parameter } from '../types';

/**
 * Get the app descriptor variant.
 *
 * @param {string} basePath - The path to the adaptation project.
 * @returns {DescriptorVariant} The app descriptor variant.
 */
export function getVariant(basePath: string): DescriptorVariant {
    return JSON.parse(readFileSync(join(basePath, 'webapp', 'manifest.appdescr_variant'), 'utf-8'));
}

/**
 * Returns the adaptation project configuration, throws an error if not found.
 *
 * @param {string} basePath - The path to the adaptation project.
 * @param {string} yamlPath - The path to yaml configuration file.
 * @returns {Promise<AdpPreviewConfig>} the adp configuration
 */
export async function getAdpConfig(basePath: string, yamlPath: string): Promise<AdpPreviewConfig> {
    const ui5ConfigPath = isAbsolute(yamlPath) ? yamlPath : join(basePath, yamlPath);
    const ui5Conf = await UI5Config.newInstance(readFileSync(ui5ConfigPath, 'utf-8'));
    const customMiddlerware =
        ui5Conf.findCustomMiddleware<{ adp: AdpPreviewConfig }>('fiori-tools-preview') ??
        ui5Conf.findCustomMiddleware<{ adp: AdpPreviewConfig }>('preview-middleware');
    const adp = customMiddlerware?.configuration?.adp;
    if (!adp) {
        throw new Error('No system configuration found in ui5.yaml');
    }
    return adp;
}

const defaultParamCheck = { shouldApply: false, value: undefined };
const rules = {
    isEmptyParam: (paramString: string): ParamCheck => {
        if (/^.+=\s*$/g.test(paramString)) {
            return {
                shouldApply: true,
                value: paramString.replace(/=/g, '').trim()
            };
        }
        return defaultParamCheck;
    },
    isMandatoryParam: (paramString: string): boolean => {
        return !(paramString.trim().startsWith('(') && paramString.trim().endsWith(')'));
    },
    shouldHavеFiltertValue: (paramString: string): ParamCheck => {
        if (paramString.startsWith('<') && paramString.endsWith('>')) {
            return {
                shouldApply: true,
                value: paramString.replace(/[<>]/g, '')
            };
        }

        return defaultParamCheck;
    },
    shouldRenameTo: (paramString: string): ParamCheck => {
        if (paramString.trim().startsWith('>')) {
            return {
                shouldApply: true,
                value: paramString.trim().replace(/>/g, '')
            };
        }

        return defaultParamCheck;
    },

    isReference: (paramString: string): ParamCheck => {
        if (paramString.startsWith('%%') && paramString.endsWith('%%')) {
            return {
                shouldApply: true,
                value: paramString.replace(/%/g, '')
            };
        }
        return defaultParamCheck;
    }
};

const genericErrorMessage = (error: string) =>
    `Value cannot be parsed: ${error}! Please check the entered value and if needed create ticket for the application component in order to get the proper value.`;

export function parseParameters(paramString: string): Parameter {
    let result = {};
    const modifiedParamString = addMissingAmpersands(paramString);
    const params = modifiedParamString
        .split('&')
        .map((el) => el.trim())
        .filter((el) => el !== '');
    params.forEach((param) => {
        const isMandatory = rules.isMandatoryParam(param);
        if (!isMandatory) {
            param = param.replace(/[()]/g, '');
        }

        const isEmptyParamCheck = rules.isEmptyParam(param);
        if (isEmptyParamCheck.shouldApply && isEmptyParamCheck.value) {
            checkForDuplicatedKeys(result, isEmptyParamCheck.value);
            result = Object.assign(result, { [isEmptyParamCheck.value]: {} });
        } else {
            const paramParts = param
                .split('=')
                .map((el) => el.trim())
                .filter((el) => el !== '');
            if (paramParts.length <= 1 || paramParts.length > 3) {
                throw new SyntaxError(genericErrorMessage('Invalid parameters string'));
            }

            result = Object.assign(result, construct(paramParts, isMandatory, result));
        }
    });

    return result;
}

function addMissingAmpersands(value: string): string {
    return value.replace(/[)]\s*[(]/gm, ')&(');
}

function checkForDuplicatedKeys(parameters: Parameter, key: string): void {
    Object.keys(parameters).forEach((existingKey) => {
        if (existingKey === key) {
            throw new Error(genericErrorMessage(`Duplicated parameter: '${key}'`));
        }
    });
}

function construct(parts: string[], isMandatory: boolean, parameters: Parameter): Parameter {
    const resultObject: Parameter = {};
    const paramName = parts[0];
    checkForDuplicatedKeys(parameters, paramName);

    resultObject[paramName] = {
        required: isMandatory
    };

    if (parts.length === 2) {
        const shouldRenameCheck = rules.shouldRenameTo(parts[1]);
        if (shouldRenameCheck.shouldApply) {
            resultObject[paramName].renameTo = shouldRenameCheck.value;

            return resultObject;
        }

        applyRules(resultObject[paramName], parts[1]);
        return resultObject;
    }

    const secondParamPart = parts[1];
    const thirdParamPart = parts[2];

    applyRules(resultObject[paramName], secondParamPart);
    const shouldRenameCheck = rules.shouldRenameTo(thirdParamPart);
    if (shouldRenameCheck.shouldApply) {
        resultObject[paramName].renameTo = shouldRenameCheck.value;
    }

    return resultObject;
}

function applyRules(resultObject: any, paramPartString: string): void {
    const shouldFilterDefaultValueCheck = rules.shouldHavеFiltertValue(paramPartString);
    const isReferenceCheck = rules.isReference(paramPartString);
    if (shouldFilterDefaultValueCheck.shouldApply && !isReferenceCheck.shouldApply) {
        resultObject.filter = {
            value: shouldFilterDefaultValueCheck.value,
            format: 'plain'
        };
    } else if (!shouldFilterDefaultValueCheck.shouldApply && !isReferenceCheck.shouldApply) {
        resultObject.defaultValue = {
            value: paramPartString,
            format: 'plain'
        };
    } else {
        resultObject.defaultValue = {
            value: isReferenceCheck.value,
            format: 'reference'
        };
    }
}
