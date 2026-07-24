import { jest } from '@jest/globals';
import { join } from 'node:path';
import { create, type Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { ToolsLogger } from '@sap-ux/logger';

import type { CommonChangeProperties } from '../../../src/index.js';

// Preserve the real modules (the subject transitively pulls other exports in) and override
// only the functions we need to observe.
const actualProjectAccess = await import('@sap-ux/project-access');
const mockGetWebappPath = jest.fn() as jest.Mock;
jest.unstable_mockModule('@sap-ux/project-access', () => ({
    ...actualProjectAccess,
    getWebappPath: mockGetWebappPath
}));

const actualI18n = await import('@sap-ux/i18n');
const mockCreatePropertiesI18nEntries = jest.fn() as jest.Mock;
jest.unstable_mockModule('@sap-ux/i18n', () => ({
    ...actualI18n,
    createPropertiesI18nEntries: mockCreatePropertiesI18nEntries
}));

const { isRenameChange, processRenameChangeI18n } = await import('../../../src/preview/rename-i18n-preprocessor.js');

const logger = new ToolsLogger();

function makeChange(overrides: Partial<CommonChangeProperties>): CommonChangeProperties {
    return {
        changeType: 'rename',
        fileName: 'id_1_rename',
        reference: 'app',
        namespace: 'ns',
        projectId: 'app',
        moduleName: '',
        support: { generator: 'x', sapui5Version: '1' },
        originalLanguage: 'EN',
        layer: 'CUSTOMER_BASE',
        fileType: 'change',
        texts: {},
        ...overrides
    } as CommonChangeProperties;
}

describe('isRenameChange', () => {
    it.each(['rename', 'renameField', 'renameLabel', 'annotationRename'])('returns true for %s', (changeType) => {
        expect(isRenameChange(makeChange({ changeType }))).toBe(true);
    });

    it.each(['addXML', 'codeExt', 'propertyChange', 'appdescr_app_addAnnotationsToOData'])(
        'returns false for %s',
        (changeType) => {
            expect(isRenameChange(makeChange({ changeType }))).toBe(false);
        }
    );
});

describe('processRenameChangeI18n', () => {
    const projectRoot = '/mock/project';
    const webappPath = join(projectRoot, 'webapp');
    let fs: Editor;

    beforeEach(() => {
        jest.resetAllMocks();
        mockGetWebappPath.mockResolvedValue(webappPath);
        mockCreatePropertiesI18nEntries.mockResolvedValue(true);
        fs = create(createStorage());
    });

    it('extracts a literal rename text and rewrites to an @i18n binding', async () => {
        const change = makeChange({
            fileName: 'id_1_rename',
            texts: { newText: { value: 'Supplier Name', type: 'XGRP' } }
        });

        const modified = await processRenameChangeI18n(projectRoot, change, fs, logger);

        expect(modified).toBe(true);
        expect((change.texts as Record<string, { value: string }>).newText.value).toBe('{@i18n>id_1_rename_newText}');
        expect(mockCreatePropertiesI18nEntries).toHaveBeenCalledWith(
            join(webappPath, 'i18n', 'i18n.properties'),
            [{ key: 'id_1_rename_newText', value: 'Supplier Name', annotation: { textType: 'XGRP' } }],
            undefined,
            fs
        );
    });

    it('re-points a legacy {i18n>} binding to {@i18n>} without re-extracting', async () => {
        const change = makeChange({
            fileName: 'id_2_annotationRename',
            changeType: 'annotationRename',
            texts: { annotationText: { value: '{i18n>id_2_annotationRename_annotationText}', type: 'XFLD' } }
        });

        const modified = await processRenameChangeI18n(projectRoot, change, fs, logger);

        expect(modified).toBe(true);
        expect((change.texts as Record<string, { value: string }>).annotationText.value).toBe(
            '{@i18n>id_2_annotationRename_annotationText}'
        );
        expect(mockCreatePropertiesI18nEntries).not.toHaveBeenCalled();
    });

    it('is a no-op when the value is already an @i18n binding', async () => {
        const change = makeChange({
            texts: { newText: { value: '{@i18n>id_1_rename_newText}', type: 'XGRP' } }
        });

        const modified = await processRenameChangeI18n(projectRoot, change, fs, logger);

        expect(modified).toBe(false);
        expect(mockCreatePropertiesI18nEntries).not.toHaveBeenCalled();
    });

    it('returns false when the change has no texts', async () => {
        const change = makeChange({ texts: {} });

        const modified = await processRenameChangeI18n(projectRoot, change, fs, logger);

        expect(modified).toBe(false);
        expect(mockCreatePropertiesI18nEntries).not.toHaveBeenCalled();
    });

    it('returns false when texts is missing entirely', async () => {
        const change = makeChange({});
        // Force the top-level texts to be absent.
        delete (change as { texts?: unknown }).texts;

        const modified = await processRenameChangeI18n(projectRoot, change, fs, logger);

        expect(modified).toBe(false);
    });

    it('skips entries whose value is not a string', async () => {
        const change = makeChange({
            texts: { newText: { value: 123 as unknown as string, type: 'XFLD' } }
        });

        const modified = await processRenameChangeI18n(projectRoot, change, fs, logger);

        expect(modified).toBe(false);
        expect(mockCreatePropertiesI18nEntries).not.toHaveBeenCalled();
    });

    it('handles multiple text entries in one change', async () => {
        const change = makeChange({
            fileName: 'id_3_rename',
            texts: {
                newText: { value: 'Title', type: 'XTIT' },
                subText: { value: 'Sub', type: 'XFLD' }
            }
        });

        const modified = await processRenameChangeI18n(projectRoot, change, fs, logger);

        expect(modified).toBe(true);
        const texts = change.texts as Record<string, { value: string }>;
        expect(texts.newText.value).toBe('{@i18n>id_3_rename_newText}');
        expect(texts.subText.value).toBe('{@i18n>id_3_rename_subText}');
        expect(mockCreatePropertiesI18nEntries).toHaveBeenCalledWith(
            expect.any(String),
            [
                { key: 'id_3_rename_newText', value: 'Title', annotation: { textType: 'XTIT' } },
                { key: 'id_3_rename_subText', value: 'Sub', annotation: { textType: 'XFLD' } }
            ],
            undefined,
            fs
        );
    });
});
