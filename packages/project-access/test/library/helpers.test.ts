import { join } from 'node:path';
import {
    checkDependencies,
    getReuseLibs,
    getLibraryDesc,
    getManifestDesc,
    validateId
} from '../../src/library/helpers';
import * as manifestJson from '../test-data/libs/sap.reuse.ex.test.lib.attachmentservice/src/sap/reuse/ex/test/lib/attachmentservice/manifest.json';
import type { LibraryXml, Manifest, ReuseLib } from '../../src';
import * as fileUtils from '../../src/file';

describe('library utils', () => {
    test('should return library choices', async () => {
        const findFilesSpy = jest.spyOn(fileUtils, 'findFiles');
        const libChoices = await getReuseLibs([
            {
                projectRoot: join(__dirname, '../test-data/libs/sap.reuse.ex.test.lib.attachmentservice'),
                manifestPath: join(
                    __dirname,
                    '../test-data/libs/sap.reuse.ex.test.lib.attachmentservice/src/sap/se/mi/plm/lib/attachmentservice/manifest.json'
                ),
                manifest: manifestJson as Manifest,
                libraryPath: join(
                    __dirname,
                    '../test-data/libs/sap.reuse.ex.test.lib.attachmentservice/src/sap/se/mi/plm/lib/attachmentservice/.library'
                )
            }
        ]);

        expect(findFilesSpy).toHaveBeenCalledTimes(3);
        expect(libChoices).toHaveLength(4);
        libChoices.sort((a, b) => a.name.localeCompare(b.name));

        expect(libChoices[0].name).toBe('sap.reuse.ex.test.lib.attachmentservice');
        expect(libChoices[1].name).toBe('sap.reuse.ex.test.lib.attachmentservice.attachment');
        expect(libChoices[2].name).toBe('sap.reuse.ex.test.lib.attachmentservice.attachment.components.fscomponent');
        expect(libChoices[3].name).toBe('sap.reuse.ex.test.lib.attachmentservice.attachment.components.stcomponent');

        expect(libChoices[0].path).toBe(
            join(
                __dirname,
                '../test-data/libs/sap.reuse.ex.test.lib.attachmentservice/src/sap/reuse/ex/test/lib/attachmentservice'
            )
        );
        expect(libChoices[1].path).toBe(
            join(
                __dirname,
                '../test-data/libs/sap.reuse.ex.test.lib.attachmentservice/src/sap/reuse/ex/test/lib/attachmentservice/attachment'
            )
        );
        expect(libChoices[2].path).toBe(
            join(
                __dirname,
                '../test-data/libs/sap.reuse.ex.test.lib.attachmentservice/src/sap/reuse/ex/test/lib/attachmentservice/attachment/components/fscomponent'
            )
        );

        expect(libChoices[3].path).toBe(
            join(
                __dirname,
                '../test-data/libs/sap.reuse.ex.test.lib.attachmentservice/src/sap/reuse/ex/test/lib/attachmentservice/attachment/components/stcomponent'
            )
        );

        for (const lib of libChoices) {
            expect(lib.description).toBe('UI Library for Fiori Reuse Attachment Service');
        }
    });

    test('should return missing dependencies', async () => {
        const reuseLibAnswers = [
            {
                name: 'lib1',
                dependencies: ['dep1', 'dep2', 'dep3']
            }
        ] as ReuseLib[];
        const allReuseLibs = [
            {
                name: 'dep1'
            },
            {
                name: 'dep3'
            }
        ] as ReuseLib[];
        const missingDeps = checkDependencies(reuseLibAnswers, allReuseLibs);
        expect(missingDeps).toEqual('dep2');
    });

    test('should return manifest description', async () => {
        const manifest = {
            'sap.app': {
                description: 'test description'
            }
        } as Manifest;
        const description = await getManifestDesc(manifest, 'mock/path');
        expect(description).toEqual('test description');
    });

    test('should return library description', async () => {
        const lib = {
            'library': {
                documentation: 'test description'
            }
        } as unknown as LibraryXml;
        const description = await getLibraryDesc(lib, 'mock/path');
        expect(description).toEqual('test description');
    });
});

