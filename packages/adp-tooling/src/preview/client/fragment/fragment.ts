/* eslint-disable @typescript-eslint/no-use-before-define */
/** sap.m */
import Bar from 'sap/m/Bar';
import List from 'sap/m/List';
import Link from 'sap/m/Link';
import Text from 'sap/m/Text';
import Label from 'sap/m/Label';
import Input from 'sap/m/Input';
import Dialog from 'sap/m/Dialog';
import Button from 'sap/m/Button';
import ComboBox from 'sap/m/ComboBox';
import SearchField from 'sap/m/SearchField';
import MessageToast from 'sap/m/MessageToast';
import ToolbarSpacer from 'sap/m/ToolbarSpacer';
import { ListMode, ButtonType } from 'sap/m/library';

/** sap.ui.core */
import Item from 'sap/ui/core/Item';
import type UI5Element from 'sap/ui/core/Element';
import CustomData from 'sap/ui/core/CustomData';
import { ValueState, VerticalAlign } from 'sap/ui/core/library';

/** sap.ui.layout */
import VerticalLayout from 'sap/ui/layout/VerticalLayout';
import HorizontalLayout from 'sap/ui/layout/HorizontalLayout';

/** sap.ui.model */
import Filter from 'sap/ui/model/Filter';
import JSONModel from 'sap/ui/model/json/JSONModel';
import FilterOperator from 'sap/ui/model/FilterOperator';

import type { BuiltRuntimeControl } from '../control-utils';
import ControlUtils from '../control-utils';
import ApiRequestHandler from '../api-handler';
import type { FragmentsResponse } from '../api-handler';

import StandardListItem from 'sap/m/StandardListItem';
import type ManagedObjectMetadata from 'sap/ui/base/ManagedObjectMetadata';
import type Event from 'sap/ui/base/Event';
import type EventProvider from 'sap/ui/base/EventProvider';
import type Binding from 'sap/ui/model/Binding';

import CommandFactory from 'sap/ui/rta/command/CommandFactory';
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import type ElementOverlay from 'sap/ui/dt/ElementOverlay';
import type ContextMenu from 'sap/ui/dt/plugin/ContextMenu';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import type OverflowToolbar from 'sap/m/OverflowToolbar';
import type { Layer } from 'sap/ui/fl';
import type ManagedObject from 'sap/ui/base/ManagedObject';

interface CreateFragmentProps {
    fragmentName: string;
    index: string | number;
    targetAggregation: string;
}

export interface ManifestAppdescr {
    fileName: string;
    layer: Layer;
    fileType: string;
    reference: string;
    id: string;
    namespace: string;
    version: string;
    content: object[];
}

interface DialogueData {
    runtimeControl: ManagedObject;
    control: BuiltRuntimeControl;
}

type ExtendedEventProvider = EventProvider & {
    setEnabled: (v: boolean) => {};
    getValue: () => string;
    getSelectedItem: () => {
        getTitle: () => string;
        getText: () => string;
        getCustomData: () => {
            [key: string]: Function;
        }[];
    };
    getSelectedKey: () => string;
    setValueState: (state: ValueState) => void;
    setValueStateText: (text: string) => void;
    setVisible: (bool: boolean) => void;
};

/**
 *
 */
export default class FragmentDialog {
    /**
     * @param rta Runtime Authoring
     */
    constructor(private rta: RuntimeAuthoring) {}

    /**
     * @description Initilizes "Add XML Fragment" functionality and adds a new item to the context menu
     * @param contextMenu Context Menu from RTA
     */
    public init(contextMenu: ContextMenu) {
        const that = this;

        contextMenu.addMenuItem({
            id: 'ADD_FRAGMENT',
            text: 'Add: Fragment',
            handler: async (overlays: UI5Element[]) => await this.handleAddNewFragment(overlays, that),
            icon: 'sap-icon://attachment-html'
        });
    }

