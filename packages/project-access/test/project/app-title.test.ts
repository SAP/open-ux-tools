import { jest } from '@jest/globals';
import type * as fileIndexType from '../../src/file/index.js';
import type * as uxI18nType from '@sap-ux/i18n';
import type * as i18nType from '../../src/project/i18n/i18n.js';
import type { Manifest } from '../../src/types/index.js';

const mockReadJSON = jest.fn<typeof fileIndexType.readJSON>();
jest.unstable_mockModule('../../src/file/index.js', () => ({
    readJSON: mockReadJSON
}));

const mockGetPropertiesI18nBundle = jest.fn<typeof uxI18nType.getPropertiesI18nBundle>();
const realUxI18n = await import('@sap-ux/i18n');
jest.unstable_mockModule('@sap-ux/i18n', () => ({
    ...realUxI18n,
    getPropertiesI18nBundle: mockGetPropertiesI18nBundle
}));

const mockGetI18nPropertiesPaths = jest.fn<typeof i18nType.getI18nPropertiesPaths>();
jest.unstable_mockModule('../../src/project/i18n/i18n.js', () => ({
    getI18nPropertiesPaths: mockGetI18nPropertiesPaths
}));

const { resolveApplicationTitle } = await import('../../src/project/app-title.js');

const MANIFEST_PATH = '/project/webapp/manifest.json';
const I18N_PATH = '/project/webapp/i18n/i18n.properties';

function makeManifest(title?: string): Manifest {
    return {
        'sap.app': { id: 'app', type: 'application', title, applicationVersion: { version: '1.0.0' } }
    } as unknown as Manifest;
}

function makeBundle(key: string, value: string): uxI18nType.I18nBundle {
    return {
        [key]: [{ filePath: I18N_PATH, key: { value: key }, value: { value } } as uxI18nType.I18nEntry]
    };
}

describe('resolveApplicationTitle()', () => {
    beforeEach(() => {
        mockReadJSON.mockReset();
        mockGetPropertiesI18nBundle.mockReset();
        mockGetI18nPropertiesPaths.mockReset();
    });

    test('when neither manifest nor manifestPath is provided, returns undefined', async () => {
        const result = await resolveApplicationTitle({});

        expect(result).toBeUndefined();
    });

    test('when manifestPath provided and title is a plain string, returns the plain string without i18n lookup', async () => {
        mockReadJSON.mockResolvedValue(makeManifest('My App'));

        const result = await resolveApplicationTitle({ manifestPath: MANIFEST_PATH });

        expect(result).toBe('My App');
        expect(mockGetI18nPropertiesPaths).not.toHaveBeenCalled();
    });

    test('when manifestPath provided and title is an i18n key, returns value resolved from bundle', async () => {
        mockReadJSON.mockResolvedValue(makeManifest('{{appTitle}}'));
        mockGetI18nPropertiesPaths.mockResolvedValue({ 'sap.app': I18N_PATH, models: {} });
        mockGetPropertiesI18nBundle.mockResolvedValue(makeBundle('appTitle', 'My Resolved App'));

        const result = await resolveApplicationTitle({ manifestPath: MANIFEST_PATH });

        expect(result).toBe('My Resolved App');
    });

    test('when i18n key is absent from bundle, returns undefined', async () => {
        mockReadJSON.mockResolvedValue(makeManifest('{{missingKey}}'));
        mockGetI18nPropertiesPaths.mockResolvedValue({ 'sap.app': I18N_PATH, models: {} });
        mockGetPropertiesI18nBundle.mockResolvedValue({});

        const result = await resolveApplicationTitle({ manifestPath: MANIFEST_PATH });

        expect(result).toBeUndefined();
    });

    test('when only manifest provided and title is a plain string, returns the plain string without reading manifest again', async () => {
        const manifest = makeManifest('Direct Title');

        const result = await resolveApplicationTitle({ manifest });

        expect(mockReadJSON).not.toHaveBeenCalled();
        expect(result).toBe('Direct Title');
    });

    test('when only manifest provided and title is an i18n key, returns undefined (no path to resolve i18n)', async () => {
        const manifest = makeManifest('{{appTitle}}');

        const result = await resolveApplicationTitle({ manifest });

        expect(result).toBeUndefined();
    });

    test('when both manifest and manifestPath provided, manifest is not re-read from disk', async () => {
        const manifest = makeManifest('{{appTitle}}');
        mockGetI18nPropertiesPaths.mockResolvedValue({ 'sap.app': I18N_PATH, models: {} });
        mockGetPropertiesI18nBundle.mockResolvedValue(makeBundle('appTitle', 'Resolved'));

        const result = await resolveApplicationTitle({ manifest, manifestPath: MANIFEST_PATH });

        expect(mockReadJSON).not.toHaveBeenCalled();
        expect(result).toBe('Resolved');
    });

    test('when sap.app.title is absent, returns undefined', async () => {
        mockReadJSON.mockResolvedValue(makeManifest(undefined));

        const result = await resolveApplicationTitle({ manifestPath: MANIFEST_PATH });

        expect(result).toBeUndefined();
    });

    test('when i18n properties file cannot be read, returns undefined', async () => {
        mockReadJSON.mockResolvedValue(makeManifest('{{appTitle}}'));
        mockGetI18nPropertiesPaths.mockResolvedValue({ 'sap.app': I18N_PATH, models: {} });
        mockGetPropertiesI18nBundle.mockRejectedValue(new Error('ENOENT: file not found'));

        const result = await resolveApplicationTitle({ manifestPath: MANIFEST_PATH });

        expect(result).toBeUndefined();
    });
});
