import type { ToolsLogger } from '@sap-ux/logger';
import type { JsonInput } from '../../../src/app/types';
import { getFirstArgAsString, parseJsonInput } from '../../../src/utils/parse-json-input';

const logger = {
    debug: jest.fn()
} as unknown as ToolsLogger;

describe('getFirstArgAsString', () => {
    it('should return the argument itself when passed as a string', () => {
        expect(getFirstArgAsString('arg')).toEqual('arg');
    });

    it('should return the first element in case of an array with arguments', () => {
        expect(getFirstArgAsString(['arg1', 'arg2'])).toEqual('arg1');
        expect(getFirstArgAsString([1, 2] as unknown as string[])).toEqual(1);
    });

    it('should return empty string if the arguments parameter is not in the expected format', () => {
        expect(getFirstArgAsString(null as unknown as string)).toEqual('');
        expect(getFirstArgAsString(undefined as unknown as string)).toEqual('');
        expect(getFirstArgAsString({} as unknown as string)).toEqual('');
    });
});

describe('parseJsonInput', () => {
    it('should return undefined if invalid json string is passed', () => {
        expect(parseJsonInput('invalid json', logger)).toBeUndefined();
    });

    it('should return the adp json input in case the json string matches the expected format', () => {
        const jsonInput: JsonInput = {
            system: 'system',
            application: 'application',
            client: 'client',
            username: 'username',
            password: 'password',
            applicationTitle: 'applicationTitle',
            targetFolder: 'targetFolder',
            projectName: 'projectName',
            namespace: 'namespace'
        };
        const jsonString = JSON.stringify(jsonInput);
        expect(parseJsonInput(jsonString, logger)).toEqual(jsonInput);
    });

    it('should return undefined in case the json does NOT match the expected format', () => {
        const invalidJsonInput = {
            system: 'system'
        };
        const jsonString = JSON.stringify(invalidJsonInput);
        expect(parseJsonInput(jsonString, logger)).toBeUndefined();
    });
});
