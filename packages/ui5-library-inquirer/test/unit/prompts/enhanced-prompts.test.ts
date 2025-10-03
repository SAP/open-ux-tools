import { getQuestions } from '../../../src/prompts';
import { initI18n, t } from '../../../src/i18n';
import type { UI5Version } from '@sap-ux/ui5-info';
import type { UI5LibraryPromptOptions, UI5LibraryAnswers } from '../../../src/types';
import * as projectInputValidators from '@sap-ux/project-input-validator';
import * as inquirerCommon from '@sap-ux/inquirer-common';
import type { ListQuestion, Question } from 'inquirer';
import type { FileBrowserQuestion, InputQuestion, ConfirmQuestion } from '@sap-ux/inquirer-common';

// Mock dependencies
jest.mock('@sap-ux/project-input-validator');
jest.mock('@sap-ux/inquirer-common', () => ({
    ...jest.requireActual('@sap-ux/inquirer-common'),
    ui5VersionsGrouped: jest.fn(),
    searchChoices: jest.fn()
}));

describe('Enhanced Prompting Tests', () => {
    const mockValidateLibModuleName = projectInputValidators.validateLibModuleName as jest.MockedFunction<
        typeof projectInputValidators.validateLibModuleName
    >;
    const mockValidateNamespace = projectInputValidators.validateNamespace as jest.MockedFunction<
        typeof projectInputValidators.validateNamespace
    >;
    const mockValidateProjectFolder = projectInputValidators.validateProjectFolder as jest.MockedFunction<
        typeof projectInputValidators.validateProjectFolder
    >;
    const mockUi5VersionsGrouped = inquirerCommon.ui5VersionsGrouped as jest.MockedFunction<
        typeof inquirerCommon.ui5VersionsGrouped
    >;
    const mockSearchChoices = inquirerCommon.searchChoices as jest.MockedFunction<typeof inquirerCommon.searchChoices>;

    const mockUI5Versions: UI5Version[] = [
        { version: '1.120.0', maintained: true, default: true },
        { version: '1.108.0', maintained: true },
        { version: '1.96.0', maintained: false }
    ];

    const mockVersionChoices = [
        { name: '1.120.0 (Maintained, Default)', value: '1.120.0' },
        { name: '1.108.0 (Maintained)', value: '1.108.0' },
        { name: '1.96.0 (Out of maintenance)', value: '1.96.0' }
    ];

    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockUi5VersionsGrouped.mockReturnValue(mockVersionChoices);
        mockSearchChoices.mockReturnValue(mockVersionChoices);
    });

    describe('getQuestions - Comprehensive Testing', () => {
        describe('Library Name Prompt', () => {
            it('should create library name prompt with correct properties', () => {
                const questions = getQuestions(mockUI5Versions);
                const libraryNameQ = questions[0] as any;

                expect(libraryNameQ.type).toBe('input');
                expect(libraryNameQ.name).toBe('libraryName');
                expect(libraryNameQ.message).toBe(t('prompts.libraryNameLabel'));
                expect(libraryNameQ.default).toBe(t('prompts.libraryNameDefault'));
                expect(libraryNameQ.guiOptions).toEqual({
                    mandatory: true,
                    breadcrumb: true
                });
            });

            it('should validate library name using validateLibModuleName', () => {
                mockValidateLibModuleName.mockReturnValue(true);
                const questions = getQuestions(mockUI5Versions);
                const libraryNameQ = questions[0] as InputQuestion<UI5LibraryAnswers>;

                const result = libraryNameQ.validate!('my-library');

                expect(result).toBe(true);
                expect(mockValidateLibModuleName).toHaveBeenCalledWith('my-library');
            });

            it('should return validation error message for invalid library name', () => {
                const errorMessage = 'Invalid library name format';
                mockValidateLibModuleName.mockReturnValue(errorMessage);
                const questions = getQuestions(mockUI5Versions);
                const libraryNameQ = questions[0] as InputQuestion<UI5LibraryAnswers>;

                const result = libraryNameQ.validate!('invalid-name!@#');

                expect(result).toBe(errorMessage);
                expect(mockValidateLibModuleName).toHaveBeenCalledWith('invalid-name!@#');
            });
        });

        describe('Namespace Prompt', () => {
            it('should create namespace prompt with correct properties', () => {
                const questions = getQuestions(mockUI5Versions);
                const namespaceQ = questions[1] as any;

                expect(namespaceQ.type).toBe('input');
                expect(namespaceQ.name).toBe('namespace');
                expect(namespaceQ.message).toBe(t('prompts.libraryNamespaceLabel'));
                expect(namespaceQ.default).toBe(t('prompts.libraryNamespaceDefault'));
                expect(namespaceQ.guiOptions).toEqual({
                    mandatory: true,
                    breadcrumb: true
                });
            });

            it('should validate namespace using validateNamespace with library name', () => {
                mockValidateNamespace.mockReturnValue(true);
                const questions = getQuestions(mockUI5Versions);
                const namespaceQ = questions[1] as any;
                const mockAnswers: Partial<UI5LibraryAnswers> = { libraryName: 'mylib' };

                const result = namespaceQ.validate!('com.company', mockAnswers);

                expect(result).toBe(true);
                expect(mockValidateNamespace).toHaveBeenCalledWith('com.company', 'mylib', false);
            });

            it('should handle validation when no answers provided', () => {
                mockValidateNamespace.mockReturnValue(true);
                const questions = getQuestions(mockUI5Versions);
                const namespaceQ = questions[1] as any;

                const result = namespaceQ.validate!('com.company', undefined);

                expect(result).toBe(true);
                expect(mockValidateNamespace).toHaveBeenCalledWith('com.company', undefined, false);
            });

            it('should return validation error for invalid namespace', () => {
                const errorMessage = 'Namespace contains invalid characters';
                mockValidateNamespace.mockReturnValue(errorMessage);
                const questions = getQuestions(mockUI5Versions);
                const namespaceQ = questions[1] as any;
                const mockAnswers: Partial<UI5LibraryAnswers> = { libraryName: 'mylib' };

                const result = namespaceQ.validate!('invalid..namespace', mockAnswers);

                expect(result).toBe(errorMessage);
                expect(mockValidateNamespace).toHaveBeenCalledWith('invalid..namespace', 'mylib', false);
            });
        });

        describe('Target Folder Prompt', () => {
            const originalProcessCwd = process.cwd;

            beforeEach(() => {
                process.cwd = jest.fn().mockReturnValue('/mock/current/directory');
            });

            afterEach(() => {
                process.cwd = originalProcessCwd;
            });

            it('should create target folder prompt with correct properties', () => {
                const questions = getQuestions(mockUI5Versions);
                const targetFolderQ = questions[2] as FileBrowserQuestion<UI5LibraryAnswers>;

                expect(targetFolderQ.type).toBe('input');
                expect(targetFolderQ.name).toBe('targetFolder');
                expect(targetFolderQ.message).toBe(t('prompts.libraryFolderLabel'));
                expect(targetFolderQ.guiType).toBe('folder-browser');
                expect(targetFolderQ.default).toBe('/mock/current/directory');
                expect(targetFolderQ.guiOptions).toEqual({
                    applyDefaultWhenDirty: true,
                    mandatory: true,
                    breadcrumb: true
                });
            });

            it('should use custom target folder when provided in options', () => {
                const options: UI5LibraryPromptOptions = {
                    targetFolder: '/custom/target/path'
                };
                const questions = getQuestions(mockUI5Versions, options);
                const targetFolderQ = questions[2] as FileBrowserQuestion<UI5LibraryAnswers>;

                expect(targetFolderQ.default).toBe('/custom/target/path');
            });

            it('should validate target folder with combined namespace and library name', () => {
                mockValidateProjectFolder.mockReturnValue(true);
                const questions = getQuestions(mockUI5Versions);
                const targetFolderQ = questions[2] as FileBrowserQuestion<UI5LibraryAnswers>;
                const mockAnswers: Partial<UI5LibraryAnswers> = {
                    namespace: 'com.company',
                    libraryName: 'mylib'
                };

                const result = targetFolderQ.validate!('/some/target/path', mockAnswers);

                expect(result).toBe(true);
                expect(mockValidateProjectFolder).toHaveBeenCalledWith('/some/target/path', 'com.company.mylib');
            });

            it('should return validation error for invalid target folder', () => {
                const errorMessage = 'Target folder already exists';
                mockValidateProjectFolder.mockReturnValue(errorMessage);
                const questions = getQuestions(mockUI5Versions);
                const targetFolderQ = questions[2] as FileBrowserQuestion<UI5LibraryAnswers>;
                const mockAnswers: Partial<UI5LibraryAnswers> = {
                    namespace: 'com.company',
                    libraryName: 'mylib'
                };

                const result = targetFolderQ.validate!('/existing/path', mockAnswers);

                expect(result).toBe(errorMessage);
                expect(mockValidateProjectFolder).toHaveBeenCalledWith('/existing/path', 'com.company.mylib');
            });

            it('should handle validation when answers are incomplete', () => {
                mockValidateProjectFolder.mockReturnValue(true);
                const questions = getQuestions(mockUI5Versions);
                const targetFolderQ = questions[2] as FileBrowserQuestion<UI5LibraryAnswers>;
                const mockAnswers: Partial<UI5LibraryAnswers> = {
                    namespace: 'com.company'
                    // libraryName is missing
                };

                const result = targetFolderQ.validate!('/some/path', mockAnswers);

                expect(result).toBe(true);
                expect(mockValidateProjectFolder).toHaveBeenCalledWith('/some/path', 'com.company.undefined');
            });
        });

        describe('UI5 Version Prompt', () => {
            it('should create UI5 version prompt as list when autocomplete is disabled', () => {
                const questions = getQuestions(mockUI5Versions);
                const ui5VersionQ = questions[3] as any;

                expect(ui5VersionQ.type).toBe('list');
                expect(ui5VersionQ.name).toBe('ui5Version');
                expect(ui5VersionQ.message).toBe(t('prompts.libraryUi5VersionLabel'));
                expect(ui5VersionQ.guiOptions).toEqual({
                    hint: t('prompts.libraryUi5VersionTooltip'),
                    breadcrumb: true
                });
            });

            it('should create UI5 version prompt as autocomplete when enabled in options', () => {
                const options: UI5LibraryPromptOptions = { useAutocomplete: true };
                const questions = getQuestions(mockUI5Versions, options);
                const ui5VersionQ = questions[3] as any;

                expect(ui5VersionQ.type).toBe('autocomplete');
                expect(ui5VersionQ.name).toBe('ui5Version');
            });

            it('should show version choices when when condition is true', () => {
                mockUi5VersionsGrouped.mockReturnValue(mockVersionChoices);
                const questions = getQuestions(mockUI5Versions);
                const ui5VersionQ = questions[3] as any;

                expect(typeof ui5VersionQ.when === 'function' ? ui5VersionQ.when() : !!ui5VersionQ.when).toBe(true);
                expect((ui5VersionQ.choices as Function)()).toEqual(mockVersionChoices);
                expect(mockUi5VersionsGrouped).toHaveBeenCalledWith(mockUI5Versions, undefined);
            });

            it('should hide version choices when no versions available', () => {
                mockUi5VersionsGrouped.mockReturnValue(null as any);
                const questions = getQuestions(mockUI5Versions);
                const ui5VersionQ = questions[3] as any;

                expect(typeof ui5VersionQ.when === 'function' ? ui5VersionQ.when() : !!ui5VersionQ.when).toBe(false);
            });

            it('should include separators when option is enabled', () => {
                const options: UI5LibraryPromptOptions = { includeSeparators: true };
                const questions = getQuestions(mockUI5Versions, options);
                const ui5VersionQ = questions[3] as any;

                (ui5VersionQ.choices as Function)();
                expect(mockUi5VersionsGrouped).toHaveBeenCalledWith(mockUI5Versions, true);
            });

            it('should handle search functionality for autocomplete', () => {
                const options: UI5LibraryPromptOptions = { useAutocomplete: true };
                const filteredChoices = [{ name: '1.120.0', value: '1.120.0' }];
                mockSearchChoices.mockReturnValue(filteredChoices);

                const questions = getQuestions(mockUI5Versions, options);
                const ui5VersionQ = questions[3] as any;

                const result = ui5VersionQ.source({}, '1.120');

                expect(result).toEqual(filteredChoices);
                expect(mockSearchChoices).toHaveBeenCalledWith('1.120', mockVersionChoices);
            });
        });

        describe('TypeScript Enable Prompt', () => {
            it('should create TypeScript enable prompt with correct properties', () => {
                const questions = getQuestions(mockUI5Versions);
                const enableTsQ = questions[4] as any;

                expect(enableTsQ.type).toBe('confirm');
                expect(enableTsQ.name).toBe('enableTypescript');
                expect(enableTsQ.message).toBe(t('prompts.libraryEnableTypeScriptLabel'));
                expect(enableTsQ.default).toBe(false);
                expect(enableTsQ.guiOptions).toEqual({
                    breadcrumb: true
                });
            });
        });

        describe('Edge Cases and Error Scenarios', () => {
            it('should handle empty UI5 versions array', () => {
                const questions = getQuestions([]);

                expect(questions).toHaveLength(5);
                expect(mockUi5VersionsGrouped).toHaveBeenCalledWith([], undefined);
            });

            it('should handle undefined UI5 versions gracefully', () => {
                mockUi5VersionsGrouped.mockReturnValue(null as any);
                const questions = getQuestions([]);
                const ui5VersionQ = questions[3] as any;

                expect(typeof ui5VersionQ.when === 'function' ? ui5VersionQ.when() : !!ui5VersionQ.when).toBe(false);
            });

            it('should handle all prompt options together', () => {
                const options: UI5LibraryPromptOptions = {
                    includeSeparators: true,
                    targetFolder: '/custom/path',
                    useAutocomplete: true
                };

                const questions = getQuestions(mockUI5Versions, options);

                expect(questions).toHaveLength(5);

                // Verify target folder uses custom path
                const targetFolderQ = questions[2] as FileBrowserQuestion<UI5LibraryAnswers>;
                expect(targetFolderQ.default).toBe('/custom/path');

                // Verify UI5 version uses autocomplete and separators
                const ui5VersionQ = questions[3] as any;
                expect(ui5VersionQ.type).toBe('autocomplete');

                (ui5VersionQ.choices as Function)();
                expect(mockUi5VersionsGrouped).toHaveBeenCalledWith(mockUI5Versions, true);
            });

            it('should handle validation with empty or malformed answers', () => {
                const questions = getQuestions(mockUI5Versions);

                // Test library name validation with empty string
                const libraryNameQ = questions[0] as InputQuestion<UI5LibraryAnswers>;
                mockValidateLibModuleName.mockReturnValue('Library name is required');
                expect(libraryNameQ.validate!('')).toBe('Library name is required');

                // Test namespace validation with malformed answers
                const namespaceQ = questions[1] as InputQuestion<UI5LibraryAnswers>;
                mockValidateNamespace.mockReturnValue('Invalid namespace');
                expect(namespaceQ.validate!('bad..namespace', {} as any)).toBe('Invalid namespace');

                // Test target folder validation with missing answers
                const targetFolderQ = questions[2] as FileBrowserQuestion<UI5LibraryAnswers>;
                mockValidateProjectFolder.mockReturnValue('Invalid target folder');
                expect(targetFolderQ.validate!('/invalid/path', {} as any)).toBe('Invalid target folder');
            });
        });

        describe('Internationalization', () => {
            it('should use translated strings for all prompt messages', () => {
                const questions = getQuestions(mockUI5Versions);

                expect(questions[0].message).toBe(t('prompts.libraryNameLabel'));
                expect((questions[0] as InputQuestion<UI5LibraryAnswers>).default).toBe(
                    t('prompts.libraryNameDefault')
                );
                expect(questions[1].message).toBe(t('prompts.libraryNamespaceLabel'));
                expect((questions[1] as InputQuestion<UI5LibraryAnswers>).default).toBe(
                    t('prompts.libraryNamespaceDefault')
                );
                expect(questions[2].message).toBe(t('prompts.libraryFolderLabel'));
                expect(questions[3].message).toBe(t('prompts.libraryUi5VersionLabel'));
                expect((questions[3] as any).guiOptions?.hint).toBe(t('prompts.libraryUi5VersionTooltip'));
                expect(questions[4].message).toBe(t('prompts.libraryEnableTypeScriptLabel'));
            });
        });
    });
});
