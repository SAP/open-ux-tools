import path from 'node:path';
import { create } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';

import { createPropertiesI18nEntries } from '@sap-ux/i18n';
import type { KeyUserTextTranslations } from '@sap-ux/axios-extension';

import {
    normalizeLanguageForI18n,
    replaceTextsWithI18nBindings,
    writeKeyUserTranslations
} from '../../../../src/writer/i18n/key-user-translations';

jest.mock('@sap-ux/i18n', () => ({
    ...jest.requireActual('@sap-ux/i18n'),
    createPropertiesI18nEntries: jest.fn().mockResolvedValue(true)
}));

const createPropertiesI18nEntriesMock = createPropertiesI18nEntries as jest.Mock;

describe('i18n-writer', () => {
    describe('normalizeLanguageForI18n', () => {
        it('should return empty string for empty language key', () => {
            expect(normalizeLanguageForI18n('')).toBe('');
        });

        it('should return lowercase language code for simple languages', () => {
            expect(normalizeLanguageForI18n('en')).toBe('en');
            expect(normalizeLanguageForI18n('de')).toBe('de');
            expect(normalizeLanguageForI18n('fr')).toBe('fr');
        });

        it('should normalize uppercase language codes to lowercase', () => {
            expect(normalizeLanguageForI18n('EN')).toBe('en');
            expect(normalizeLanguageForI18n('DE')).toBe('de');
        });

        it('should apply M_ISO639_OLD_TO_NEW mapping', () => {
            expect(normalizeLanguageForI18n('iw')).toBe('he');
            expect(normalizeLanguageForI18n('ji')).toBe('yi');
        });

        it('should handle ABAP language codes via M_ABAP_LANGUAGE_TO_LOCALE', () => {
            expect(normalizeLanguageForI18n('ZH')).toBe('zh_Hans');
            expect(normalizeLanguageForI18n('ZF')).toBe('zh_Hant');
            expect(normalizeLanguageForI18n('SH')).toBe('sr_Latn');
            expect(normalizeLanguageForI18n('CT')).toBe('cnr');
            expect(normalizeLanguageForI18n('6N')).toBe('en_GB');
            expect(normalizeLanguageForI18n('1P')).toBe('pt_PT');
            expect(normalizeLanguageForI18n('1X')).toBe('es_MX');
            expect(normalizeLanguageForI18n('3F')).toBe('fr_CA');
        });

        it('should handle ABAP language codes case-insensitively', () => {
            expect(normalizeLanguageForI18n('zh')).toBe('zh_Hans');
            expect(normalizeLanguageForI18n('zf')).toBe('zh_Hant');
            expect(normalizeLanguageForI18n('sh')).toBe('sr_Latn');
        });

        it('should handle BCP47 tags with region subtags', () => {
            expect(normalizeLanguageForI18n('pt-BR')).toBe('pt_BR');
            expect(normalizeLanguageForI18n('en-GB')).toBe('en_GB');
            expect(normalizeLanguageForI18n('zh-TW')).toBe('zh_TW');
            expect(normalizeLanguageForI18n('es-MX')).toBe('es_MX');
        });

        it('should handle BCP47 tags with script subtags', () => {
            expect(normalizeLanguageForI18n('zh-Hans')).toBe('zh_Hans');
            expect(normalizeLanguageForI18n('zh-Hant')).toBe('zh_Hant');
            expect(normalizeLanguageForI18n('sr-Latn')).toBe('sr_Latn');
        });

        it('should handle BCP47 tags with underscore separators', () => {
            expect(normalizeLanguageForI18n('pt_BR')).toBe('pt_BR');
            expect(normalizeLanguageForI18n('zh_Hans')).toBe('zh_Hans');
        });

        it('should handle ABAP pseudo language codes by extracting language and region only', () => {
            // Pseudo languages (1Q, 2Q, 3Q) map to en-US-x-saptrc etc.
            // Private use sections are not relevant for i18n file naming
            expect(normalizeLanguageForI18n('1Q')).toBe('en_US');
            expect(normalizeLanguageForI18n('2Q')).toBe('en_US');
            expect(normalizeLanguageForI18n('3Q')).toBe('en_US');
        });
    });

    describe('replaceTextsWithI18nBindings', () => {
        it('should replace value with i18n binding expression', () => {
            const contentTexts: Record<string, Record<string, unknown>> = {
                annotationText: {
                    value: 'Category ID',
                    type: 'XFLD'
                }
            };

            const result = replaceTextsWithI18nBindings(contentTexts, 'id_123_renameLabel');

            expect(result).toEqual({
                annotationText: {
                    value: '{i18n>id_123_renameLabel_annotationText}',
                    type: 'XFLD'
                }
            });
        });

        it('should handle multiple text entries', () => {
            const contentTexts: Record<string, Record<string, unknown>> = {
                title: { value: 'My Title', type: 'XTIT' },
                description: { value: 'My Description', type: 'XFLD', maxLength: 100 }
            };

            const result = replaceTextsWithI18nBindings(contentTexts, 'id_456_change');

            expect(result).toEqual({
                title: {
                    value: '{i18n>id_456_change_title}',
                    type: 'XTIT'
                },
                description: {
                    value: '{i18n>id_456_change_description}',
                    type: 'XFLD',
                    maxLength: 100
                }
            });
        });

        it('should preserve all properties except value', () => {
            const contentTexts: Record<string, Record<string, unknown>> = {
                label: { value: 'Original', type: 'XFLD', maxLength: 50, customProp: true }
            };

            const result = replaceTextsWithI18nBindings(contentTexts, 'id_789_rename');

            expect(result.label.type).toBe('XFLD');
            expect(result.label.maxLength).toBe(50);
            expect(result.label.customProp).toBe(true);
            expect(result.label.value).toBe('{i18n>id_789_rename_label}');
        });

        it('should not mutate original contentTexts', () => {
            const contentTexts: Record<string, Record<string, unknown>> = {
                text: { value: 'Original Value', type: 'XFLD' }
            };

            replaceTextsWithI18nBindings(contentTexts, 'id_test');

            expect(contentTexts.text.value).toBe('Original Value');
        });
    });

    describe('writeKeyUserTranslations', () => {
        const projectPath = 'project';
        let fs: Editor;

        beforeEach(() => {
            jest.clearAllMocks();
            fs = create(createStorage());
        });

        it('should write translations to the correct i18n files', async () => {
            const topLevelTexts: KeyUserTextTranslations = {
                annotationText: {
                    type: 'XFLD',
                    values: {
                        '': 'Category ID',
                        'en': 'Category ID'
                    }
                }
            };

            await writeKeyUserTranslations(projectPath, 'id_123_renameLabel', topLevelTexts, fs);

            // Should be called twice: once for default language, once for 'en'
            expect(createPropertiesI18nEntriesMock).toHaveBeenCalledTimes(2);

            // Default language file
            expect(createPropertiesI18nEntriesMock).toHaveBeenCalledWith(
                expect.stringContaining(path.join('i18n', 'i18n.properties')),
                [
                    {
                        key: 'id_123_renameLabel_annotationText',
                        value: 'Category ID',
                        annotation: { textType: 'XFLD' }
                    }
                ],
                undefined,
                fs
            );

            // English language file
            expect(createPropertiesI18nEntriesMock).toHaveBeenCalledWith(
                expect.stringContaining(path.join('i18n', 'i18n_en.properties')),
                [
                    {
                        key: 'id_123_renameLabel_annotationText',
                        value: 'Category ID',
                        annotation: { textType: 'XFLD' }
                    }
                ],
                undefined,
                fs
            );
        });

        it('should handle multiple text entries with multiple languages', async () => {
            const topLevelTexts: KeyUserTextTranslations = {
                title: {
                    type: 'XTIT',
                    values: {
                        '': 'Title',
                        'de': 'Titel'
                    }
                },
                description: {
                    type: 'XFLD',
                    values: {
                        '': 'Description',
                        'de': 'Beschreibung'
                    }
                }
            };

            await writeKeyUserTranslations(projectPath, 'id_456_change', topLevelTexts, fs);

            // Should be called twice: default and 'de'
            expect(createPropertiesI18nEntriesMock).toHaveBeenCalledTimes(2);

            // Default language file should have both entries
            expect(createPropertiesI18nEntriesMock).toHaveBeenCalledWith(
                expect.stringContaining(path.join('i18n', 'i18n.properties')),
                expect.arrayContaining([
                    expect.objectContaining({ key: 'id_456_change_title', value: 'Title' }),
                    expect.objectContaining({ key: 'id_456_change_description', value: 'Description' })
                ]),
                undefined,
                fs
            );

            // German language file should have both entries
            expect(createPropertiesI18nEntriesMock).toHaveBeenCalledWith(
                expect.stringContaining(path.join('i18n', 'i18n_de.properties')),
                expect.arrayContaining([
                    expect.objectContaining({ key: 'id_456_change_title', value: 'Titel' }),
                    expect.objectContaining({ key: 'id_456_change_description', value: 'Beschreibung' })
                ]),
                undefined,
                fs
            );
        });

        it('should skip text entries without values', async () => {
            const topLevelTexts: KeyUserTextTranslations = {
                emptyText: {
                    type: 'XFLD'
                },
                validText: {
                    type: 'XTIT',
                    values: {
                        '': 'Valid'
                    }
                }
            };

            await writeKeyUserTranslations(projectPath, 'id_789_change', topLevelTexts, fs);

            expect(createPropertiesI18nEntriesMock).toHaveBeenCalledTimes(1);
            expect(createPropertiesI18nEntriesMock).toHaveBeenCalledWith(
                expect.stringContaining(path.join('i18n', 'i18n.properties')),
                [expect.objectContaining({ key: 'id_789_change_validText', value: 'Valid' })],
                undefined,
                fs
            );
        });

        it('should not include annotation when text type is not provided', async () => {
            const topLevelTexts: KeyUserTextTranslations = {
                text: {
                    values: {
                        '': 'No Type'
                    }
                }
            };

            await writeKeyUserTranslations(projectPath, 'id_999_change', topLevelTexts, fs);

            expect(createPropertiesI18nEntriesMock).toHaveBeenCalledWith(
                expect.anything(),
                [{ key: 'id_999_change_text', value: 'No Type' }],
                undefined,
                fs
            );
        });

        it('should apply language normalization for language keys', async () => {
            const topLevelTexts: KeyUserTextTranslations = {
                text: {
                    type: 'XFLD',
                    values: {
                        'iw': 'Hebrew Text'
                    }
                }
            };

            await writeKeyUserTranslations(projectPath, 'id_lang_change', topLevelTexts, fs);

            expect(createPropertiesI18nEntriesMock).toHaveBeenCalledWith(
                expect.stringContaining(path.join('i18n', 'i18n_he.properties')),
                expect.anything(),
                undefined,
                fs
            );
        });
    });
});