describe('validateId', () => {
    const sampleView = `<mvc:View
    xmlns:mvc="sap.ui.core.mvc"
    xmlns="sap.m"
    controllerName="my.app.controller.Main">
    <Page id="mainPage" title="Main View">
        <content>
            <Button id = "submitButton" text="Submit" />
            <Input id="nameInput" placeholder="Enter name" />
            <Table id ="dataTable">
                <columns>
                    <Column>
                        <Text text="Name" />
                    </Column>
                </columns>
            </Table>
        </content>
    </Page>
</mvc:View>`;

    const sampleFragment = `<core:FragmentDefinition
    xmlns="sap.m"
    xmlns:core="sap.ui.core">
    <Dialog id="confirmDialog" title="Confirm Action">
        <content>
            <Text id= "dialogText" text="Are you sure?" />
        </content>
        <beginButton>
            <Button id="confirmButton" text="Confirm" press="onConfirm" />
        </beginButton>
        <endButton>
            <Button id="cancelButton" text="Cancel" press="onCancel" />
        </endButton>
    </Dialog>
</core:FragmentDefinition>`;

    const sampleViewWithNamespace = `<mvc:View
    xmlns:mvc="sap.ui.core.mvc"
    xmlns="sap.m"
    xmlns:f="sap.ui.layout.form">
    <f:SimpleForm id="detailForm">
        <f:content>
            <Label text="Title" />
            <Input id="titleInput" />
        </f:content>
    </f:SimpleForm>
</mvc:View>`;

    describe('synchronous overload (with files)', () => {
        test('should return true when id does not exist in any files', () => {
            const result = validateId('newButton', undefined, {
                files: [sampleView, sampleFragment]
            });
            // Assert it's a plain boolean, not a Promise
            expect(result).toBe(true);
            expect(result).not.toBeInstanceOf(Promise);
        });

        test('should return false when id exists in view', () => {
            const result = validateId('submitButton', undefined, {
                files: [sampleView, sampleFragment]
            });
            expect(result).toBe(false);
            expect(result).not.toBeInstanceOf(Promise);
        });

        test('should return false when id exists in fragment', () => {
            const result = validateId('confirmDialog', undefined, {
                files: [sampleView, sampleFragment]
            });
            expect(result).toBe(false);
            expect(result).not.toBeInstanceOf(Promise);
        });

        test('should return false when id is in validatedIds array', () => {
            const result = validateId('newButton', ['newButton', 'anotherButton'], {
                files: [sampleView, sampleFragment]
            });
            expect(result).toBe(false);
            expect(result).not.toBeInstanceOf(Promise);
        });

        test('should return true when id is unique across multiple files', () => {
            const result = validateId('uniqueId', undefined, {
                files: [sampleView, sampleFragment, sampleViewWithNamespace]
            });
            expect(result).toBe(true);
            expect(result).not.toBeInstanceOf(Promise);
        });

        test('should return false when id exists in nested elements', () => {
            const result = validateId('dataTable', undefined, {
                files: [sampleView]
            });
            expect(result).toBe(false);
            expect(result).not.toBeInstanceOf(Promise);
        });

        test('should return false when id exists in fragment dialog content', () => {
            const result = validateId('dialogText', undefined, {
                files: [sampleFragment]
            });
            expect(result).toBe(false);
            expect(result).not.toBeInstanceOf(Promise);
        });

        test('should return true for empty files array', () => {
            const result = validateId('anyId', undefined, {
                files: []
            });
            expect(result).toBe(true);
            expect(result).not.toBeInstanceOf(Promise);
        });

        test('should return true when XML parsing fails', () => {
            // fast-xml-parser is lenient, but completely invalid content should fail
            const invalidXml = '<<<>>><invalid';
            const result = validateId('test', undefined, {
                files: [invalidXml]
            });
            expect(result).toBe(true);
            expect(result).not.toBeInstanceOf(Promise);
        });

        test('should return true when files contain empty strings', () => {
            const result = validateId('testId', undefined, {
                files: ['', '', sampleView]
            });
            expect(result).toBe(true);
            expect(result).not.toBeInstanceOf(Promise);
        });

        test('should handle ids with special characters', () => {
            const xmlWithSpecialId = `<?xml version="1.0" encoding="UTF-8"?>
<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m">
    <Button id="button-with-dash" text="Test" />
    <Button id="button_with_underscore" text="Test" />
    <Button id="button.with.dot" text="Test" />
</mvc:View>`;

            const result1 = validateId('button-with-dash', undefined, {
                files: [xmlWithSpecialId]
            });
            expect(result1).toBe(false);
            expect(result1).not.toBeInstanceOf(Promise);

            const result2 = validateId('button_with_underscore', undefined, {
                files: [xmlWithSpecialId]
            });
            expect(result2).toBe(false);
            expect(result2).not.toBeInstanceOf(Promise);

            const result3 = validateId('button.with.dot', undefined, {
                files: [xmlWithSpecialId]
            });
            expect(result3).toBe(false);
            expect(result3).not.toBeInstanceOf(Promise);

            const result4 = validateId('button-not-exists', undefined, {
                files: [xmlWithSpecialId]
            });
            expect(result4).toBe(true);
            expect(result4).not.toBeInstanceOf(Promise);
        });
    });

    describe('asynchronous overload (no files)', () => {
        test('should return Promise when no options provided', async () => {
            const result = validateId('anyId');
            // Assert it's a Promise
            expect(result).toBeInstanceOf(Promise);
            expect(await result).toBe(true);
        });

        test('should return Promise when only validatedIds provided', async () => {
            const result = validateId('anyId', ['otherId']);
            expect(result).toBeInstanceOf(Promise);
            expect(await result).toBe(true);
        });
    });
});
