import { dirname, join } from 'node:path';
import { ApplicationParser } from '../../../src/project-context/parser/parser.js';
import { V2_FLEX_CHANGE_FILE_PATH, V2_MANIFEST, V2_MANIFEST_PATH, V2_PROJECT_PATH } from '../../test-helper.js';
import type { FlexChange, ParsedProject, ParsedService } from '../../../src/project-context/parser/types.js';
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

    beforeEach(() => {
        parsedProject = {
            projectType: 'EDMXBackend',
            apps: {
                '': {
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
                    changes: []
                }
            },
            documents: {}
        };
        fileCache.clear();
    });

    test('reparse: adds new .change file', () => {
        const reparsed = parser.reparse(changeFileUri, parsedProject, fileCache);
        expect(reparsed.index.documents[changeFileUri]).toBeDefined();
        expect(reparsed.index.apps[''].changes).toHaveLength(1);
        expect(reparsed.index.apps[''].changes[0]).toStrictEqual(propertyChange);
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
        parsedProject.apps[''].changes = [existingPropertyChange];
        const reparsed = parser.reparse(changeFileUri, parsedProject, fileCache); // reparse new change file
        expect(reparsed.index.documents[changeFileUri]).toBeDefined();
        expect(reparsed.index.apps[''].changes).toHaveLength(1); // non-existent-file change was deleted
        expect(reparsed.index.apps[''].changes[0].changeFileUri).toStrictEqual(changeFileUri);
    });

    test('reparse: applies change in a .change file', () => {
        const newChange = structuredClone(propertyChange) as FlexChange;
        newChange.content.newValue = false;
        fileCache.set(changeFileUri, JSON.stringify(newChange));
        const reparsed = parser.reparse(changeFileUri, parsedProject, fileCache);
        expect(reparsed.index.documents[changeFileUri]).toBeDefined();
        expect(reparsed.index.apps[''].changes).toHaveLength(1);
        expect(reparsed.index.apps[''].changes[0].content.newValue).toBe(false);
    });

    test('reparse: empty .change file with empty object content not collected to app changes', () => {
        fileCache.set(changeFileUri, '{}');
        const reparsed = parser.reparse(changeFileUri, parsedProject, fileCache);
        expect(reparsed.index.documents[changeFileUri]).toBeDefined();
        expect((reparsed.index.documents[changeFileUri] as DocumentNode).range).toStrictEqual([0, 2]); // Value '{}' saved
        expect(reparsed.index.apps[''].changes).toHaveLength(0); // change not collected
    });

    test('reparse: updated .change file with empty object content is deleted from app changes', () => {
        parsedProject.apps[''].changes = [propertyChange];
        fileCache.set(changeFileUri, '{}');
        const reparsed = parser.reparse(changeFileUri, parsedProject, fileCache);
        expect(reparsed.index.documents[changeFileUri]).toBeDefined();
        expect((reparsed.index.documents[changeFileUri] as DocumentNode).range).toStrictEqual([0, 2]);
        expect(reparsed.index.apps[''].changes).toHaveLength(0); // change removed
    });
});