    /**
     * Builds and returns data that is used in the dialog
     *
     * @param overlays Overlays
     * @param jsonModel JSON Model for the dialog
     * @returns {Promise<DialogueData>} Dialog data
     */
    private async getDialogData(overlays: UI5Element[], jsonModel: JSONModel): Promise<DialogueData> {
        const selectorId = overlays[0].getId();

        let runtimeControl: ManagedObject;
        let control: BuiltRuntimeControl;
        let controlMetadata: ManagedObjectMetadata;

        const overlayControl = sap.ui.getCore().byId(selectorId) as unknown as ElementOverlay;
        if (overlayControl) {
            runtimeControl = ControlUtils.getRuntimeControl(overlayControl);
            controlMetadata = runtimeControl.getMetadata();
            control = await ControlUtils.buildControlData(runtimeControl, overlayControl);
        } else {
            throw new Error('Cannot get overlay control');
        }

        const allAggregations = Object.keys(controlMetadata.getAllAggregations());
        const hiddenAggregations = ['customData', 'layoutData', 'dependents'];
        const targetAggregation = allAggregations.filter((item) => {
            if (hiddenAggregations.indexOf(item) === -1) {
                return item;
            }
        });
        const defaultAggregation = runtimeControl.getMetadata().getDefaultAggregationName();
        const selectedControlName = control.name;

        let selectedControlChildren: string[] | number[] = Object.keys(
            ControlUtils.getControlAggregationByName(runtimeControl, defaultAggregation)
        );

        let allowIndexForDefaultAggregation = true;
        const defaultAggregationDesignTimeMetadata = overlayControl.getDesignTimeMetadata().getData().aggregations[
            defaultAggregation
        ];

        if (defaultAggregationDesignTimeMetadata !== undefined) {
            allowIndexForDefaultAggregation =
                defaultAggregationDesignTimeMetadata.specialIndexHandling === true ? false : true;
        }

        selectedControlChildren = selectedControlChildren.map((key) => {
            return parseInt(key);
        });

        jsonModel.setProperty('/selectedControlName', selectedControlName);
        jsonModel.setProperty('/selectedAggregation', {});
        jsonModel.setProperty('/indexHandlingFlag', allowIndexForDefaultAggregation);

        const indexArray = this.fillIndexArray(selectedControlChildren);

        const controlAggregation: { key: string | number; value: string | number }[] = targetAggregation.map(
            (elem, index) => {
                return { key: index, value: elem };
            }
        );

        if (defaultAggregation !== null) {
            controlAggregation.forEach((obj) => {
                if (obj.value === defaultAggregation) {
                    obj.key = 'default';
                    jsonModel.setProperty('/selectedAggregation/key', obj.key);
                    jsonModel.setProperty('/selectedAggregation/value', obj.value);
                }
            });
        } else {
            jsonModel.setProperty('/selectedAggregation/key', controlAggregation[0].key);
            jsonModel.setProperty('/selectedAggregation/value', controlAggregation[0].value);
        }

        try {
            const { fragments, filteredFragments } = await ApiRequestHandler.getFragments<FragmentsResponse>();

            jsonModel.setProperty('/filteredFragmentList', {
                fragmentList: filteredFragments, // filtered fragments that have no corresponding change file
                newFragmentName: '',
                selectorId: selectorId,
                unFilteredFragmentList: fragments // All fragments under /fragments folder
            });
            jsonModel.setProperty('/fragmentCount', fragments.length);
        } catch (e) {
            throw new Error(e.message);
        }

        jsonModel.setProperty('/selectedIndex', indexArray.length - 1);
        jsonModel.setProperty('/defaultAggregation', defaultAggregation);
        jsonModel.setProperty('/targetAggregation', controlAggregation);
        jsonModel.setProperty('/index', indexArray);
        jsonModel.setProperty('/selectorId', selectorId ? selectorId : 'oCurrentSelection.id');

        return {
            runtimeControl,
            control
        };
    }

    /**
     * Fills indexArray from selected control children
     *
     * @param selectedControlChildren Array of numbers
     * @returns Array of key value pairs
     */
    private fillIndexArray(selectedControlChildren: number[]) {
        let indexArray: { key: number; value: number }[] = [];
        if (selectedControlChildren.length === 0) {
            indexArray.push({ key: 0, value: 0 });
        } else {
            indexArray = selectedControlChildren.map((elem, index) => {
                return { key: index + 1, value: elem + 1 };
            });
            indexArray.unshift({ key: 0, value: 0 });
            indexArray.push({
                key: selectedControlChildren.length + 1,
                value: selectedControlChildren.length + 1
            });
        }
        return indexArray;
    }

