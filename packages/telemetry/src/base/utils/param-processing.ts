type valuePrimitive = number | string;
type instruction = ParamRecordConfigField | string | undefined;
export type dimensions = { [key: string]: string };
export type measurements = { [key: string]: number };

/**
 * ParamRecordConfigField
 */
export class ParamRecordConfigField {
    path: string;

    /**
     *
     * @param path input path
     */
    constructor(path: string) {
        this.path = path;
    }
}

/**
 *
 */
export class ParamRecordConfig {
    key: string | undefined;
    value: instruction;
    paramIndex: number | undefined;
    /**
     *
     * @param key - string or undefined;
     * When string set as key of new field;
     * When undefined key of new field set to - 'data';
     * @param value - instance of ParamRecordConfigField, string or undefined;
     * When instance of ParamRecordConfigField data gets extracted from specified path of parameter under index specified in @param paramIndex;
     * When string set as value of new field;
     * When undefined - new fields value being set as parameter under index of @param paramIndex;
     * @param paramIndex - optional, number or undefined;
     * When number - speicifes index of parameter to capture or extract data from;
     * Set to undefined when want to use strin passed as @param value as new fields value;
     */
    constructor(
        key: string | undefined = undefined,
        value: instruction = undefined,
        paramIndex: number | undefined = undefined
    ) {
        this.key = key;
        this.value = value;
        this.paramIndex = paramIndex;
    }
}

export const wrongPathErr = (field: string, index: number): Error =>
    new Error(`Wrong path for '${field}' field is specified in instructions with index - ${index}`);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getValue = (obj: any, path: string, field: string, paramIndex: number): number | string => {
    const pathArr: string[] = path.split('/');

    let node = obj,
        i = 0;

    while (i < pathArr.length) {
        node = node[pathArr[i]];
        if (node === undefined) {
            throw wrongPathErr(field, paramIndex);
        }
        i++;
    }
    return node;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const paramsProcessing = (params: any, instructions: ParamRecordConfig): [dimensions, measurements] => {
    const processedDimensions: dimensions = {};
    const processedMeasurements: measurements = {};

    let param: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (instructions.paramIndex !== undefined) {
        param = params[instructions.paramIndex];
    }

    const key: string = instructions.key ? instructions.key : 'data';
    let val: valuePrimitive = '';

    if (typeof instructions.value === 'string') {
        val = instructions.value;
    } else if (instructions.value !== undefined && instructions.paramIndex !== undefined) {
        val = getValue(param, instructions.value.path, 'val', instructions.paramIndex);
    } else {
        val = param;
    }

    if (!isNaN(val as number)) {
        processedMeasurements[key] = val as number;
    } else {
        processedDimensions[key] = val as string;
    }

    return [processedDimensions, processedMeasurements];
};

export const getParamsData = (
    params: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    instructions: ParamRecordConfig[] | ParamRecordConfig
): [dimensions, measurements] => {
    let processedDimensions, processedMeasurements;
    let customDimensions: dimensions = {};
    let customMeasurements: measurements = {};

    if (Array.isArray(instructions)) {
        for (const instruction of instructions as []) {
            [processedDimensions, processedMeasurements] = paramsProcessing(params, instruction);
            customDimensions = {
                ...customDimensions,
                ...processedDimensions
            };
            customMeasurements = {
                ...customMeasurements,
                ...processedMeasurements
            };
        }
    } else {
        [customDimensions, customMeasurements] = paramsProcessing(params, instructions);
    }

    return [customDimensions, customMeasurements];
};
