import 'jest-extended';
import { join } from 'path';
import { t } from '../src/i18n';
import {
    validateModuleName,
    validateProjectFolder,
    validateNamespace,
    validateLibModuleName
} from '../src/ui5/validators';
import fs from 'fs/promises';
import os from 'os';

const itSkipIfWin = os.platform() === 'win32' ? it.skip : it;

describe('Test Validator functions', () => {
    it('Should return validation message for invalid namespace strings', () => {
        expect(validateNamespace('')).toBe(false);
        expect(validateNamespace('AbCd234')).toBe(t('ui5.inputValueContainsCapital', { promptName: 'Namespace' }));
        expect(validateNamespace('a1b2.abc')).toBe(true);
        expect(validateNamespace('abc._abc')).toBe(true);
        expect(validateNamespace('a'.repeat(30), 'a'.repeat(30))).toBe(true);
        // Neg tests
        expect(validateNamespace(' A1b2')).toEqual(t('ui5.namespaceMustStartWithLetter'));
        expect(validateNamespace('abc.')).toEqual(t('ui5.namespaceEndInPeriod'));
        expect(validateNamespace('sap')).toEqual(t('ui5.namespaceCannotBeSap', { str: 'sap' }));
        expect(validateNamespace('newABC')).toEqual(t('ui5.namespaceStartsWithNew', { str: 'new' }));
        expect(validateNamespace('Abc.1')).toEqual(t('ui5.namespaceNumberAfterPeriod'));
        expect(validateNamespace('abc//?*')).toEqual(t('ui5.namespaceSpecialCharacter'));
        // Module name passed
        expect(validateNamespace('a'.repeat(40), 'a'.repeat(40))).toEqual(t('ui5.nameCombinedTooLong', { length: 70 }));
        expect(validateNamespace('a'.repeat(40), undefined)).not.toBeUndefined();

        // Dont allow underscore
        // Pos test
        expect(validateNamespace('abc.abc', undefined, false)).toEqual(true);

        // Neg tests
        expect(validateNamespace('', undefined, false)).toBe(false);
        expect(validateNamespace('abc.', undefined, false)).toEqual(t('ui5.namespaceEndInPeriod'));
        expect(validateNamespace('a1B2.Abc', undefined, false)).toEqual(t('ui5.lowerAlphaNumericDotsOnly'));
        expect(validateNamespace('abc._abc', undefined, false)).toEqual(t('ui5.lowerAlphaNumericDotsOnly'));
    });

    it('Should return validation message for invalid module name strings', () => {
        // Pos tests
        expect(validateModuleName('project1')).toBe(true);
        expect(validateModuleName('project_')).toBe(true);
        expect(validateModuleName('project-')).toBe(true);

        // Tests that error string is returned
        expect(validateModuleName('')).toBeString();
        expect(validateModuleName('projecT1')).toBeString();
        expect(validateModuleName('.project1')).toBeString();
        expect(validateModuleName('project1*')).toBeString();
        expect(validateModuleName(' project1')).toBeString();
        expect(validateModuleName('a'.repeat(200))).toBeString();
        expect(validateModuleName('1project')).toEqual(t('ui5.moduleNameMustStartWithLetter'));
        expect(validateModuleName('a'.repeat(71))).toEqual(t('ui5.nameTooLong', { length: 70 }));
        expect(validateModuleName('a'.repeat(2))).toEqual(t('ui5.nameTooShort', { length: 3 }));
    });

    it('Should return validation message for invalid library module name strings', () => {
        // Pos tests
        expect(validateLibModuleName('library1')).toBe(true);

        // Neg tests
        expect(validateLibModuleName('Library1')).toBeString();
        expect(validateLibModuleName('library_1')).toEqual(t('ui5.lowerAlphaNumericOnly'));
    });

    /**
     * Its not easily possible to change low level file permissions, e.g. to deny write on Windows using node.
     * Using chmod does not work, the folder is still writable. Running `icacls` in a child process might work but might be overkill.
     * The previously used mock-fs is broken on Node 20.8 and cannot be used until a fix is available. Hopefully soon...
     *
     */
    itSkipIfWin('Tests for validateProjectFolder file permissions', async () => {
        const path = join(__dirname, '/test-tmp');
        try {
            await fs.mkdir(path);
        } catch {
            // lint
        }
        await fs.chmod(path, fs.constants.O_RDONLY);
        expect(validateProjectFolder(path, 'anything')).toEqual(t('ui5.folderDoesNotHaveCorrectPermissions'));
        await fs.rmdir(path);
    });
    it('Tests validateProjectFolder if it already contains an SAP Fiori App', async () => {
        const path = join(__dirname, 'webapp');
        try {
            await fs.mkdir(path);
        } catch {
            // lint
        }
        expect(validateProjectFolder(__dirname, 'testing')).toEqual(t('ui5.folderContainsFioriApp'));
        await fs.rmdir(path);
    });

    it('Tests for validateProjectFolder', () => {
        expect(validateProjectFolder('doesntexistfolder$', 'projname')).toEqual(t('ui5.folderDoesNotExist'));
        expect(validateProjectFolder(__dirname, 'newprojectname123')).toBe(true);
        expect(validateProjectFolder(join(__dirname, '..'), 'test')).toEqual(
            t('ui5.moduleAlreadyExists', { folderName: 'test' })
        );
    });
});