    /**
     * @description Builds an Add XML Fragment dialog, fills it with data and opens it
     * @param overlays Overlays when clicking on control
     * @param that Points to FragmentDialog class for accessing its methods
     */
    public async handleAddNewFragment(overlays: UI5Element[], that: FragmentDialog) {
        const jsonModel = new JSONModel();

        const { runtimeControl, control } = await that.getDialogData(overlays, jsonModel);

        let buttonAddFragment: boolean;

        const filteredFragmentList = new List('filteredFragmentList', {
            noDataText: 'Create a fragment. There is no fragment available for the target aggregation.',
            mode: ListMode.SingleSelectMaster,
            selectionChange: (event: Event) => {
                const source = event.getSource() as ExtendedEventProvider;
                const selectedItem = source.getSelectedItem();
                jsonModel.setProperty('/SelectedFragment', {
                    selectedFragmentName: selectedItem.getTitle(),
                    selectedFragmentPath: selectedItem.getCustomData()[0].getKey() as string
                });
                const buttonEnabled = !!selectedItem;
                buttonAddFragment = true;
                fragmentDialog.getBeginButton().setEnabled(buttonEnabled);
            }
        })
            .bindItems(
                '/filteredFragmentList/fragmentList',
                // @ts-ignore
                new StandardListItem({
                    customData: new CustomData({
                        key: '{fragmentDocumentPath}'
                    }),
                    title: '{fragmentName}'
                })
            )
            .addStyleClass('uiadaptationFragmentList');

        const fragmentNameInput = new Input({
            width: '24rem',
            description: '.fragment.xml',
            value: '{/newFragmentName}',
            liveChange: (event: Event) => {
                const source = event.getSource() as ExtendedEventProvider;
                const fragmentName: string = source.getValue().trim();
                const fragmentList = jsonModel.getProperty('/filteredFragmentList/unFilteredFragmentList');

                const iExistingFileIndex = fragmentList.findIndex((f: { fragmentName: string }) => {
                    return f.fragmentName === `${fragmentName}.fragment.xml`;
                });

                switch (true) {
                    case iExistingFileIndex >= 0:
                        source.setValueState(ValueState.Error);
                        source.setValueStateText(
                            'Enter a different name. The fragment name that you entered already exists in your project.'
                        );
                        fragmentDialog.getBeginButton().setEnabled(false);
                        jsonModel.setProperty('/fragmentNameToCreate', null);
                        break;
                    case fragmentName.length <= 0:
                        fragmentDialog.getBeginButton().setEnabled(false);
                        jsonModel.setProperty('/fragmentNameToCreate', null);
                        break;
                    case !/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(fragmentName):
                        source.setValueState(ValueState.Error);
                        source.setValueStateText('A Fragment Name cannot contain white spaces or special characters.');
                        fragmentDialog.getBeginButton().setEnabled(false);
                        jsonModel.setProperty('/fragmentNameToCreate', null);
                        break;
                    case fragmentName.length > 0:
                        fragmentDialog.getBeginButton().setEnabled(true);
                        source.setValueState(ValueState.None);
                        jsonModel.setProperty('/fragmentNameToCreate', fragmentName);
                        break;
                    default:
                        break;
                }
            }
        });
        const controlAggregationComboBox = that.getControlAggregationComboBox(jsonModel, runtimeControl, that);

        const indexComboBox = new ComboBox({
            change: (event: Event) => {
                const source = event.getSource() as ExtendedEventProvider;
                const selectedIndex = source.getSelectedItem().getText();
                jsonModel.setProperty('/selectedIndex', parseInt(selectedIndex));
            },
            selectedKey: '{/selectedIndex}',
            enabled: true
        }).bindAggregation(
            'items',
            '/index',
            // @ts-ignore
            new Item({
                key: '{key}',
                text: '{value}',
                enabled: true
            })
        );

        const selectFragmentLayout = new VerticalLayout({
            width: '100%',
            content: [
                new HorizontalLayout({
                    content: [
                        new Label({
                            text: 'Control type'
                        }),
                        new ToolbarSpacer({
                            width: '3.4rem'
                        }),
                        new Label({
                            text: control.name
                        })
                    ]
                }).addStyleClass('sapUiTinyMarginTopBottom'),
                new HorizontalLayout({
                    content: [
                        new Label({
                            text: 'Target Aggregation'
                        }),
                        new ToolbarSpacer({
                            width: '1rem'
                        }),
                        controlAggregationComboBox
                    ]
                }).addStyleClass('sapUiTinyMarginTopBottom'),
                new HorizontalLayout({
                    content: [
                        new Label({
                            text: 'Index'
                        }),
                        new ToolbarSpacer({
                            width: '6rem'
                        }),
                        indexComboBox
                    ]
                }).addStyleClass('sapUiTinyMarginTopBottom'),

                that.getSearchField(jsonModel, filteredFragmentList, that),

                new HorizontalLayout({
                    content: [
                        new Label({
                            text: {
                                path: '/fragmentCount',
                                formatter: (value: string) => {
                                    if (value !== undefined) {
                                        return value + ' ' + 'Fragments';
                                    } else {
                                        return '0' + ' ' + 'Fragments';
                                    }
                                }
                            }
                        }),
                        new ToolbarSpacer({
                            width: '24rem'
                        }),
                        new Link({
                            text: 'Create new',
                            press: (_: Event) => {
                                buttonAddFragment = false;
                                fragmentNameInput.setValue('');
                                fragmentDialog.getBeginButton().setEnabled(false);
                                fragmentDialog.getCustomHeader().getContentLeft()[0].setVisible(true);
                                fragmentDialog.getBeginButton().setText('Create');
                                fragmentDialog.getContent()[0].setVisible(false);
                                fragmentDialog.getContent()[1].setVisible(true);
                            },
                            enabled: jsonModel.getProperty('/selectedAggregation/value') ? true : false
                        }).addStyleClass('uiadaptationFragmentDialogLink')
                    ]
                }).addStyleClass('sapUiTinyMarginBottom'),
                filteredFragmentList
            ]
        });

        const createFragmentLayout = new VerticalLayout({
            visible: false,
            width: '100%',
            content: [
                new HorizontalLayout({
                    content: [
                        new Label({
                            text: 'Selected Aggregation',
                            vAlign: VerticalAlign.Bottom
                        }),
                        new ToolbarSpacer({
                            width: '1.5rem'
                        }),
                        new Label({
                            text: {
                                path: '/selectedAggregation/value',
                                formatter: (value: string) => {
                                    if (value) {
                                        return value.charAt(0).toUpperCase() + value.slice(1);
                                    }
                                    return '';
                                }
                            }
                        })
                    ]
                }).addStyleClass('sapUiTinyMarginTopBottom'),
                new HorizontalLayout({
                    content: [
                        new Label({
                            text: 'Selected Index',
                            vAlign: VerticalAlign.Middle
                        }),
                        new ToolbarSpacer({
                            width: '4rem'
                        }),
                        new Label({
                            text: '{/selectedIndex}'
                        })
                    ]
                }).addStyleClass('sapUiTinyMarginTopBottom'),
                new HorizontalLayout({
                    content: [
                        new Label({
                            text: 'Fragment Name',
                            vAlign: VerticalAlign.Middle
                        }),
                        new ToolbarSpacer({
                            width: '3.5rem'
                        }),
                        fragmentNameInput
                    ]
                }).addStyleClass('sapUiTinyMarginTopBottom')
            ]
        });
        const fragmentDialog = new Dialog({
            content: [selectFragmentLayout, createFragmentLayout],
            contentWidth: '600px',

            escapeHandler: () => {
                fragmentDialog.close();
                fragmentDialog.destroy();
            },
            beginButton: new Button({
                text: 'Add',
                enabled: false,
                type: ButtonType.Emphasized,
                press: async (event: Event): Promise<void> => {
                    const source = event.getSource() as ExtendedEventProvider;
                    source.setEnabled(false);
                    if (!buttonAddFragment) {
                        // Need to create a new fragment and a respective change file
                        const fragmentNameToCreate = jsonModel.getProperty('/fragmentNameToCreate');
                        const fragmentData = {
                            fragmentName: fragmentNameToCreate,
                            index: jsonModel.getProperty('/selectedIndex'),
                            targetAggregation: jsonModel.getProperty('/selectedAggregation/value')
                        };
                        await that.createNewFragment(fragmentData, runtimeControl, that);
                    } else {
                        const selectedFragmentName = jsonModel.getProperty('/SelectedFragment/selectedFragmentName');
                        await that.createFragmentChange(
                            {
                                fragmentName: selectedFragmentName,
                                index: 0,
                                targetAggregation: 'content'
                            },
                            runtimeControl
                        );
                    }
                    fragmentDialog.close();
                    fragmentDialog.destroy();
                }
            }),
            endButton: new Button({
                text: 'Cancel',
                press: () => {
                    fragmentDialog.close();
                    fragmentDialog.destroy();
                }
            }),
            customHeader: new Bar({
                contentLeft: [
                    new Button({
                        icon: 'sap-icon://nav-back',
                        visible: false,
                        press: (event: Event) => {
                            const source = event.getSource() as ExtendedEventProvider;
                            source.setVisible(false);
                            buttonAddFragment = true;
                            fragmentDialog.getBeginButton().setText('Add');
                            fragmentDialog.getContent()[1].setVisible(false);
                            fragmentDialog.getContent()[0].setVisible(true);
                        }
                    })
                ],
                contentMiddle: [
                    new Text({
                        text: 'Add Fragment'
                    })
                ]
            })
        }).setModel(jsonModel);

        fragmentDialog.addStyleClass('sapUiRTABorder').addStyleClass('sapUiResponsivePadding--content');
        fragmentDialog.open();
    }

