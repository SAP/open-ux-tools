import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { initIcons } from '@sap-ux/ui-components';

import { render } from '../../utils';
import { FilterName } from '../../../../src/slice';
import type { FilterOptions, ChangesSlice, default as reducer } from '../../../../src/slice';
import { DeviceType } from '../../../../src/devices';
import { registerAppIcons } from '../../../../src/icons';
import { ChangesPanel } from '../../../../src/panels/changes';
import { initI18n } from '../../../../src/i18n';
import type { PendingChange, SavedPropertyChange } from '@sap-ux-private/control-property-editor-common';

export type State = ReturnType<typeof reducer>;

const getEmptyModel = (): ChangesSlice => {
    const model: ChangesSlice = {
        controls: {} as any,
        pending: [],
        saved: [],
        pendingChangeIds: []
    };
    return model;
};

const getModel = (saved = false): ChangesSlice => {
    const model: ChangesSlice = {
        controls: {} as any,
        pendingChangeIds: [],
        pending: !saved
            ? ([
                  {
                      controlId: 'testId1',
                      controlName: 'controlName1',
                      propertyName: 'testPropertyName1',
                      type: 'pending',
                      value: 'testValue1',
                      isActive: true,
                      changeType: 'propertyChange',
                      fileName: 'testFile1'
                  },
                  {
                      controlId: 'testId1BoolFalse',
                      controlName: 'controlNameBoolFalse',
                      propertyName: 'testPropertyNameBoolFalse',
                      type: 'pending',
                      value: false,
                      isActive: true,
                      changeType: 'propertyChange',
                      fileName: 'testFile2'
                  },
                  {
                      controlId: 'testId1Exp',
                      controlName: 'controlNameExp',
                      propertyName: 'testPropertyNameExp',
                      type: 'pending',
                      value: '{expression}',
                      isActive: true,
                      changeType: 'propertyBindingChange',
                      fileName: 'testFile3'
                  },
                  {
                      controlId: 'ListReport::TableToolbar',
                      controlName: 'OverflowToolbar',
                      type: 'pending',
                      isActive: true,
                      changeType: 'addXML',
                      fileName: 'testFile4'
                  },
                  {
                      controlId: 'FieldGroup::TechnicalData::FormGroup',
                      controlName: 'Group',
                      type: 'pending',
                      isActive: true,
                      changeType: 'addFields',
                      fileName: 'testFile5'
                  }
              ] as PendingChange[])
            : [],
        saved: saved
            ? ([
                  {
                      controlId: 'testId2',
                      controlName: 'controlName2',
                      propertyName: 'testPropertyName2',
                      type: 'saved',
                      value: 'testValue2',
                      fileName: 'testFileName',
                      kind: 'valid',
                      timestamp: new Date('2022-02-09T12:06:53.939Z').getTime(),
                      changeType: 'propertyChange'
                  },
                  {
                      controlId: 'testId2',
                      controlName: 'controlName2',
                      propertyName: 'Icon',
                      type: 'saved',
                      value: 'sap-icon://accept',
                      fileName: 'testFileName',
                      kind: 'valid',
                      timestamp: new Date('2022-02-09T12:06:53.939Z').getTime(),
                      changeType: 'propertyChange'
                  },
                  {
                      controlId: 'testId3',
                      controlName: 'controlNameBoolean',
                      propertyName: 'testPropertyNameBool',
                      type: 'saved',
                      value: true,
                      fileName: 'testFileNameBool',
                      kind: 'valid',
                      timestamp: new Date('2022-02-09T12:06:53.939Z').getTime(),
                      changeType: 'propertyChange'
                  },
                  {
                      controlId: 'testId4',
                      controlName: 'controlNameNumber',
                      propertyName: 'testPropertyNameNum',
                      type: 'saved',
                      value: 2,
                      fileName: 'testFileNameNum',
                      kind: 'valid',
                      timestamp: new Date('2022-02-09T12:06:53.939Z').getTime(),
                      changeType: 'propertyChange'
                  },
                  {
                      controlId: 'supplierView--supplierForm',
                      type: 'saved',
                      fileName: 'id_1698648267087_373_moveSimpleFormField',
                      kind: 'unknown',
                      timestamp: new Date('2023-10-11T12:06:53.939Z').getTime()
                  },
                  {
                      controlId: 'supplierView--supplierForm',
                      type: 'saved',
                      fileName: 'id_1698648267088_374_moveSimpleFormField',
                      kind: 'unknown',
                      timestamp: new Date('2023-10-12T12:06:53.939Z').getTime()
                  }
              ] as SavedPropertyChange[])
            : []
    };
    return model;
};
const filterInitOptions: FilterOptions[] = [{ name: FilterName.changeSummaryFilterQuery, value: '' }];
describe('ChangePanel', () => {
    beforeAll(() => {
        initI18n();
        initIcons();
        registerAppIcons();
    });

    test('ChangePanel - check if search filter rendered', () => {
        const model = getEmptyModel();
        const initialState: State = {
            deviceType: DeviceType.Desktop,
            scale: 1,
            outline: {} as any,
            filterQuery: filterInitOptions,
            selectedControl: undefined,
            changes: model,
            icons: [],
            dialogMessage: undefined,
            isAdpProject: false
        };
        render(<ChangesPanel />, { initialState });

        // check if search box exists
        const searchBarByRole = screen.getByRole('searchbox');
        expect(searchBarByRole).toBeInTheDocument();

        const searchBarByPlaceholder = screen.getByPlaceholderText(/Filter/, { exact: true });
        expect(searchBarByPlaceholder).toBeInTheDocument();
    });

    test('ChangePanel empty save and pending', () => {
        const model = getEmptyModel();
        const initialState: State = {
            deviceType: DeviceType.Desktop,
            scale: 1,
            outline: {} as any,
            filterQuery: filterInitOptions,
            selectedControl: undefined,
            changes: model,
            icons: [],
            dialogMessage: undefined,
            isAdpProject: false
        };
        render(<ChangesPanel />, { initialState });

        // check no controls found
        const noControlFound = screen.getByText(/no control changes found/i);
        expect(noControlFound).toBeInTheDocument();
    });

    test('unsaved changes - all changes', () => {
        const model = getModel();
        const initialState: State = {
            deviceType: DeviceType.Desktop,
            scale: 1,
            outline: {} as any,
            filterQuery: filterInitOptions,
            selectedControl: undefined,
            changes: model,
            icons: [],
            dialogMessage: undefined,
            isAdpProject: false,
            scenario: 'APP_VARIANT'
        };
        render(<ChangesPanel />, { initialState });

        // check unsaved changes
        const unsavedChangesTitle = screen.getByText(/unsaved changes/i);
        expect(unsavedChangesTitle).toBeInTheDocument();

        const controlName = screen.getByRole('button', { name: /Control Name1/i });
        expect(controlName).toBeInTheDocument();

        const propertyName = screen.getByText(/Test Property Name1/i);
        expect(propertyName).toBeInTheDocument();

        const value = screen.getByText(/testValue1/i);
        expect(value).toBeInTheDocument();

        const controlToolbar = screen.getByRole('button', { name: /overflow toolbar/i });
        expect(controlToolbar).toBeInTheDocument();

        const changeAddXML = screen.getByText(/add fields/i);
        expect(changeAddXML).toBeInTheDocument();
    });

    test('saved changes - property change', () => {
        const model = getModel(true);
        const initialState: State = {
            deviceType: DeviceType.Desktop,
            scale: 1,
            outline: {} as any,
            filterQuery: filterInitOptions,
            selectedControl: undefined,
            changes: model,
            icons: [],
            dialogMessage: undefined,
            isAdpProject: false
        };
        render(<ChangesPanel />, { initialState });

        // check saved changes
        const savedChangesTitle = screen.getByText(/saved changes/i);
        expect(savedChangesTitle).toBeInTheDocument();

        const controlName1 = screen.getByRole('button', { name: /control name2/i });
        expect(controlName1).toBeInTheDocument();
        fireEvent.click(controlName1);

        const propertyName1 = screen.getByText(/Test Property Name2/i);
        expect(propertyName1).toBeInTheDocument();

        const value1 = screen.getByText(/testValue2/i);
        expect(value1).toBeInTheDocument();

        const propertyIcon = screen.getByText(/sap\-icon:\/\/accept/i);
        expect(propertyIcon).toBeInTheDocument();

        const deleteButton = screen.getAllByRole('button')[1];
        const iTagAttributes = deleteButton?.children?.item(0)?.children?.item(0)?.attributes;
        const iconName = iTagAttributes?.getNamedItem('data-icon-name')?.value;

        expect(deleteButton).toBeInTheDocument();
        expect(iconName).toBe('TrashCan');

        fireEvent.click(deleteButton);
        expect(
            screen.getByText(
                /Are you sure you want to delete the change for this property\? This action cannot be undone\./i
            )
        ).toBeInTheDocument();

        // first cancel
        const cancelButton = screen.getByRole('button', { name: /^Cancel$/i });
        cancelButton.click();

        // delete
        fireEvent.click(deleteButton);
        const confirmButton = screen.getByRole('button', { name: /^Delete$/i });
        confirmButton.click();

        fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'control Name2' } });

        const controlName2 = screen.getByRole('button', { name: /control name2/i });
        expect(controlName2).toBeInTheDocument();

        fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'yyyyy' } });

        expect(screen.queryByText(/Test Property Name1/i)).toStrictEqual(null);
        expect(screen.queryByText(/Test Property Name2/i)).toStrictEqual(null);
    });

    test('saved changes - Other change', () => {
        const model: ChangesSlice = {
            controls: {} as any,
            pending: [],
            saved: [
                {
                    fileName: 'testFileName2',
                    type: 'saved',
                    kind: 'unknown',
                    controlId: 'someSelectorId',
                    header: true
                } as any
            ],
            pendingChangeIds: []
        };
        const initialState: State = {
            deviceType: DeviceType.Desktop,
            scale: 1,
            outline: {} as any,
            filterQuery: filterInitOptions,
            selectedControl: undefined,
            changes: model,
            icons: [],
            dialogMessage: undefined,
            isAdpProject: false
        };
        render(<ChangesPanel />, { initialState });

        // check unknown changes
        const savedChangesTitle = screen.getByText(/saved changes/i);
        expect(savedChangesTitle).toBeInTheDocument();

        const title = screen.getByText(/Test File Name2 Change/i);
        expect(title).toBeInTheDocument();

        const fileLabel = screen.getByText(/file:/i);
        expect(fileLabel).toBeInTheDocument();

        const fileName = screen.getByText(/testfilename2/i);
        expect(fileName).toBeInTheDocument();

        const selectorIdLabel = screen.getByText(/selector id:/i);
        expect(selectorIdLabel).toBeInTheDocument();

        const selectorId = screen.getByText(/someSelectorId/i);
        expect(selectorId).toBeInTheDocument();

        const deleteButton = screen.getAllByRole('button')[0];
        const iTagAttributes = deleteButton?.children?.item(0)?.children?.item(0)?.attributes;
        const iconName = iTagAttributes?.getNamedItem('data-icon-name')?.value;
        expect(deleteButton).toBeInTheDocument();
        expect(iconName).toBe('TrashCan');

        fireEvent.click(deleteButton);
        expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument();

        // first cancel
        const cancelButton = screen.getByRole('button', { name: /^Cancel$/i });
        cancelButton.click();

        // delete
        fireEvent.click(deleteButton);
        const confirmButton = screen.getByRole('button', { name: /^Delete$/i });
        confirmButton.click();
    });

    test('Filter unsaved changes', () => {
        const model = getModel();
        const filterInitOptions: FilterOptions[] = [{ name: FilterName.changeSummaryFilterQuery, value: 'toolbar' }];
        const initialState: State = {
            deviceType: DeviceType.Desktop,
            scale: 1,
            outline: {} as any,
            filterQuery: filterInitOptions,
            selectedControl: undefined,
            changes: model,
            icons: [],
            dialogMessage: undefined,
            isAdpProject: false
        };
        render(<ChangesPanel />, { initialState });

        // check unsaved changes
        const savedChangesTitle = screen.getByText(/unsaved changes/i);
        expect(savedChangesTitle).toBeInTheDocument();

        const controlToolbar = screen.getByRole('button', { name: /overflow toolbar/i });
        expect(controlToolbar).toBeInTheDocument();
    });

    test('Filter saved changes', () => {
        const model = getModel(true);
        const filterInitOptions: FilterOptions[] = [
            { name: FilterName.changeSummaryFilterQuery, value: 'Simple Form' }
        ];
        const initialState: State = {
            deviceType: DeviceType.Desktop,
            scale: 1,
            outline: {} as any,
            filterQuery: filterInitOptions,
            selectedControl: undefined,
            changes: model,
            icons: [],
            dialogMessage: undefined,
            isAdpProject: false
        };
        render(<ChangesPanel />, { initialState });

        // check unsaved changes
        const savedChangesTitle = screen.getByText(/saved changes/i);
        expect(savedChangesTitle).toBeInTheDocument();

        const formFieldChange = screen.getByText(/id_1698648267087_373_movesimpleformfield/i);
        expect(formFieldChange).toBeInTheDocument();
    });

    test('External changes', () => {
        const model = getModel(true);
        const filterInitOptions: FilterOptions[] = [
            { name: FilterName.changeSummaryFilterQuery, value: 'Simple Form' }
        ];
        const externalChanges: string[] = ['example1.changes', 'example2.changes'];
        const initialState: State = {
            deviceType: DeviceType.Desktop,
            scale: 1,
            outline: {} as any,
            filterQuery: filterInitOptions,
            selectedControl: undefined,
            changes: model,
            icons: [],
            fileChanges: externalChanges,
            dialogMessage: undefined,
            isAdpProject: false
        };
        render(<ChangesPanel />, { initialState });

        // check unsaved changes
        const externalChangesTitle = screen.getByText(/Changes detected!/i);
        expect(externalChangesTitle).toBeInTheDocument();
        expect(externalChangesTitle.title.split('\n')).toEqual([
            'Changes in files:',
            'example1.changes',
            'example2.changes'
        ]);
    });
});
