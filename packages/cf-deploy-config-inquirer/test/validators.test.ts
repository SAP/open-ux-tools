import { t } from '../src/i18n';
import {
    validateDestinationQuestion,
    validateMtaPath,
    validateMtaId,
    validateAbapService
} from '../src/prompts/validators';
import { existsSync } from 'fs';
import { join } from 'path';
import type { CfAppRouterDeployConfigAnswers } from '../src/types';
import { ErrorHandler } from '@sap-ux/inquirer-common';

jest.mock('os-name');
jest.mock('fs');
jest.mock('../src/i18n');
jest.mock('path');
jest.mock('@sap-ux/inquirer-common');

const mockedExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;
const mockedT = t as jest.MockedFunction<typeof t>;
const mockedJoin = join as jest.MockedFunction<typeof join>;

describe('validateDestinationQuestion', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
    });

    const cfServiceInput: [any, any][] = [
        [' ', t('errors.emptyDestinationNameError')],
        ['', t('errors.emptyDestinationNameError')],
        ['ABC ', t('errors.destinationNameError')],
        ['ABC&', t('errors.destinationNameError')],
        ['ABC$', t('errors.destinationNameError')],
        ['ABC abc', t('errors.destinationNameError')],
        ['a'.repeat(201), t('errors.destinationNameLengthError')],
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

    test.each(cfServiceInput)('Validate destination field %p', (input, toEqual) => {
        const output = validateDestinationQuestion(input, false);
        expect(output).toEqual(toEqual);
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
        mockedT.mockReturnValue('Folder does not exist');

        const result = validateMtaPath('/invalid/path');
        expect(result).toBe('Folder does not exist');
        expect(mockedT).toHaveBeenCalledWith('errors.folderDoesNotExistError', { filePath: '/invalid/path' });
    });

    it('should return an error message for empty input', () => {
        const result = validateMtaPath('');
        expect(result).toBe('Folder does not exist');
    });
});

describe('validateMtaId', () => {
    const previousAnswers = {
        mtaPath: '/valid/path'
    } as unknown as CfAppRouterDeployConfigAnswers;

    it('should return true for valid MTA ID', () => {
        mockedExistsSync.mockReturnValue(false);
        const result = validateMtaId('valid_id', previousAnswers);
        expect(result).toBe(true);
    });

    it('should return an error message for empty MTA ID', () => {
        mockedT.mockReturnValue('MTA ID cannot be empty');
        const result = validateMtaId('', previousAnswers);
        expect(result).toBe('MTA ID cannot be empty');
        expect(mockedT).toHaveBeenCalledWith('errors.noMtaIdError');
    });

    it('should return an error message for invalid MTA ID format', () => {
        mockedT.mockReturnValue('Invalid MTA ID format');
        const result = validateMtaId('invalid id', previousAnswers);
        expect(result).toBe('Invalid MTA ID format');
        expect(mockedT).toHaveBeenCalledWith('errors.invalidMtaIdError');
    });

    it('should return an error message if MTA ID already exists at the given path', () => {
        mockedJoin.mockReturnValue('/valid/path/existing_id');
        mockedExistsSync.mockReturnValue(true);
        mockedT.mockReturnValue('MTA ID already exists at the destination path');

        const result = validateMtaId('existing_id', previousAnswers);
        expect(result).toBe('MTA ID already exists at the destination path');
        expect(mockedJoin).toHaveBeenCalledWith('/valid/path', 'existing_id');
        expect(mockedT).toHaveBeenCalledWith('errors.mtaIdAlreadyExistError', { mtaPath: '/valid/path' });
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