    /**
     * Builds new Search Field control
     *
     * @param jsonModel JSON Model that hosts all the dialog data
     * @param filteredFragmentList Filtered fragment List instance
     * @param that FragmentDialog instance
     * @returns {SearchField} Search field instance
     */
    private getSearchField(jsonModel: JSONModel, filteredFragmentList: List, that: FragmentDialog): SearchField {
        return new SearchField('filteredFragmentSearchField', {
            placeholder: 'Search Fragments',
            liveChange: (event: Event) => {
                const filters: object[] = [];
                const source = event.getSource() as ExtendedEventProvider;
                const value = source.getValue();
                const items = filteredFragmentList.getBinding('items');
                if (value && value.length > 0) {
                    const filterName = new Filter('fragmentName', FilterOperator.Contains, value);
                    const filter = new Filter({
                        filters: [filterName],
                        and: false
                    });
                    filters.push(filter);

                    if (!that.isEmptyObject<Binding>(items.oList)) {
                        items.filter(filters);
                    }
                } else if (that.isEmptyObject<Binding>(items.oList)) {
                    items.filter([]);
                } else {
                    items.filter([]);
                }
                jsonModel.setProperty('/fragmentCount', items.oList.length);
            },
            search: (event: Event) => {
                const clearBtnPressed = (event.getParameters() as object & { clearButtonPressed: boolean })
                    .clearButtonPressed;
                const items = filteredFragmentList.getBinding('items');
                if (clearBtnPressed && !that.isEmptyObject<Binding>(items.oList)) {
                    items.filter([]);
                }
            }
        });
    }

