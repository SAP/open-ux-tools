import { isUI5IdUnique } from '../../src/project/ui5-xml-id-validator.js';

describe('isUI5IdUnique', () => {
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

    test('should return true when id does not exist in any files', () => {
        const result = isUI5IdUnique('newButton', [sampleView, sampleFragment]);
        expect(result).toBe(true);
    });

    test('should return false when id exists in view', () => {
        const result = isUI5IdUnique('submitButton', [sampleView, sampleFragment]);
        expect(result).toBe(false);
    });

    test('should return false when id exists in fragment', () => {
        const result = isUI5IdUnique('confirmDialog', [sampleView, sampleFragment]);
        expect(result).toBe(false);
    });

    test('should return true when id is unique across multiple files', () => {
        const result = isUI5IdUnique('uniqueId', [sampleView, sampleFragment, sampleViewWithNamespace]);
        expect(result).toBe(true);
    });

    test('should return false when id exists in nested elements', () => {
        const result = isUI5IdUnique('dataTable', [sampleView]);
        expect(result).toBe(false);
    });

    test('should return false when id exists in fragment dialog content', () => {
        const result = isUI5IdUnique('dialogText', [sampleFragment]);
        expect(result).toBe(false);
    });

    test('should return true for empty files array', () => {
        const result = isUI5IdUnique('anyId', []);
        expect(result).toBe(true);
    });

    test('should return true when XML parsing fails', () => {
        // fast-xml-parser is lenient, but completely invalid content should fail
        const invalidXml = '<<<>>><invalid';
        const result = isUI5IdUnique('test', [invalidXml]);
        expect(result).toBe(true);
    });

    test('should return true when files contain empty strings', () => {
        const result = isUI5IdUnique('testId', ['', '', sampleView]);
        expect(result).toBe(true);
    });

    test('should handle ids with special characters', () => {
        const xmlWithSpecialId = `<?xml version="1.0" encoding="UTF-8"?>
<mvc:View xmlns:mvc="sap.ui.core.mvc" xmlns="sap.m">
    <Button id="button-with-dash" text="Test" />
    <Button id="button_with_underscore" text="Test" />
    <Button id="button.with.dot" text="Test" />
</mvc:View>`;

        expect(isUI5IdUnique('button-with-dash', [xmlWithSpecialId])).toBe(false);
        expect(isUI5IdUnique('button_with_underscore', [xmlWithSpecialId])).toBe(false);
        expect(isUI5IdUnique('button.with.dot', [xmlWithSpecialId])).toBe(false);
        expect(isUI5IdUnique('button-not-exists', [xmlWithSpecialId])).toBe(true);
    });
});
