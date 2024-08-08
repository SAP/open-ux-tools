interface ParamCheck {
    shouldApply: boolean;
    value: string | undefined;
}

interface FlpParameter {
    [key: string]: {
        required: boolean;
        filter?: Value;
        defaultValue?: Value;
        renameTo?: string;
    };
}

interface Value {
    value: string;
    format: string;
}

const genericErrorMessage = (error: string) =>
    `Value cannot be parsed: ${error}! Please check the entered value and if needed create ticket for the application component in order to get the proper value.`;

export function validateFlpParamString(paramString: string): boolean | string {
    if (!paramString) {
        return true;
    }

    try {
        parseFlpParamString(paramString);
    } catch (error) {
        return error.message;
    }

    return true;
}

/**
 * Parses a string of FLP parameters into a structured object based on predefined rules.
 * This includes adding missing ampersands, checking for mandatory parameters, handling empty
 * parameters, duplications, and constructing parameter objects based on specific conditions.
 *
 * @param {string} paramString - The string of parameters to parse.
 * @returns {FlpParameter} - The structured representation of FLP parameters.
 * @throws {SyntaxError} - Thrown if the parameter string is invalid or contains errors.
 */
export function parseFlpParamString(paramString: string): FlpParameter {
    // TODO: Add correct typings, ts-ignored for now
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
        if (isEmptyParamCheck.shouldApply) {
            // @ts-ignore
            checkForDuplicatedKeys(result, isEmptyParamCheck.value);
            const emptyParam = {};
            // @ts-ignore
            emptyParam[isEmptyParamCheck.value] = {};
            result = Object.assign(result, emptyParam);
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
 * Adds missing ampersands between parameter pairs in the provided string.
 * This function ensures that the parameter string is correctly formatted for further parsing.
 *
 * @param {string} value - The original parameter string.
 * @returns {string} The corrected parameter string with added ampersands where necessary.
 */
function addMissingAmpersands(value: string): string {
    return value.replace(/[)]\s*[(]/gm, ')&(');
}

/**
 * Checks for duplicated keys in a parameter object and throws an error if duplicates are found.
 *
 * @param {FlpParameter} parameters - The parameter object to check for duplicated keys.
 * @param {string} key - The key to check for duplication within the parameters object.
 * @throws {Error} - Throws if a duplicate key is found.
 */
function checkForDuplicatedKeys(parameters: FlpParameter, key: string): void {
    Object.keys(parameters).forEach((existingKey) => {
        if (existingKey === key) {
            throw new Error(genericErrorMessage(`Duplicated parameter: '${key}'`));
        }
    });
}

/**
 * Constructs a parameter object from parts of a parsed parameter string, applying specific rules
 * based on whether the parameter is mandatory or not.
 *
 * @param {string[]} parts - The parts of a single parameter string, split by '='.
 * @param {boolean} isMandatory - Whether the parameter is considered mandatory.
 * @param {FlpParameter} parameters - The existing parameters object to which the new parameter will be added.
 * @returns {FlpParameter} The updated parameter object with the new parameter added.
 */
export function construct(parts: string[], isMandatory: boolean, parameters: FlpParameter): FlpParameter {
    const resultObject = {};
    const paramName = parts[0];
    checkForDuplicatedKeys(parameters, paramName);
    // @ts-ignore
    resultObject[paramName] = {
        required: isMandatory
    };

    if (parts.length === 2) {
        const shouldRenameCheck = rules.shouldRenameTo(parts[1]);
        if (shouldRenameCheck.shouldApply) {
            // @ts-ignore
            resultObject[paramName].renameTo = shouldRenameCheck.value;

            return resultObject;
        }
        // @ts-ignore
        applyRules(resultObject[paramName], parts[1]);
        return resultObject;
    }

    const secondParamPart = parts[1];
    const thirdParamPart = parts[2];
    // @ts-ignore
    applyRules(resultObject[paramName], secondParamPart);
    const shouldRenameCheck = rules.shouldRenameTo(thirdParamPart);
    if (shouldRenameCheck.shouldApply) {
        // @ts-ignore
        resultObject[paramName].renameTo = shouldRenameCheck.value;
    }

    return resultObject;
}

/**
 * Applies specific formatting and value rules to a parameter object based on the given parameter part string.
 *
 * @param {any} resultObject - The parameter object to which rules are being applied.
 * @param {string} paramPartString - The part of the parameter string that contains potential rule triggers.
 */
export function applyRules(resultObject: any, paramPartString: string): void {
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