    /**
     * Builds a new ComboBox from provided data
     *
     * @param jsonModel JSON Model that hosts all the dialog data
     * @param runtimeControl Runtime control
     * @param that FragmentDialog instance
     * @returns {ComboBox} UI5 Control ComboBox
     */
    private getControlAggregationComboBox(
        jsonModel: JSONModel,
        runtimeControl: ManagedObject,
        that: FragmentDialog
    ): ComboBox {
        return new ComboBox('extPointTargetAggregationCombo', {
            selectedKey: '{/selectedAggregation/key}',
            change: (event: Event) => {
                let selectedItem = '';
                // @ts-ignore
                sap.ui.getCore().byId('filteredFragmentSearchField').setValue('');
                const source = event.getSource() as ExtendedEventProvider;
                if (source.getSelectedItem()) {
                    selectedItem = source.getSelectedItem().getText();
                }
                const selectedKey = source.getSelectedKey();

                jsonModel.setProperty('/selectedAggregation/key', selectedKey);
                jsonModel.setProperty('/selectedAggregation/value', selectedItem);

                let newSelectedControlChildren: string[] | number[] = Object.keys(
                    ControlUtils.getControlAggregationByName(runtimeControl, selectedItem)
                );

                newSelectedControlChildren = newSelectedControlChildren.map((key) => {
                    return parseInt(key);
                });

                const updatedIndexArray: { key: number; value: number }[] =
                    that.fillIndexArray(newSelectedControlChildren);

                jsonModel.setProperty('/index', updatedIndexArray);
                jsonModel.setProperty('/selectedIndex', updatedIndexArray.length - 1);
            }
        }).bindAggregation(
            'items',
            '/targetAggregation',
            // @ts-ignore
            new Item({
                key: '{key}',
                text: '{value}'
            })
        );
    }

