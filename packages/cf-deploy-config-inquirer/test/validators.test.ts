import { initI18nCfDeployConfigInquirer, t } from '../src/i18n';
import {
    validateDestinationQuestion,
    validateMtaPath,
    validateMtaId,
    validateAbapService
} from '../src/prompts/validators';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { ErrorHandler } from '@sap-ux/inquirer-common';
import * as projectInputValidator from '@sap-ux/project-input-validator';
import type { CfAppRouterDeployConfigAnswers } from '../src/types';

const mockedExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;

jest.mock('@sap-ux/project-input-validator', () => ({
    ...jest.requireActual('@sap-ux/project-input-validator'),
    validateWindowsPathLength: jest.fn().mockImplementation(() => true)
}));

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    existsSync: jest.fn()
}));

describe('validators', () => {
    beforeAll(async () => {
        await initI18nCfDeployConfigInquirer();
    });

    beforeEach(async () => {
        jest.clearAllMocks();
    });

    describe('validateDestinationQuestion', () => {
        const cfServiceInput: [string | object, string | boolean][] = [
            [' ', 'errors.emptyDestinationNameError'],
            ['', 'errors.emptyDestinationNameError'],
            ['ABC ', 'errors.destinationNameError'],
            ['ABC&', 'errors.destinationNameError'],
            ['ABC$', 'errors.destinationNameError'],
            ['ABC abc', 'errors.destinationNameError'],
            ['a'.repeat(201), 'errors.destinationNameLengthError'],
            ['ABCabc', true],
            ['123ABCabc', true],
            ['123ABCabc123', true],
            ['_ABCabc123', true],
            ['-ABCabc123', true],
            ['ABC', true],
            ['ABC-abc', true],
            ['ABC_abc', true],
            [{}, true]
        ];

        test.each(cfServiceInput)('Validate destination field %p', (input, expectedKeyOrBool) => {
            const output = validateDestinationQuestion(input as string, false);
            let expected: boolean | string = expectedKeyOrBool;
            if (typeof expectedKeyOrBool === 'string') {
                expected = t(expectedKeyOrBool);
            }
            expect(output).toEqual(expected);
        });

        it('returns true if allowEmptyChoice is true', () => {
            expect(validateDestinationQuestion('', true)).toBe(true);
        });
    });

    describe('validateMtaPath', () => {
        it('should return true when the file path exists', () => {
            mockedExistsSync.mockReturnValue(true);
            const result = validateMtaPath('/valid/path');
            expect(result).toBe(true);
        });

        it('should return an error message when the file path does not exist', () => {
            mockedExistsSync.mockReturnValue(false);
            const result = validateMtaPath('/invalid/path');
            expect(result).toBe(
                'The folder path does not exist: /invalid/path. Check the folder has the correct permissions.'
            );
        });

        it('should return an error message for empty input', () => {
            const result = validateMtaPath('');
            expect(result).toBe('The folder path does not exist: . Check the folder has the correct permissions.');
        });
    });

    describe('validateMtaId', () => {
        beforeEach(async () => {
            jest.clearAllMocks();
        });
        const previousAnswers = {
            mtaPath: '/valid/path'
        } as unknown as CfAppRouterDeployConfigAnswers;

        it('should return true for valid MTA ID', () => {
            mockedExistsSync.mockReturnValue(false);
            const result = validateMtaId('valid_id', previousAnswers);
            expect(result).toBe(true);
        });

        it('should return an error message for empty MTA ID', () => {
            const result = validateMtaId('', previousAnswers);
            expect(result).toBe('The MTA ID cannot be empty.');
        });

        it('should return an error message for invalid MTA ID format', () => {
            const result = validateMtaId('invalid id', previousAnswers);
            expect(result).toBe(
                'The MTA ID must only contain letters, numbers, dashes, periods, and underscores. It cannot contain spaces or begin with a number.'
            );
        });

        it('should return an error message if MTA ID already exists at the given path', () => {
            mockedExistsSync.mockReturnValue(true);
            const result = validateMtaId('existing_id', previousAnswers);
            expect(result).toBe(
                `A folder with the same name already exists at: /valid/path. Choose a different MTA ID.`
            );
        });
    });

    describe('validateMtaId regex /^[a-zA-Z][a-zA-Z0-9_-.]*$/', () => {
        const previousAnswers = { mtaPath: '/valid/path' } as unknown as CfAppRouterDeployConfigAnswers;
        beforeEach(() => {
            mockedExistsSync.mockReturnValue(false);
        });
        it('should allow IDs starting with a letter', () => {
            expect(validateMtaId('A', previousAnswers)).toBe(true);
            expect(validateMtaId('Z_123', previousAnswers)).toBe(true);
            expect(validateMtaId('a1_b.c-d', previousAnswers)).toBe(true);
            expect(validateMtaId('b-1.2_3', previousAnswers)).toBe(true);
        });
        it('should not allow IDs starting with a number', () => {
            expect(validateMtaId('1abc', previousAnswers)).toBe(
                'The MTA ID must only contain letters, numbers, dashes, periods, and underscores. It cannot contain spaces or begin with a number.'
            );
        });
        it('should not allow IDs starting with underscore, hyphen, or dot', () => {
            expect(validateMtaId('_abc', previousAnswers)).toBe(
                'The MTA ID must only contain letters, numbers, dashes, periods, and underscores. It cannot contain spaces or begin with a number.'
            );
            expect(validateMtaId('-abc', previousAnswers)).toBe(
                'The MTA ID must only contain letters, numbers, dashes, periods, and underscores. It cannot contain spaces or begin with a number.'
            );
            expect(validateMtaId('.abc', previousAnswers)).toBe(
                'The MTA ID must only contain letters, numbers, dashes, periods, and underscores. It cannot contain spaces or begin with a number.'
            );
        });
        it('should allow numbers after the first character', () => {
            expect(validateMtaId('a1', previousAnswers)).toBe(true);
            expect(validateMtaId('b2c3', previousAnswers)).toBe(true);
        });
        it('should allow underscores, hyphens, and dots after the first character', () => {
            expect(validateMtaId('a_b', previousAnswers)).toBe(true);
            expect(validateMtaId('a-b', previousAnswers)).toBe(true);
            expect(validateMtaId('a.b', previousAnswers)).toBe(true);
        });
        it('should not allow spaces or special characters', () => {
            expect(validateMtaId('a bc', previousAnswers)).toBe(
                'The MTA ID must only contain letters, numbers, dashes, periods, and underscores. It cannot contain spaces or begin with a number.'
            );
            expect(validateMtaId('a$bc', previousAnswers)).toBe(
                'The MTA ID must only contain letters, numbers, dashes, periods, and underscores. It cannot contain spaces or begin with a number.'
            );
            expect(validateMtaId('a@bc', previousAnswers)).toBe(
                'The MTA ID must only contain letters, numbers, dashes, periods, and underscores. It cannot contain spaces or begin with a number.'
            );
        });
        it('should not allow IDs longer than 100 characters', () => {
            const longId = 'a'.repeat(101);
            expect(validateMtaId(longId, previousAnswers)).toBe('The MTA ID must not exceed 100 characters.');
        });

        it('should return true if input is valid', () => {
            const input = 'my-mta-id';
            const previousAnswers: CfAppRouterDeployConfigAnswers = {
                mtaPath: 'C\\test',
                mtaId: input,
                routerType: 'standard'
            };
            const result = validateMtaId(input, previousAnswers);
            expect(result).toBe(true);
        });
    });

    describe('validateMtaId long Windows path', () => {
        let originalPlatform: PropertyDescriptor | undefined;

        beforeAll(() => {
            originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
        });

        beforeEach(() => {
            Object.defineProperty(process, 'platform', {
                value: 'win32',
                configurable: true
            });
            mockedExistsSync.mockReturnValue(false);
        });

        afterEach(() => {
            if (originalPlatform) {
                Object.defineProperty(process, 'platform', originalPlatform);
            }
        });

        it('should return true if path length is less than 256 on win32 and input is valid', () => {
            const input = 'shortid';
            const previousAnswers: CfAppRouterDeployConfigAnswers = {
                mtaPath: 'C\\shortpath',
                mtaId: input,
                routerType: 'standard'
            };
            const result = validateMtaId(input, previousAnswers);
            expect(result).toBe(true);
        });

        it('should return error message if path length is >= 256 on win32', () => {
            const validateWindowsPathLengthSpy = jest.spyOn(projectInputValidator, 'validateWindowsPathLength');
            const input = 'bbb';
            const longPath = 'C:'.padEnd(252, 'a');
            const previousAnswers: CfAppRouterDeployConfigAnswers = {
                mtaPath: longPath,
                mtaId: input,
                routerType: 'standard'
            };
            const fullPath = join(longPath, input);
            projectInputValidator.validateWindowsPathLength(
                fullPath,
                t('errors.windowsMtaIdPathTooLong', { length: '' })
            );
            expect(validateWindowsPathLengthSpy).toHaveBeenCalledWith(
                fullPath,
                'The combined length  of the MTA ID and MTA path exceeds the default Windows paths length. This may cause issues with MTA project generation.'
            );
        });
    });

    describe('validateAbapService', () => {
        let mockErrorHandler: ErrorHandler;

        beforeEach(() => {
            mockErrorHandler = new ErrorHandler();
        });

        it('should return true for a valid choice', () => {
            const validChoice = 'validChoice';
            expect(validateAbapService(validChoice, mockErrorHandler)).toBe(true);
        });

        it('should return a concatenated error message if choice is empty and error message is available', () => {
            const errorMsg = 'Error occurred';
            jest.spyOn(mockErrorHandler, 'getErrorMsg').mockReturnValue(errorMsg);
            const expectedMessage = `${errorMsg} ${t('errors.errorScpAbapSourceDiscoveryCheckLog')}`;
            expect(validateAbapService('', mockErrorHandler)).toBe(expectedMessage);
            expect(mockErrorHandler.getErrorMsg).toHaveBeenCalledWith('', true);
        });

        it('should return false if choice is empty and no error message is available', () => {
            jest.spyOn(mockErrorHandler, 'getErrorMsg').mockReturnValue('');
            expect(validateAbapService('', mockErrorHandler)).toBe(false);
            expect(mockErrorHandler.getErrorMsg).toHaveBeenCalledWith('', true);
        });
    });
});
