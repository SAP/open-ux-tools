import { dirname, join } from 'node:path';
import { ApplicationParser } from '../../../src/project-context/parser/parser.js';
import {
    V2_FLEX_CHANGE_FILE_PATH,
    V2_MANIFEST,
    V2_MANIFEST_PATH,
    V2_PROJECT_PATH,
    V4_I18N_PATH,
    V4_MANIFEST,
    V4_MANIFEST_PATH,
    V4_PROJECT_PATH
} from '../../test-helper.js';
import type {
    FlexChange,
    I18nBundle,
    ParsedProject,
    ParsedService
} from '../../../src/project-context/parser/types.js';
import { pathToFileURL } from 'node:url';
import type { DocumentNode } from '@humanwhocodes/momoa';

describe('Flex change', () => {
    const parser = new ApplicationParser();
    const fileCache = new Map<string, string>();
    const changeFileUri = pathToFileURL(V2_FLEX_CHANGE_FILE_PATH).toString();
    let parsedProject: ParsedProject;
    const propertyChange = {
        changeType: 'propertyChange',
        content: {
            property: 'testProperty',
            newValue: true
        },
        selector: {
            id: 'lrpv2products::sap.suite.ui.generic.template.ObjectPage.view.Details::SEPMRA_C_PD_Product--ProductReviewFacetID::Table',
            idIsLocal: false,
            type: 'sap.ui.comp.smarttable.SmartTable'
        },
        changeFileUri
    };
    const appUri = pathToFileURL(V2_PROJECT_PATH).toString();

    beforeEach(() => {
        parsedProject = {
            projectType: 'EDMXBackend',
            apps: {
                [appUri]: {
                    manifest: {
                        webappPath: dirname(V2_MANIFEST_PATH),
                        manifestUri: pathToFileURL(V2_MANIFEST_PATH).toString(),
                        appId: '',
                        flexEnabled: true,
                        customViews: {},
                        mainServiceName: 'mainService'
                    },
                    services: { mainService: {} as ParsedService },
                    manifestObject: V2_MANIFEST,
                    projectRootPath: V2_PROJECT_PATH,
                    changes: [],
                    i18nBundles: []
                }
            },
            documents: {}
        };
        fileCache.clear();
    });

    test('reparse: adds new .change file', () => {
        const reparsed = parser.reparse(changeFileUri, parsedProject, fileCache);
        expect(reparsed.index.documents[changeFileUri]).toBeDefined();
        expect(reparsed.index.apps[appUri].changes).toHaveLength(1);
        expect(reparsed.index.apps[appUri].changes[0]).toStrictEqual(propertyChange);
    });

    test('reparse: removes changes from deleted .change file', () => {
        const nonExistentChangeFileUri = pathToFileURL(
            join(dirname(changeFileUri), 'non-existent-file.change')
        ).toString();
        const existingPropertyChange = {
            ...propertyChange,
            changeFileUri: nonExistentChangeFileUri
        };
        fileCache.set(nonExistentChangeFileUri, JSON.stringify(existingPropertyChange));
        parsedProject.apps[appUri].changes = [existingPropertyChange];
        const reparsed = parser.reparse(changeFileUri, parsedProject, fileCache); // reparse new change file
        expect(reparsed.index.documents[changeFileUri]).toBeDefined();
        expect(reparsed.index.apps[appUri].changes).toHaveLength(1); // non-existent-file change was deleted
        expect(reparsed.index.apps[appUri].changes[0].changeFileUri).toStrictEqual(changeFileUri);
    });

    test('reparse: applies change in a .change file', () => {
        const newChange = structuredClone(propertyChange) as FlexChange;
        newChange.content.newValue = false;
        fileCache.set(changeFileUri, JSON.stringify(newChange));
        const reparsed = parser.reparse(changeFileUri, parsedProject, fileCache);
        expect(reparsed.index.documents[changeFileUri]).toBeDefined();
        expect(reparsed.index.apps[appUri].changes).toHaveLength(1);
        expect(reparsed.index.apps[appUri].changes[0].content.newValue).toBe(false);
    });

    test('reparse: empty .change file with empty object content not collected to app changes', () => {
        fileCache.set(changeFileUri, '{}');
        const reparsed = parser.reparse(changeFileUri, parsedProject, fileCache);
        expect(reparsed.index.documents[changeFileUri]).toBeDefined();
        expect((reparsed.index.documents[changeFileUri] as DocumentNode).range).toStrictEqual([0, 2]); // Value '{}' saved
        expect(reparsed.index.apps[appUri].changes).toHaveLength(0); // change not collected
    });

    test('reparse: updated .change file with empty object content is deleted from app changes', () => {
        parsedProject.apps[appUri].changes = [propertyChange];
        fileCache.set(changeFileUri, '{}');
        const reparsed = parser.reparse(changeFileUri, parsedProject, fileCache);
        expect(reparsed.index.documents[changeFileUri]).toBeDefined();
        expect((reparsed.index.documents[changeFileUri] as DocumentNode).range).toStrictEqual([0, 2]);
        expect(reparsed.index.apps[appUri].changes).toHaveLength(0); // change removed
    });

    test('reparse: updated malformed .change file is deleted from app changes', () => {
        parsedProject.apps[appUri].changes = [propertyChange];
        fileCache.set(changeFileUri, '{');
        const reparsed = parser.reparse(changeFileUri, parsedProject, fileCache);
        expect(reparsed.index.documents[changeFileUri]).toBeUndefined();
        expect(reparsed.index.apps[appUri].changes).toHaveLength(0); // change removed
    });
});