    /**
     * @description Checks if an object is empty (has no own properties)
     * @param obj Any object to be checked
     * @returns Boolean value
     */
    private isEmptyObject<T>(obj: Record<string, unknown> | T): boolean {
        if (Array.isArray(obj) && obj.length > 0) {
            return false;
        } else if (typeof obj === 'object') {
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    return false;
                }
            }
            return true;
        } else {
            return false;
        }
    }

    /**
     * @description Creates a new fragment for the specified control
     * @param fragmentData Fragment Data
     * @param fragmentData.index Index for XML Fragment placement
     * @param fragmentData.fragmentName Fragment name
     * @param fragmentData.targetAggregation Target aggregation for control
     * @param runtimeControl Runtime control
     * @param that FragmentDialog instance
     */
    private async createNewFragment(
        fragmentData: CreateFragmentProps,
        runtimeControl: OverflowToolbar,
        that: FragmentDialog
    ): Promise<void> {
        const { fragmentName, index, targetAggregation } = fragmentData;
        try {
            await ApiRequestHandler.writeFragment<unknown>({ fragmentName });
        } catch (e) {
            // In case of error when creating a new fragment, we should not create a change file
            console.error(e.message);
            MessageToast.show(e.message);
            return;
        }

        await that.createFragmentChange({ fragmentName, index, targetAggregation }, runtimeControl);
    }

    /**
     * @description Creates an addXML fragment command and pushes it to the command stack
     * @param fragmentData Fragment Data
     * @param runtimeControl Runtime control
     */
    private async createFragmentChange(fragmentData: CreateFragmentProps, runtimeControl: OverflowToolbar) {
        const { fragmentName, index, targetAggregation } = fragmentData;
        let manifest: ManifestAppdescr;
        try {
            manifest = await ApiRequestHandler.getManifestAppdescr<ManifestAppdescr>();

            if (!manifest) {
                // Highly unlikely since adaptation projects are required to have manifest.appdescr_variant
                throw new Error('Could not retrieve manifest');
            }
        } catch (e) {
            console.error(e.message);
            MessageToast.show(e.message);
            return;
        }

        const { id, reference, namespace, layer } = manifest;

        const flexSettings = {
            baseId: reference,
            developerMode: true,
            layer: layer,
            namespace: namespace,
            projectId: id,
            rootNamespace: (namespace as string).split('/').slice(0, 2).join('/'),
            scenario: undefined
        };

        const designMetadata = OverlayRegistry.getOverlay(runtimeControl).getDesignTimeMetadata();

        const modifiedValue = {
            fragment:
                "<!-- Use stable and unique IDs!-->\n<core:FragmentDefinition xmlns:core='sap.ui.core' xmlns='sap.m'>\n\t<!--  add your xml here -->\n</core:FragmentDefinition>",
            fragmentPath: `fragments/${fragmentName}.fragment.xml`,
            index: index ?? 0,
            targetAggregation: targetAggregation ?? 'content'
        };

        /**
         * Generate the command to be pushed to command stack
         */
        const command = await CommandFactory.getCommandFor(
            runtimeControl,
            'addXML',
            modifiedValue,
            designMetadata,
            flexSettings
        );

        /**
         * The change will have pending state and will only be saved to the workspace when the user clicks save icon
         */
        await this.rta.getCommandStack().pushAndExecute(command);
    }
}
