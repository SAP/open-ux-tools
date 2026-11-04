import type { ToolsLogger } from '@sap-ux/logger';
import type { JsonInput } from '../../../src/app/types.js';
import { getFirstArg, parseJsonInput } from '../../../src/utils/parse-json-input.js';

const logger = {
    debug: jest.fn()
} as unknown as ToolsLogger;

describe('getFirstArg', () => {
    it('should return the argument itself when passed as a string', () => {
        expect(getFirstArg('arg')).toEqual('arg');
    });

    it('should return the first element in case of an array with arguments', () => {
        expect(getFirstArg(['arg1', 'arg2'])).toEqual('arg1');
        expect(getFirstArg([1, 2])).toEqual(1);
    });

    it('should return empty string if the arguments parameter is not in the expected format', () => {
        expect(getFirstArg(null as unknown as string)).toEqual('');
        expect(getFirstArg(undefined as unknown as string)).toEqual('');
        expect(getFirstArg({} as unknown as string)).toEqual('');
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

    it('should return the adp json input including optional id', () => {
        const jsonInput: JsonInput = {
            system: 'system',
            application: 'application',
            id: '123.5'
        };
        const jsonString = JSON.stringify(jsonInput);
        expect(parseJsonInput(jsonString, logger)).toEqual(jsonInput);
    });

    it('should return valid input even when keyUserChanges is present in CLI json', () => {
        const jsonString = JSON.stringify({
            system: 'system',
            application: 'application',
            keyUserChanges: [{ content: { fileName: 'id_123_propertyChange' } }]
        });
        expect(parseJsonInput(jsonString, logger)).toEqual(
            expect.objectContaining({
                system: 'system',
                application: 'application'
            })
        );
    });

    it('should route to the CF shape when targetEnv is CF', () => {
        const cfInput = {
            targetEnv: 'CF',
            application: 'base.app.id',
            businessService: 'my-business-service',
            projectName: 'app.variant'
        };
        expect(parseJsonInput(JSON.stringify(cfInput), logger)).toEqual(cfInput);
    });

    it('should return undefined for a CF targetEnv that fails CF validation', () => {
        const invalidCf = {
            targetEnv: 'CF',
            application: 'base.app.id'
            // neither businessService nor serviceInstanceName
        };
        expect(parseJsonInput(JSON.stringify(invalidCf), logger)).toBeUndefined();
    });

    it('should treat absent targetEnv as ABAP (backwards compatible)', () => {
        const abapInput = { system: 'system', application: 'application' };
        expect(parseJsonInput(JSON.stringify(abapInput), logger)).toEqual(abapInput);
    });
});
