import type { PendingChange, SavedChange } from '@sap-ux-private/control-property-editor-common';
import type { FilterOptions, ChangesSlice } from '../../../../src/slice';
import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import * as cpeCommon from '@sap-ux-private/control-property-editor-common';
import * as reactRedux from 'react-redux';
import { render } from '../../utils';
import { FilterName } from '../../../../src/slice';
import { ChangesPanel } from '../../../../src/panels/changes';

jest.mock('@sap-ux-private/control-property-editor-common', () => {
    return {
        __esModule: true,
        ...jest.requireActual('@sap-ux-private/control-property-editor-common')
    };
});

const getChanges = (generateSavedChanges = false, filterByKind = ''): ChangesSlice => {
    const pending: PendingChange[] = !generateSavedChanges
        ? [
              {
                  kind: 'property',
                  controlId: 'testId1',
                  controlName: 'controlName1',
                  propertyName: 'testPropertyName1',
                  type: 'pending',
                  value: 'testValue1',
                  isActive: true,
                  changeType: 'propertyChange',
                  fileName: 'testFile1',
                  propertyType: cpeCommon.PropertyType.ControlProperty
              },
              {
                  kind: 'property',
                  controlId: 'testId1BoolFalse',
                  controlName: 'controlNameBoolFalse',
                  propertyName: 'testPropertyNameBoolFalse',
                  type: 'pending',
                  value: false,
                  isActive: true,
                  changeType: 'propertyChange',
                  fileName: 'testFile2',
                  propertyType: cpeCommon.PropertyType.ControlProperty
              },
              {
                  kind: 'property',
                  controlId: 'testId1Exp',
                  controlName: 'controlNameExp',
                  propertyName: 'testPropertyNameExp',
                  type: 'pending',
                  value: '{expression}',
                  isActive: true,
                  changeType: 'propertyBindingChange',
                  fileName: 'testFile3',
                  propertyType: cpeCommon.PropertyType.ControlProperty
              },
              {
                  kind: 'control',
                  controlId: 'ListReport::TableToolbar',
                  type: 'pending',
                  isActive: true,
                  changeType: 'addXML',
                  fileName: 'id_1691659414768_128_addXML'
              },
              {
                  kind: 'unknown',
                  type: 'pending',
                  isActive: true,
                  changeType: 'addFields',
                  fileName: 'id_1691659414768_128_addFields'
              },
              {
                  kind: 'configuration',
                  controlIds: ['testId1Exp'],
                  propertyName: 'Frozen Column Count',
                  type: 'pending',
                  value: 12,
                  isActive: true,
                  fileName: 'testFile5',
                  propertyPath: '/test/components/settings'
              },
              {
                  kind: 'configuration',
                  controlIds: ['testId1Exp'],
                  propertyName: 'Enable Export',
                  type: 'pending',
                  value: false,
                  isActive: true,
                  fileName: 'testFile6',
                  propertyPath: '/test/components/settings'
              },
              {
                  kind: 'configuration',
                  controlIds: ['testId1Exp'],
                  propertyName: 'Header',
                  type: 'pending',
                  value: '{stringVal}',
                  isActive: true,
                  fileName: 'testFile7',
                  propertyPath: '/test/components/settings'
              },
              {
                  kind: 'configuration',
                  controlIds: ['testId1Exp'],
                  propertyName: 'Hierarchy Qualifier',
                  type: 'pending',
                  value: 'newQualifer',
                  isActive: true,
                  fileName: 'testFile8',
                  propertyPath: '/test/components'
              },
              {
                  kind: 'configuration',
                  controlIds: ['testId1Exp'],
                  propertyName: 'Personalization',
                  type: 'pending',
                  value: {
                      a: 'test',
                      b: 'value'
                  },
                  isActive: true,
                  fileName: 'testFile9',
                  propertyPath: '/test/components'
              }
          ]
        : [];
    const saved: SavedChange[] = generateSavedChanges
        ? [
              {
                  controlId: 'testId2',
                  controlName: 'controlName2',
                  propertyName: 'testPropertyName2',
                  type: 'saved',
                  value: 'testValue2',
                  fileName: 'testFileName',
                  kind: 'property',
                  timestamp: new Date('2022-02-09T12:06:53.939Z').getTime(),
                  changeType: 'propertyChange',
                  propertyType: cpeCommon.PropertyType.ControlProperty
              },
              {
                  controlId: 'testId2',
                  controlName: 'controlName2',
                  propertyName: 'Icon',
                  type: 'saved',
                  value: 'sap-icon://accept',
                  fileName: 'testFileName2',
                  kind: 'property',
                  timestamp: new Date('2022-02-09T12:06:53.939Z').getTime(),
                  changeType: 'propertyChange',
                  propertyType: cpeCommon.PropertyType.ControlProperty
              },
              {
                  controlId: 'testId3',
                  controlName: 'controlNameBoolean',
                  propertyName: 'testPropertyNameBool',
                  type: 'saved',
                  value: true,
                  fileName: 'testFileNameBool',
                  kind: 'property',
                  timestamp: new Date('2022-02-09T12:06:53.939Z').getTime(),
                  changeType: 'propertyChange',
                  propertyType: cpeCommon.PropertyType.ControlProperty
              },
              {
                  controlId: 'testId4',
                  controlName: 'controlNameNumber',
                  propertyName: 'testPropertyNameNum',
                  type: 'saved',
                  value: 2,
                  fileName: 'testFileNameNum',
                  kind: 'property',
                  timestamp: new Date('2022-02-09T12:06:53.939Z').getTime(),
                  changeType: 'propertyChange',
                  propertyType: cpeCommon.PropertyType.ControlProperty
              },
              {
                  propertyName: 'Frozen Column Count',
                  type: 'saved',
                  value: 24,
                  fileName: 'app_descrName1',
                  controlIds: [],
                  kind: 'configuration',
                  timestamp: new Date('2022-02-09T12:06:53.939Z').getTime(),
                  propertyPath: 'settings/test/demo'
              },
              {
                  propertyName: 'Header',
                  type: 'saved',
                  value: 'Table Filtered by Region',
                  fileName: 'app_descrName2',
                  kind: 'configuration',
                  controlIds: [],
                  timestamp: new Date('2022-01-09T12:06:53.939Z').getTime(),
                  propertyPath: 'settings/test'
              },
              {
                  changeType: 'move',
                  type: 'saved',
                  fileName: 'id_1698648267087_373_moveSimpleFormField',
                  kind: 'unknown',
                  timestamp: new Date('2023-10-11T12:06:53.939Z').getTime()
              },
              {
                  changeType: 'move',
                  type: 'saved',
                  fileName: 'id_1698648267088_374_moveSimpleFormField',
                  kind: 'unknown',
                  timestamp: new Date('2023-10-12T12:06:53.939Z').getTime()
              }
          ]
        : [];
    return {
        pending: pending.filter((item) => {
            if (filterByKind) {
                return item.type === 'pending' && item.kind === filterByKind;
            }
            return item.type === 'pending';
        }),
        saved: saved.filter((item) => {
            if (filterByKind) {
                return item.type === 'saved' && item.kind === filterByKind;
            }
            return item.type === 'saved';
        }),
        controls: {},
        pendingChangeIds: []
    };
};
const filterInitOptions: FilterOptions[] = [{ name: FilterName.changeSummaryFilterQuery, value: '' }];
describe('ChangePanel', () => {
    test('ChangePanel - check if search filter rendered', () => {
        render(<ChangesPanel />, {
            initialState: {
                filterQuery: filterInitOptions
            }
        });

        // check if search box exists
        const searchBarByRole = screen.getByRole('searchbox');
        expect(searchBarByRole).toBeInTheDocument();

        const searchBarByPlaceholder = screen.getByPlaceholderText(/Filter/, { exact: true });
        expect(searchBarByPlaceholder).toBeInTheDocument();
    });

    test('ChangePanel empty save and pending', () => {
        render(<ChangesPanel />, {
            initialState: {
                filterQuery: filterInitOptions
            }
        });

        // check no controls found
        const noChangesText = screen.getByText('No historic changes');
        expect(noChangesText).toHaveTextContent('No historic changes');
        const modifyApplicationText = screen.getByText('This application was not modified yet');
        expect(modifyApplicationText).toHaveTextContent('This application was not modified yet');
        const noChangesIcon = screen.getByTestId('Control-Property-Editor-No-Changes-Icon');
        expect(noChangesIcon).toBeInTheDocument();
    });

    test('unsaved changes - all changes', () => {
        render(<ChangesPanel />, {
            initialState: {
                changes: getChanges(),
                filterQuery: filterInitOptions
            }
        });

        // check unsaved changes
        const unsavedChangesTitle = screen.getByText(/unsaved changes/i);
        expect(unsavedChangesTitle).toBeInTheDocument();

        const controlName = screen.getByRole('button', { name: /Control Name1/i });
        expect(controlName).toBeInTheDocument();

        const propertyName = screen.getByText(/Test Property Name1/i);
        expect(propertyName).toBeInTheDocument();

        const value = screen.getByText(/testValue1/i);
        expect(value).toBeInTheDocument();

        const changeAddXML = screen.getByText(/add xml/i);
        expect(changeAddXML).toBeInTheDocument();

        const changeAddFields = screen.getByText(/add fields/i);
        expect(changeAddFields).toBeInTheDocument();
    });

    test('saved changes - property change', () => {
        render(<ChangesPanel />, {
            initialState: {
                changes: getChanges(true),
                filterQuery: filterInitOptions
            }
        });

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

    test('saved changes - Unknown change', () => {
        render(<ChangesPanel />, {
            initialState: {
                changes: {
                    controls: {},
                    pending: [],
                    saved: [
                        {
                            changeType: 'codeExt',
                            fileName: 'id_1691659414768_328_codeExt',
                            type: 'saved',
                            kind: 'unknown'
                        }
                    ],
                    pendingChangeIds: []
                },
                filterQuery: filterInitOptions
            }
        });

        // check unknown changes
        const savedChangesTitle = screen.getByText(/saved changes/i);
        expect(savedChangesTitle).toBeInTheDocument();

        const title = screen.getByText(/code ext/i);
        expect(title).toBeInTheDocument();

        const fileLabel = screen.getByText(/file:/i);
        expect(fileLabel).toBeInTheDocument();

        const fileName = screen.getByText(/id_1691659414768_328_codeExt/i);
        expect(fileName).toBeInTheDocument();

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

    test('saved changes - control change', () => {
        render(<ChangesPanel />, {
            initialState: {
                changes: {
                    controls: {},
                    pending: [],
                    saved: [
                        {
                            changeType: 'renameLabel',
                            controlId: 'testId1',
                            fileName: 'id_1691659414768_328_renameLabel',
                            timestamp: new Date('2022-02-09T12:06:53.939Z').getTime(),
                            type: 'saved',
                            kind: 'control'
                        }
                    ],
                    pendingChangeIds: []
                },
                filterQuery: filterInitOptions
            }
        });

        const savedChangesTitle = screen.getByText(/saved changes/i);
        expect(savedChangesTitle).toBeInTheDocument();

        const title = screen.getByText(/Rename Label/i);
        expect(title).toBeInTheDocument();

        const fileLabel = screen.getByText(/file:/i);
        expect(fileLabel).toBeInTheDocument();

        const fileName = screen.getByText(/id_1691659414768_328_renameLabel/i);
        expect(fileName).toBeInTheDocument();

        const deleteButton = screen.getAllByRole('button')[1];
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

    test('pending changes - configuration change', () => {
        render(<ChangesPanel />, {
            initialState: {
                changes: getChanges(false, 'configuration'),
                filterQuery: filterInitOptions
            }
        });

        // check saved changes
        const savedChangesTitle = screen.getByText(/unsaved changes/i);
        expect(savedChangesTitle).toBeInTheDocument();

        const configChange = screen.getAllByText(/configuration/i);
        expect(configChange.length).toBe(2);

        const propertyName1 = screen.getByText(/Frozen Column Count/i);
        expect(propertyName1).toBeInTheDocument();

        const value1 = screen.getByText(/12/i);
        expect(value1).toBeInTheDocument();

        const propertyName2 = screen.getByText(/Enable Export/i);
        expect(propertyName2).toBeInTheDocument();

        // const value2 = screen.getByText(/false/i);
        // expect(value2).toBeInTheDocument();

        const propertyName3 = screen.getByText(/Header/i);
        expect(propertyName3).toBeInTheDocument();

        const value3 = screen.getByText(/{stringval}/i);
        expect(value3).toBeInTheDocument();

        const propertyName4 = screen.getByText(/Hierarchy Qualifier/i);
        expect(propertyName4).toBeInTheDocument();

        const value4 = screen.getByText(/newqualifer/i);
        expect(value4).toBeInTheDocument();
    });

    test('saved changes - configuration change', () => {
        render(<ChangesPanel />, {
            initialState: {
                changes: getChanges(true, 'configuration'),
                filterQuery: filterInitOptions
            }
        });

        // check saved changes
        const savedChangesTitle = screen.getByText(/saved changes/i);
        expect(savedChangesTitle).toBeInTheDocument();

        const configChange = screen.getAllByText(/configuration/i);
        expect(configChange.length).toBe(2);

        const propertyName1 = screen.getByText(/Frozen Column Count/i);
        expect(propertyName1).toBeInTheDocument();

        const value1 = screen.getByText(/24/i);
        expect(value1).toBeInTheDocument();

        const propertyName3 = screen.getByText(/Header/i);
        expect(propertyName3).toBeInTheDocument();

        const value3 = screen.getByText(/Table Filtered by Region/i);
        expect(value3).toBeInTheDocument();
    });

    test('saved control change - link', () => {
        jest.spyOn(cpeCommon, 'selectControl').mockImplementationOnce(jest.fn());
        jest.spyOn(reactRedux, 'useDispatch').mockReturnValue(jest.fn());

        render(<ChangesPanel />, {
            initialState: {
                changes: {
                    controls: {},
                    pending: [],
                    saved: [
                        {
                            changeType: 'renameLabel',
                            controlId: 'testId1',
                            fileName: 'id_1691659414768_328_renameLabel',
                            type: 'saved',
                            kind: 'control'
                        }
                    ],
                    pendingChangeIds: []
                },
                filterQuery: filterInitOptions
            }
        });

        const savedChangesTitle = screen.getByText(/saved changes/i);
        expect(savedChangesTitle).toBeInTheDocument();

        const title = screen.getByText(/Rename Label/i);
        expect(title).toBeInTheDocument();

        const fileLabel = screen.getByText(/file:/i);
        expect(fileLabel).toBeInTheDocument();

        const fileName = screen.getByText(/id_1691659414768_328_renameLabel/i);
        expect(fileName).toBeInTheDocument();

        const link = screen.getByRole('button', { name: /Rename Label Change/i });
        expect(link).toBeInTheDocument();

        link.click();
        expect(reactRedux.useDispatch).toBeCalled();
        expect(cpeCommon.selectControl).toBeCalledWith('testId1');
    });

    test('Filter unsaved changes', () => {
        const filterInitOptions: FilterOptions[] = [{ name: FilterName.changeSummaryFilterQuery, value: 'fields' }];
        render(<ChangesPanel />, {
            initialState: {
                changes: getChanges(),
                filterQuery: filterInitOptions
            }
        });

        // check unsaved changes
        const savedChangesTitle = screen.getByText(/unsaved changes/i);
        expect(savedChangesTitle).toBeInTheDocument();

        const changeAddXML = screen.getByText(/add fields/i);
        expect(changeAddXML).toBeInTheDocument();
    });

    test('Filter saved changes', () => {
        const filterInitOptions: FilterOptions[] = [
            { name: FilterName.changeSummaryFilterQuery, value: 'Simple Form' }
        ];
        render(<ChangesPanel />, {
            initialState: {
                changes: getChanges(true),
                filterQuery: filterInitOptions
            }
        });

        // check unsaved changes
        const savedChangesTitle = screen.getByText(/saved changes/i);
        expect(savedChangesTitle).toBeInTheDocument();

        const formFieldChange = screen.getByText(/id_1698648267087_373_movesimpleformfield/i);
        expect(formFieldChange).toBeInTheDocument();
    });

    test('External changes', () => {
        const filterInitOptions: FilterOptions[] = [
            { name: FilterName.changeSummaryFilterQuery, value: 'Simple Form' }
        ];
        const externalChanges: string[] = ['example1.changes', 'example2.changes'];

        render(<ChangesPanel />, {
            initialState: {
                changes: getChanges(true),
                filterQuery: filterInitOptions,
                fileChanges: externalChanges
            }
        });

        // check unsaved changes
        const externalChangesTitle = screen.getByText(/Changes detected!/i);
        expect(externalChangesTitle).toBeInTheDocument();
        expect(externalChangesTitle.title.split('\n')).toEqual([
            'Changes in files:',
            'example1.changes',
            'example2.changes'
        ]);
    });

    test('inactive changes', () => {
        render(<ChangesPanel />, {
            initialState: {
                changes: {
                    controls: {},
                    pending: [
                        {
                            kind: 'property',
                            controlId: 'testId1',
                            controlName: 'controlName1',
                            propertyName: 'testPropertyName1',
                            type: 'pending',
                            value: 'testValue1',
                            isActive: false,
                            changeType: 'propertyChange',
                            fileName: 'testFile1',
                            propertyType: cpeCommon.PropertyType.ControlProperty
                        },
                        {
                            kind: 'property',
                            controlId: 'testId1BoolFalse',
                            controlName: 'controlNameBoolFalse',
                            propertyName: 'testPropertyNameBoolFalse',
                            type: 'pending',
                            value: false,
                            isActive: true,
                            changeType: 'propertyChange',
                            fileName: 'testFile2',
                            propertyType: cpeCommon.PropertyType.ControlProperty
                        },
                        {
                            kind: 'control',
                            controlId: 'ListReport::TableToolbar',
                            type: 'pending',
                            isActive: false,
                            changeType: 'addXML',
                            fileName: 'id_1691659414768_128_addXML'
                        },
                        {
                            kind: 'unknown',
                            type: 'pending',
                            isActive: false,
                            changeType: 'addFields',
                            fileName: 'id_1691659414768_128_addFields'
                        }
                    ],
                    saved: [],
                    pendingChangeIds: []
                },
                filterQuery: filterInitOptions
            }
        });

        // check unsaved changes

        const opacity = { opacity: 0.4 };

        expect(
            screen.getByText(/Test Property Name1/i).parentElement?.parentElement?.parentElement?.parentElement
        ).toHaveStyle(opacity);
        expect(
            screen.getByText(/Test Property Name Bool False/i).parentElement?.parentElement?.parentElement
                ?.parentElement
        ).toHaveStyle({ opacity: 1 });
        expect(screen.getByText(/ListReport::TableToolbar/i).parentElement).toHaveStyle(opacity);
        expect(screen.getByText(/id_1691659414768_128_addXML/i).parentElement).toHaveStyle(opacity);
        expect(screen.getByText(/id_1691659414768_128_addFields/i).parentElement).toHaveStyle(opacity);
    });
});
