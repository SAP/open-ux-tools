import type { ParamCheck, Parameter, ParameterOptions, ParameterRules } from '../types';

const defaultParamCheck = { shouldApply: false, value: undefined };
const rules: ParameterRules = {
    isEmptyParam: (paramString: string): ParamCheck => {
        if (/^.+=\s*$/g.test(paramString)) {
            return {
                shouldApply: true,
                value: paramString.replaceAll('=', '').trim()
            };
        }
        return defaultParamCheck;
    },
    isMandatoryParam: (paramString: string): boolean => {
        return !(paramString.trim().startsWith('(') && paramString.trim().endsWith(')'));
    },
    shouldHavеFilteredValue: (paramString: string): ParamCheck => {
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

/**
 * Parse parameters string into parameters object.
 *
 * @param {string} paramString - parameters string
 * @returns {Parameter} parsed parameters string object
 */
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

/**
 * Fuction that adds missing & between parameters if needed.
 *
 * @param {string} value - parameters string
 * @returns {string} modified value
 */
function addMissingAmpersands(value: string): string {
    return value.replace(/\)\s*\(/gm, ')&(');
}

/**
 * Fuction that checks of there are duplicated properties in Parameter object while constructing.
 *
 * @param {Parameter} parameters - parsed parameters
 * @param {string} key - property for check
 * @throws if there are duplicated properties
 */
function checkForDuplicatedKeys(parameters: Parameter, key: string): void {
    Object.keys(parameters).forEach((existingKey) => {
        if (existingKey === key) {
            throw new Error(genericErrorMessage(`Duplicated parameter: '${key}'`));
        }
    });
}

/**
 * Fuction that construct parameters object applying parameters rules.
 *
 * @param {string[]} paramParts - current parameter parts
 * @param {boolean} isMandatory - whether param is mandatory
 * @param {Parameter} parameters - constructed parameters
 * @returns {Parameter} constucted parameters
 */
function construct(paramParts: string[], isMandatory: boolean, parameters: Parameter): Parameter {
    const constructedParams: Parameter = {};
    const paramName = paramParts[0];
    checkForDuplicatedKeys(parameters, paramName);

    constructedParams[paramName] = {
        required: isMandatory
    };

    if (paramParts.length === 2) {
        const shouldRenameCheck = rules.shouldRenameTo(paramParts[1]);
        if (shouldRenameCheck.shouldApply) {
            constructedParams[paramName].renameTo = shouldRenameCheck.value;

            return constructedParams;
        }

        applyRules(constructedParams[paramName], paramParts[1]);
        return constructedParams;
    }

    const secondParamPart = paramParts[1];
    const thirdParamPart = paramParts[2];

    applyRules(constructedParams[paramName], secondParamPart);
    const shouldRenameCheck = rules.shouldRenameTo(thirdParamPart);
    if (shouldRenameCheck.shouldApply) {
        constructedParams[paramName].renameTo = shouldRenameCheck.value;
    }

    return constructedParams;
}

/**
 * Function that applies parameter rules.
 *
 * @param {ParameterOptions} options - parameter options
 * @param {string} paramValue - parameter value
 */
function applyRules(options: ParameterOptions, paramValue: string): void {
    const shouldFilterDefaultValueCheck = rules.shouldHavеFilteredValue(paramValue);
    const isReferenceCheck = rules.isReference(paramValue);
    if (
        shouldFilterDefaultValueCheck.shouldApply &&
        !isReferenceCheck.shouldApply &&
        shouldFilterDefaultValueCheck.value
    ) {
        options.filter = {
            value: shouldFilterDefaultValueCheck.value,
            format: 'plain'
        };
    } else if (!shouldFilterDefaultValueCheck.shouldApply && !isReferenceCheck.shouldApply) {
        options.defaultValue = {
            value: paramValue,
            format: 'plain'
        };
    } else if (isReferenceCheck.shouldApply && isReferenceCheck.value) {
        options.defaultValue = {
            value: isReferenceCheck.value,
            format: 'reference'
        };
    }
}
