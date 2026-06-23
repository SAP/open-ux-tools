import { dirname } from 'node:path';
import { ApplicationParser } from '../../../src/project-context/parser/parser.js';
import { V2_FLEX_CHANGE_FILE_PATH, V2_MANIFEST, V2_MANIFEST_PATH, V2_PROJECT_PATH } from '../../test-helper.js';
import type { ParsedProject, ParsedService } from '../../../src/project-context/parser/types.js';
import { pathToFileURL } from 'node:url';

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

    beforeAll(() => {
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
    });

    test('reparse: adds new .change file', () => {
        const reparsed = parser.reparse(changeFileUri, parsedProject, fileCache);
        expect(reparsed.index.documents[changeFileUri]).toBeDefined();
        expect(parsedProject.apps[''].changes).toHaveLength(1);
        expect(parsedProject.apps[''].changes[0]).toStrictEqual(propertyChange);
    });

    test('reparse: removes changes from deleted .change file', () => {
        const existinPropertyChange = { ...propertyChange, changeFileUri: changeFileUri + 'non-existent-file' };
        parsedProject.apps[''].changes = [existinPropertyChange];
        const reparsed = parser.reparse(changeFileUri, parsedProject, fileCache);
        expect(reparsed.index.documents[changeFileUri]).toBeDefined();
        expect(parsedProject.apps[''].changes).toHaveLength(1);
        expect(parsedProject.apps[''].changes[0].changeFileUri).toStrictEqual(changeFileUri);
    });
});
