import type { dimensions, measurements } from '../../src/base/utils/param-processing';
import {
    getParamsData,
    ParamRecordConfigField,
    ParamRecordConfig,
    getValue,
    paramsProcessing,
    wrongPathErr
} from '../../src/base/utils/param-processing';

describe('Parameter processing Tests', () => {
    const mockParams = [
        {
            path: {
                to: {
                    value: 13
                }
            }
        },
        'exposedValue',
        undefined,
        'exposedValue2'
    ];

    test('ParamRecordConfigField constructor', () => {
        const configField = new ParamRecordConfigField('path/to');
        expect(configField.path).toBe('path/to');
    });

    test('getValue returns correct value', () => {
        let path = 'path/to/value';
        let result = getValue(mockParams[0], path, 'test', 0);
        let expected = (mockParams[0] as any).path.to.value; // eslint-disable-line @typescript-eslint/no-explicit-any
        expect(result).toEqual(expected);

        path = 'path/to';
        result = getValue(mockParams[0], path, 'test', 0);
        expected = (mockParams[0] as any).path.to; // eslint-disable-line @typescript-eslint/no-explicit-any
        expect(result).toEqual(expected);
    });

    test('getValue throws error on invalid path', () => {
        const path = 'path/ot/velr';
        const expected = wrongPathErr('test', 0);
        expect(() => getValue(mockParams[0], path, 'test', 0)).toThrow(expected);
    });

    test('paramsProcessing functions returns expected value', () => {
        const path = 'path/to/value';
        let config = new ParamRecordConfig('keystr', new ParamRecordConfigField(path), 0);
        let expectedDimensions: dimensions = {};
        let expectedMeasurements: measurements = { keystr: 13 };
        let [resultDimensions, resultMeasurements] = paramsProcessing(mockParams, config);
        expect(resultDimensions).toMatchObject(expectedDimensions);
        expect(resultMeasurements).toMatchObject(expectedMeasurements);

        config = new ParamRecordConfig(undefined, new ParamRecordConfigField(path), 0);
        expectedMeasurements = { data: 13 };
        [resultDimensions, resultMeasurements] = paramsProcessing(mockParams, config);
        expect(resultMeasurements).toMatchObject(expectedMeasurements);

        config = new ParamRecordConfig('predefinedKey', 'predefinedValue', 0);
        expectedDimensions = { predefinedKey: 'predefinedValue' };
        [resultDimensions, resultMeasurements] = paramsProcessing(mockParams, config);
        expect(resultDimensions).toMatchObject(expectedDimensions);

        config = new ParamRecordConfig(undefined, undefined, 1);
        expectedDimensions = { data: mockParams[1] as string };
        [resultDimensions, resultMeasurements] = paramsProcessing(mockParams, config);
        expect(resultDimensions).toMatchObject(expectedDimensions);
    });

    test('getParamsData returns expected values', () => {
        const config = new ParamRecordConfig(undefined, undefined, 1);
        let expectedMeasurements: measurements = {};
        let expectedDimensions: dimensions = { data: mockParams[1] as string };
        let [resultDimensions, resultMeasurements] = getParamsData(mockParams, config);
        expect(resultDimensions).toMatchObject(expectedMeasurements);

        let additionalConfig = new ParamRecordConfig('predefinedKey', new ParamRecordConfigField('path/to/value'), 0);
        expectedMeasurements = { predefinedKey: 13 };
        [resultDimensions, resultMeasurements] = getParamsData(mockParams, [config, additionalConfig]);
        expect(resultDimensions).toMatchObject(expectedDimensions);
        expect(resultMeasurements).toMatchObject(expectedMeasurements);

        additionalConfig = new ParamRecordConfig('addKey', undefined, 3);

        expectedDimensions = {
            data: mockParams[1] as string,
            addKey: mockParams[3] as string
        };
        [resultDimensions, resultMeasurements] = getParamsData(mockParams, [config, additionalConfig]);
        expect(resultDimensions).toMatchObject(expectedDimensions);
    });
});
