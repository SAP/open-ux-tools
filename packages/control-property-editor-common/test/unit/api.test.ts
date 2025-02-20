import {
    PropertyType,
    addExtensionPoint,
    changeProperty,
    changeStackModified,
    controlSelected,
    deletePropertyChanges,
    externalFileChange,
    iconsLoaded,
    outlineChanged,
    propertyChangeFailed,
    propertyChanged,
    selectControl
} from '../../src/api';
import type { Control, ChangeStackModified, PropertyChange, OutlineNode } from '../../src/api';

describe('createExternalAction', () => {
    test('iconsLoaded', () => {
        const icons = [
            {
                content: 'test',
                fontFamily: 'test-family',
                name: 'test-icon'
            }
        ];
        const loadedIcons = iconsLoaded(icons);
        expect(loadedIcons.type).toBe('[ext] icons-loaded');
        expect(loadedIcons.payload).toStrictEqual(icons);
    });

    test('controlSelected', () => {
        const payload = {
            id: 'testId',
            name: 'testName',
            properties: [
                {
                    editor: 'input',
                    isEnabled: true,
                    name: 'testProperty',
                    readableName: '',
                    type: 'string',
                    value: 'test'
                }
            ],
            type: 'string'
        } as Control;
        const selectedControl = controlSelected(payload);
        expect(selectedControl.type).toBe('[ext] control-selected');
        expect(selectedControl.payload).toStrictEqual(payload);
    });

    test('selectControl', () => {
        const payload = 'test';
        const selectedControl = selectControl(payload);
        expect(selectedControl.type).toBe('[ext] select-control');
        expect(selectedControl.payload).toStrictEqual(payload);
    });

    test('deletePropertyChanges', () => {
        const payload = {
            controlId: 'testId',
            propertyName: 'testProp',
            fileName: 'test.change'
        };
        const deletedPropertyChange = deletePropertyChanges(payload);
        expect(deletedPropertyChange.type).toBe('[ext] delete-property-changes');
        expect(deletedPropertyChange.payload).toStrictEqual(payload);
    });

    test('outlineChanged', () => {
        const payload = [
            {
                children: [],
                controlId: 'testId',
                controlName: 'input',
                changeType: 'propertyChange',
                controlType: 'testType',
                editable: true,
                name: 'testControl',
                visible: true
            }
        ];
        const changedOutline = outlineChanged(payload);
        expect(changedOutline.type).toBe('[ext] outline-changed');
        expect(changedOutline.payload).toStrictEqual(payload);
    });

    test('changeProperty', () => {
        const payload: PropertyChange = {
            controlId: 'testId',
            controlName: 'input',
            value: 'oldValue',
            propertyName: 'testProp',
            changeType: 'propertyChange',
            propertyType: PropertyType.ControlProperty
        };
        const changedProp = changeProperty(payload);
        expect(changedProp.type).toBe('[ext] change-property');
        expect(changedProp.payload).toStrictEqual(payload);
    });

    test('propertyChanged', () => {
        const payload = { controlId: 'testId', newValue: 'testNewVal', propertyName: 'testProp' };
        const changedProp = propertyChanged(payload);
        expect(changedProp.type).toBe('[ext] property-changed');
        expect(changedProp.payload).toStrictEqual(payload);
    });

    test('propertyChangeFailed', () => {
        const payload = {
            controlId: 'testId',
            errorMessage: 'testError',
            propertyName: 'testProp'
        };
        const changedProp = propertyChangeFailed(payload);
        expect(changedProp.type).toBe('[ext] change-property-failed');
        expect(changedProp.payload).toStrictEqual(payload);
    });

    test('changeStackModified', () => {
        const payload: ChangeStackModified = {
            pending: [
                {
                    controlId: 'testPendingId',
                    isActive: true,
                    propertyName: 'testPendingProp',
                    type: 'pending',
                    value: 'test',
                    controlName: 'test',
                    kind: 'property',
                    changeType: 'propertyChange',
                    fileName: 'fileName1',
                    propertyType: PropertyType.ControlProperty
                }
            ],
            saved: [
                {
                    controlId: 'testSavedId',
                    propertyName: 'testSavedProp',
                    type: 'saved',
                    value: 'test',
                    fileName: 'testSaveId.change',
                    kind: 'property',
                    changeType: 'propertyChange',
                    controlName: 'button',
                    timestamp: 12343310032023,
                    propertyType: PropertyType.ControlProperty
                }
            ]
        };
        const changedProp = changeStackModified(payload);
        expect(changedProp.type).toBe('[ext] change-stack-modified');
        expect(changedProp.payload).toStrictEqual(payload);
    });

    test('addExtensionPoint', () => {
        const payload = {
            controlId: 'testId',
            errorMessage: 'testError',
            propertyName: 'testProp',
            controlType: 'sap.ui.extensionpoint',
            name: 'testExtensionPoint',
            visible: true,
            editable: true,
            children: []
        } as OutlineNode;

        const changedProp = addExtensionPoint(payload);
        expect(changedProp.type).toBe('[ext] add-extension-point');
        expect(changedProp.payload).toStrictEqual(payload);
    });

    test('externalFileChange', () => {
        const payload = 'filePath';

        const externalFile = externalFileChange(payload);
        expect(externalFile.type).toBe('[ext] external-file-change');
        expect(externalFile.payload).toStrictEqual('filePath');
    });
});