describe('i18n bundles', () => {
    const parser = new ApplicationParser();
    const fileCache = new Map<string, string>();
    const i18nUri = pathToFileURL(V4_I18N_PATH).toString();
    const appUri = pathToFileURL(V4_PROJECT_PATH).toString();
    const initialBundle: I18nBundle = {
        uri: i18nUri,
        entries: { appTitle: 'For manual test automation', tableSection00: 'table, section, 00' }
    };
    let parsedProject: ParsedProject;

    beforeEach(() => {
        parsedProject = {
            projectType: 'EDMXBackend',
            apps: {
                [appUri]: {
                    manifest: {
                        webappPath: join(V4_PROJECT_PATH, 'webapp'),
                        manifestUri: pathToFileURL(V4_MANIFEST_PATH).toString(),
                        appId: '',
                        flexEnabled: false,
                        customViews: {},
                        mainServiceName: 'mainService'
                    },
                    services: { mainService: {} as ParsedService },
                    manifestObject: V4_MANIFEST,
                    projectRootPath: V4_PROJECT_PATH,
                    changes: [],
                    i18nBundles: [{ ...initialBundle, entries: { ...initialBundle.entries } }]
                }
            },
            documents: {}
        };
        fileCache.clear();
    });

    test('reparse: updates entries when .properties file changes', () => {
        fileCache.set(i18nUri, 'tableSection00=updated label\nnewKey=new value');
        const reparsed = parser.reparse(i18nUri, parsedProject, fileCache);
        const bundles = reparsed.index.apps[appUri].i18nBundles;
        expect(bundles).toHaveLength(1);
        expect(bundles[0].uri).toBe(i18nUri);
        expect(bundles[0].entries).toStrictEqual({ tableSection00: 'updated label', newKey: 'new value' });
    });

    test('reparse: ignores comment and empty lines in .properties file', () => {
        fileCache.set(i18nUri, '# comment line\n\nkey1=value1\n!skip this\nkey2=value2');
        const reparsed = parser.reparse(i18nUri, parsedProject, fileCache);
        expect(reparsed.index.apps[appUri].i18nBundles[0].entries).toStrictEqual({
            key1: 'value1',
            key2: 'value2'
        });
    });

    test('reparse: no-op when .properties URI is not tracked in any app bundle', () => {
        const unknownUri = pathToFileURL(join(V4_PROJECT_PATH, 'webapp', 'i18n', 'unknown.properties')).toString();
        fileCache.set(unknownUri, 'key=value');
        parser.reparse(unknownUri, parsedProject, fileCache);
        expect(parsedProject.apps[appUri].i18nBundles[0].entries).toStrictEqual(initialBundle.entries);
    });

    test('reparse: reads bundle from filesystem when not in file cache', () => {
        // do not populate fileCache — the parser falls back to readFileSync for the actual file
        const reparsed = parser.reparse(i18nUri, parsedProject, fileCache);
        const entries = reparsed.index.apps[appUri].i18nBundles[0].entries;
        expect(entries['appTitle']).toBeDefined();
    });
});
