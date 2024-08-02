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

// TODO: Add correct typings, ts-ignored for now
export function parseFlpParamString(paramString: string): FlpParameter {
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

function addMissingAmpersands(value: string): string {
    return value.replace(/[)]\s*[(]/gm, ')&(');
}

function checkForDuplicatedKeys(parameters: FlpParameter, key: string): void {
    Object.keys(parameters).forEach((existingKey) => {
        if (existingKey === key) {
            throw new Error(genericErrorMessage(`Duplicated parameter: '${key}'`));
        }
    });
}

function construct(parts: string[], isMandatory: boolean, parameters: FlpParameter): FlpParameter {
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
