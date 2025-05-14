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
                  kind: 'generic',
                  controlId: 'testId1',
                  controlName: 'controlName1',
                  type: 'pending',
                  isActive: true,
                  changeType: 'property',
                  fileName: 'testFile1',
                  properties: [
                      {
                          label: 'testPropertyName1',
                          value: 'testValue1',
                          displayValueWithIcon: true
                      }
                  ],
                  title: 'controlName1'
              },
              {
                  kind: 'generic',
                  controlId: 'testId1BoolFalse',
                  controlName: 'controlNameBoolFalse',
                  type: 'pending',
                  isActive: true,
                  changeType: 'property',
                  fileName: 'testFile2',
                  properties: [
                      {
                          label: 'testPropertyNameBoolFalse',
                          value: false,
                          displayValueWithIcon: true
                      }
                  ],
                  title: 'Test Title2'
              },
              {
                  kind: 'generic',
                  controlId: 'testId1Exp',
                  controlName: 'controlNameExp',
                  type: 'pending',
                  isActive: true,
                  changeType: 'property',
                  fileName: 'testFile3',
                  properties: [
                      {
                          label: 'testPropertyNameExp',
                          value: '{expression}',
                          displayValueWithIcon: true
                      }
                  ],
                  title: 'Test Title3'
              },
              {
                  kind: 'generic',
                  controlId: 'ListReport::TableToolbar',
                  type: 'pending',
                  isActive: true,
                  changeType: 'addXML',
                  fileName: 'id_1691659414768_128_addXML',
                  properties: [
                      {
                          label: 'aggregation',
                          value: 'content'
                      },
                      {
                          label: 'fragmentPath',
                          value: 'testFragmentPath'
                      }
                  ],
                  title: 'Add XML'
              },
              {
                  kind: 'unknown',
                  type: 'pending',
                  isActive: true,
                  changeType: 'addFields',
                  fileName: 'id_1691659414768_128_addFields'
              },
              {
                  kind: 'generic',
                  changeType: 'configuration',
                  controlId: ['testId1Exp'],
                  type: 'pending',
                  isActive: true,
                  fileName: 'testFile5',
                  subtitle: '/test/components/count',
                  properties: [
                      {
                          label: 'Frozen Column Count',
                          value: 12,
                          displayValueWithIcon: true
                      }
                  ],
                  title: 'Config Change'
              },
              {
                  kind: 'generic',
                  controlId: ['testId1Exp'],
                  type: 'pending',
                  isActive: true,
                  fileName: 'testFile6',
                  subtitle: '/test/components/settings',
                  changeType: 'configuration',
                  properties: [
                      {
                          label: 'Enable Export',
                          value: false,
                          displayValueWithIcon: true
                      }
                  ],
                  title: 'Config Change'
              },
              {
                  kind: 'generic',
                  controlId: ['testId1Exp'],
                  type: 'pending',
                  isActive: true,
                  fileName: 'testFile7',
                  subtitle: '/test/components/settings',
                  changeType: 'configuration',
                  properties: [
                      {
                          label: 'Header',
                          value: '{stringVal}',
                          displayValueWithIcon: true
                      }
                  ],
                  title: 'Config Change'
              },
              {
                  kind: 'generic',
                  controlId: ['testId1Exp'],
                  type: 'pending',
                  isActive: true,
                  fileName: 'testFile8',
                  subtitle: '/test/components',
                  changeType: 'configuration',
                  properties: [
                      {
                          label: 'Hierarchy Qualifier',
                          value: 'newQualifer',
                          displayValueWithIcon: true
                      }
                  ],
                  title: 'Config Change'
              },
              {
                  kind: 'generic',
                  controlId: ['testId1Exp'],
                  type: 'pending',
                  isActive: true,
                  fileName: 'testFile9',
                  changeType: 'configuration',
                  subtitle: '/test/components/hello',
                  title: 'Config Change',
                  properties: [
                      {
                          label: 'Personalization',
                          displayValueWithIcon: true
                      },
                      {
                          label: 'a',
                          value: 'test',
                          displayValueWithIcon: true
                      },
                      {
                          label: 'b',
                          value: 'value',
                          displayValueWithIcon: true
                      }
                  ]
              },
              {
                  kind: 'generic',
                  type: 'pending',
                  isActive: true,
                  fileName: 'genericChange',
                  changeType: 'demoChange',
                  title: 'Demo Change',
                  properties: [
                      {
                          label: 'testGenProp1',
                          value: 'GenValue1'
                      },
                      {
                          label: 'testGenProp2',
                          value: 'GenValue2'
                      }
                  ]
              }
          ]
        : [];
    const saved: SavedChange[] = generateSavedChanges
        ? [
              {
                  controlId: 'testId2',
                  title: 'controlName2',
                  type: 'saved',
                  fileName: 'testFileName',
                  kind: 'generic',
                  timestamp: new Date('2022-02-09T12:06:53.939Z').getTime(),
                  changeType: 'property',
                  properties: [
                      {
                          label: 'testPropertyName2',
                          value: 'testValue2',
                          displayValueWithIcon: true
                      }
                  ]
              },
              {
                  controlId: 'testId2',
                  title: 'controlName2',
                  type: 'saved',
                  fileName: 'testFileName2',
                  kind: 'generic',
                  timestamp: new Date('2022-02-09T12:06:53.939Z').getTime(),
                  changeType: 'property',
                  properties: [
                      {
                          label: 'icon',
                          value: 'sap-icon://accept'
                      }
                  ]
              },
              {
                  controlId: 'testId3',
                  controlName: 'controlNameBoolean',
                  type: 'saved',
                  fileName: 'testFileNameBool',
                  kind: 'generic',
                  timestamp: new Date('2022-02-09T12:06:53.939Z').getTime(),
                  changeType: 'property',
                  properties: [
                      {
                          label: 'testPropertyNameBool',
                          value: true
                      }
                  ],
                  title: 'controlNameBoolean'
              },
              {
                  controlId: 'testId4',
                  controlName: 'controlNameNumber',
                  type: 'saved',
                  fileName: 'testFileNameNum',
                  kind: 'generic',
                  timestamp: new Date('2022-02-09T12:06:53.939Z').getTime(),
                  changeType: 'property',
                  properties: [
                      {
                          label: 'testPropertyNameNum',
                          value: 2
                      }
                  ],
                  title: 'controlNameNumber'
              },
              {
                  type: 'saved',
                  fileName: 'app_descrName1',
                  controlId: [],
                  kind: 'generic',
                  timestamp: new Date('2022-02-09T12:06:53.939Z').getTime(),
                  subtitle: 'settings/test/demo',
                  changeType: 'configuration',
                  title: 'Config Change',
                  properties: [
                      {
                          label: 'frozenColumnCount',
                          value: 24
                      }
                  ]
              },
              {
                  type: 'saved',
                  fileName: 'app_descrName2',
                  kind: 'generic',
                  controlId: [],
                  timestamp: new Date('2022-01-09T12:06:53.939Z').getTime(),
                  changeType: 'configuration',
                  subtitle: 'settings/test',
                  title: 'Config Change',
                  properties: [
                      {
                          label: 'Header',
                          value: 'Table Filtered by Region'
                      }
                  ]
              },
              {
                  changeType: 'move',
                  type: 'saved',
                  fileName: 'id_1698648267087_373_moveSimpleFormField',
                  kind: 'generic',
                  timestamp: new Date('2023-10-11T12:06:53.939Z').getTime(),
                  properties: [
                      {
                          label: 'moveFrom',
                          value: 0
                      },
                      {
                          label: 'moveTo',
                          value: '2'
                      }
                  ],
                  title: 'Move control'
              },
              {
                  changeType: 'move',
                  type: 'saved',
                  fileName: 'id_1698648267088_374_moveSimpleFormField',
                  kind: 'generic',
                  timestamp: new Date('2023-10-12T12:06:53.939Z').getTime(),
                  properties: [
                      {
                          label: 'moveFrom',
                          value: 5
                      },
                      {
                          label: 'moveTo',
                          value: '1'
                      }
                  ],
                  title: 'Move control'
              },
              {
                  kind: 'generic',
                  type: 'saved',
                  fileName: 'genericSavedChange.change',
                  changeType: 'demoChange',
                  title: 'Demo Saved Change',
                  timestamp: new Date('2025-03-05T12:06:53.939Z').getTime(),
                  properties: [
                      {
                          label: 'testSavedP1',
                          value: 'GenSavedValue1'
                      },
                      {
                          label: 'testGenProp2',
                          value: 'GenSavedValue2'
                      }
                  ]
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

        const propertyName1 = screen.getByText(/test Property Name2/i);
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
                /Are you sure you want to delete this File: testFileName change\? This action cannot be undone\./i
            )
        ).toBeInTheDocument();

        // first cancel
        const cancelButton = screen.getByRole('button', { name: /^Cancel$/i });
        cancelButton.click();

        // delete
        fireEvent.click(deleteButton);
        const confirmButton = screen.getByRole('button', { name: /^Delete$/i });
        confirmButton.click();

        fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'controlName2' } });

        const controlName2 = screen.getByRole('button', { name: /control name2/i });
        expect(controlName2).toBeInTheDocument();

        fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'yyyyy' } });

        expect(screen.queryByText(/TestPropertyName1/i)).toStrictEqual(null);
        expect(screen.queryByText(/TestPropertyName2/i)).toStrictEqual(null);
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
                            kind: 'unknown',
                            timestamp: new Date('2022-02-09T12:06:53.939Z').getTime()
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
                changes: getChanges(false, 'generic'),
                filterQuery: filterInitOptions
            }
        });

        // check saved changes
        const savedChangesTitle = screen.getByText(/unsaved changes/i);
        expect(savedChangesTitle).toBeInTheDocument();

        const configChange = screen.getAllByText(/Config Change/i);
        expect(configChange.length).toBe(4);

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
                changes: getChanges(true, 'generic'),
                filterQuery: filterInitOptions
            }
        });

        // check saved changes
        const savedChangesTitle = screen.getByText(/saved changes/i);
        expect(savedChangesTitle).toBeInTheDocument();

        const configChange = screen.getAllByText(/Config Change/i);
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

    test('pending changes - generic change', () => {
        render(<ChangesPanel />, {
            initialState: {
                changes: getChanges(false, 'generic'),
                filterQuery: filterInitOptions
            }
        });

        // check saved changes
        const savedChangesTitle = screen.getByText(/unsaved changes/i);
        expect(savedChangesTitle).toBeInTheDocument();

        const configChange = screen.getAllByText(/Demo Change/i);
        expect(configChange.length).toBe(1);

        const propertyName1 = screen.getByText(/Test Gen Prop1/i);
        expect(propertyName1).toBeInTheDocument();

        const value1 = screen.getByText(/GenValue1/i);
        expect(value1).toBeInTheDocument();

        const propertyName2 = screen.getByText(/Test Gen Prop2/i);
        expect(propertyName2).toBeInTheDocument();

        const value2 = screen.getByText(/GenValue2/i);
        expect(value2).toBeInTheDocument();
    });

    test('saved changes - generic change', () => {
        render(<ChangesPanel />, {
            initialState: {
                changes: getChanges(true, 'generic'),
                filterQuery: filterInitOptions
            }
        });

        // check saved changes
        const savedChangesTitle = screen.getByText(/saved changes/i);
        expect(savedChangesTitle).toBeInTheDocument();

        const configChange = screen.getAllByText(/Demo Saved Change/i);
        expect(configChange.length).toBe(1);

        const propertyName1 = screen.getByText(/Test Saved P1/i);
        expect(propertyName1).toBeInTheDocument();

        const value1 = screen.getByText(/GenSavedValue1/i);
        expect(value1).toBeInTheDocument();

        const propertyName2 = screen.getByText(/Test Gen Prop2/i);
        expect(propertyName2).toBeInTheDocument();

        const value2 = screen.getByText(/GenSavedValue2/i);
        expect(value2).toBeInTheDocument();
    });

    test('saved changes - generic change filter summary panel', () => {
        const div = document.createElement('div');
        div.style.lineHeight = '23px';
        div.style.width = '300px';
        document.body.appendChild(div);
        render(<ChangesPanel />, {
            initialState: {
                changes: getChanges(true),
                filterQuery: [{ name: FilterName.changeSummaryFilterQuery, value: 'Demo Saved Change' }]
            },
            container: div
        });

        // check saved changes
        const savedChangesTitle = screen.getByText(/saved changes/i);
        expect(savedChangesTitle).toBeInTheDocument();

        const configChange = screen.getAllByText(/Demo Saved Change/i);
        expect(configChange.length).toBe(1);

        const propertyName1 = screen.getByText(/Test Saved P1/i);
        expect(propertyName1).toBeInTheDocument();

        const value1 = screen.getByText(/GenSavedValue1/i);
        expect(value1).toBeInTheDocument();

        const propertyName2 = screen.getByText(/Test Gen Prop2/i);
        expect(propertyName2).toBeInTheDocument();

        const value2 = screen.getByText(/GenSavedValue2/i);
        expect(value2).toBeInTheDocument();
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
                            changeType: 'rename',
                            controlId: 'testId1',
                            fileName: 'id_1691659414768_328_renameLabel',
                            type: 'saved',
                            kind: 'generic',
                            properties: [
                                {
                                    label: 'renamedValue',
                                    value: 'newValue'
                                }
                            ],
                            timestamp: new Date('2022-02-09T12:06:53.939Z').getTime(),
                            title: 'Rename Control'
                        }
                    ],
                    pendingChangeIds: []
                },
                filterQuery: filterInitOptions
            }
        });

        const savedChangesTitle = screen.getByText(/saved changes/i);
        expect(savedChangesTitle).toBeInTheDocument();

        const title = screen.getByText(/Rename Control/i);
        expect(title).toBeInTheDocument();

        const link = screen.getByRole('button', { name: /Rename Control/i });
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
                            kind: 'generic',
                            controlId: 'testId1',
                            controlName: 'controlName1',
                            type: 'pending',
                            isActive: false,
                            changeType: 'property',
                            fileName: 'testFile1',
                            properties: [
                                {
                                    label: 'testPropertyName1',
                                    value: 'testValue1'
                                }
                            ],
                            title: 'Test Title1'
                        },
                        {
                            kind: 'generic',
                            controlId: 'testId1BoolFalse',
                            controlName: 'controlNameBoolFalse',
                            type: 'pending',
                            isActive: true,
                            changeType: 'property',
                            fileName: 'testFile2',
                            properties: [
                                {
                                    label: 'testPropertyNameBoolFalse',
                                    value: false
                                }
                            ],
                            title: 'Test Title2'
                        },
                        {
                            kind: 'control',
                            controlId: 'ListReport::TableToolbar',
                            type: 'pending',
                            isActive: false,
                            changeType: 'something',
                            fileName: 'id_1691659414768_128_something'
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
        const genericChangeElement = screen.getAllByTestId('generic-change');

        expect(genericChangeElement[0]).toHaveStyle(opacity);
        expect(genericChangeElement[1]).toHaveStyle({ opacity: 1 });
        expect(screen.getByText(/ListReport::TableToolbar/i).parentElement).toHaveStyle(opacity);
        expect(screen.getByText(/id_1691659414768_128_something/i).parentElement).toHaveStyle(opacity);
        expect(screen.getByText(/id_1691659414768_128_addFields/i).parentElement).toHaveStyle(opacity);
    });
});
