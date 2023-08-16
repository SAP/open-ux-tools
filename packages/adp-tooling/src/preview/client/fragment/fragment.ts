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
import { ListMode } from 'sap/m/library';
import { ButtonType } from 'sap/m/library';
import SearchField from 'sap/m/SearchField';
import MessageToast from 'sap/m/MessageToast';
import ToolbarSpacer from 'sap/m/ToolbarSpacer';

/** sap.ui.core */
import Item from 'sap/ui/core/Item';
import type UI5Element from 'sap/ui/core/Element';
import CustomData from 'sap/ui/core/CustomData';
import { ValueState } from 'sap/ui/core/library';
import { VerticalAlign } from 'sap/ui/core/library';

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
     * @description Builds an Add XML Fragment dialog, fills it with data and opens it
     * @param overlays Overlays when clicking on control
     * @param that Points to FragmentDialog class for accessing its methods
     */
    public async handleAddNewFragment(overlays: UI5Element[], that: FragmentDialog) {
        const selectorId = overlays[0].getId();
        const jsonModel = new JSONModel();

        let buttonAddFragment: boolean;
        let runtimeControl: OverflowToolbar;
        let control: BuiltRuntimeControl;
        let controlMetadata: ManagedObjectMetadata;

        const overlayControl = sap.ui.getCore().byId(selectorId) as unknown as ElementOverlay;
        if (overlayControl) {
            runtimeControl = ControlUtils.getRuntimeControl(overlayControl) as OverflowToolbar;
            controlMetadata = runtimeControl.getMetadata();
            control = await ControlUtils.buildControlData(runtimeControl, overlayControl);
        } else {
            return;
        }

        const allAggregations = Object.keys(controlMetadata!.getAllAggregations());
        const hiddenAggregations = ['customData', 'layoutData', 'dependents'];
        const targetAggregation = allAggregations.filter(function (item) {
            if (hiddenAggregations.indexOf(item) === -1) {
                return item;
            }
        });
        const defaultAggregation = runtimeControl.getMetadata().getDefaultAggregationName();
        const selectedControlName = control.name;

        let selectedControlChildren = Object.keys(
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

        // @ts-ignore
        selectedControlChildren = selectedControlChildren.map(function (key) {
            return parseInt(key);
        });

        let indexArray: { key: number; value: number }[] = [];
        const selectedControlChildrenLength = selectedControlChildren.length;

        jsonModel.setProperty('/selectedControlName', selectedControlName);
        jsonModel.setProperty('/selectedAggregation', {});
        jsonModel.setProperty('/indexHandlingFlag', allowIndexForDefaultAggregation);

        if (selectedControlChildren.length === 0) {
            indexArray.push({ key: 0, value: 0 });
        } else {
            // @ts-ignore
            indexArray = selectedControlChildren.map(function (elem, index) {
                return { key: index + 1, value: elem + 1 };
            });
            indexArray.unshift({ key: 0, value: 0 });
            indexArray.push({
                key: selectedControlChildrenLength + 1,
                value: selectedControlChildrenLength + 1
            });
        }

        const controlAggregation: { key: string | number; value: string | number }[] = targetAggregation.map(function (
            elem,
            index
        ) {
            return { key: index, value: elem };
        });

        if (defaultAggregation !== null) {
            controlAggregation.forEach(function (obj) {
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
            console.error(e.message);
            MessageToast.show(e.message);
            return;
        }

        jsonModel.setProperty('/selectedIndex', indexArray.length - 1);
        jsonModel.setProperty('/defaultAggregation', defaultAggregation);
        jsonModel.setProperty('/targetAggregation', controlAggregation);
        jsonModel.setProperty('/index', indexArray);
        jsonModel.setProperty('/selectorId', selectorId ? selectorId : 'oCurrentSelection.id');

        const filteredFragmentList = new List('filteredFragmentList', {
            noDataText: 'Create a fragment. There is no fragment available for the target aggregation.',
            mode: ListMode.SingleSelectMaster,
            selectionChange: function (event: Event) {
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
        }).addStyleClass('uiadaptationFragmentList');

        filteredFragmentList.bindItems(
            '/filteredFragmentList/fragmentList',
            // @ts-ignore
            new StandardListItem({
                customData: new CustomData({
                    key: '{fragmentDocumentPath}'
                }),
                title: '{fragmentName}'
            })
        );

        const fragmentNameInput = new Input({
            width: '24rem',
            description: '.fragment.xml',
            value: '{/newFragmentName}',
            liveChange: async function (event: Event) {
                const source = event.getSource() as ExtendedEventProvider;
                const fragmentName = source.getValue();
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
                    case !/^[a-zA-Z_]+[a-zA-Z0-9_-]*$/.test(fragmentName):
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
                }
            }
        });
        const controlAggregationComboBox = new ComboBox('extPointTargetAggregationCombo', {
            selectedKey: '{/selectedAggregation/key}',
            change: function (event: Event) {
                let selectedItem = null;
                // @ts-ignore
                sap.ui.getCore().byId('filteredFragmentSearchField')!.setValue('');
                const source = event.getSource() as ExtendedEventProvider;
                if (source.getSelectedItem()) {
                    selectedItem = source.getSelectedItem().getText();
                }
                const selectedKey = source.getSelectedKey();

                jsonModel.setProperty('/selectedAggregation/key', selectedKey);
                jsonModel.setProperty('/selectedAggregation/value', selectedItem);

                const newSelectedControlChildren = Object.keys(
                    ControlUtils.getControlAggregationByName(runtimeControl, selectedItem!)
                );

                let updatedIndexArray = [];
                if (newSelectedControlChildren.length === 0) {
                    updatedIndexArray.push({ key: 0, value: 0 });
                } else {
                    updatedIndexArray = newSelectedControlChildren.map(function (elem, index) {
                        return { key: index + 1, value: parseInt(elem) + 1 };
                    });
                    updatedIndexArray.unshift({ key: 0, value: 0 });
                    updatedIndexArray.push({
                        key: newSelectedControlChildren.length + 1,
                        value: newSelectedControlChildren.length + 1
                    });
                }
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
        const indexComboBox = new ComboBox({
            change: function (event: Event) {
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

                new SearchField('filteredFragmentSearchField', {
                    placeholder: 'Search Fragments',
                    liveChange: function (event: Event) {
                        const filters = [];
                        const source = event.getSource() as ExtendedEventProvider;
                        const value = source.getValue();
                        if (value && value.length > 0) {
                            const oFilterName = new Filter('fragmentName', FilterOperator.Contains, value);
                            const oFilter = new Filter({
                                filters: [oFilterName],
                                and: false
                            });
                            filters.push(oFilter);
                            if (that.isEmptyObject<Binding>(filteredFragmentList.getBinding('items')!)) {
                                // @ts-ignore
                                filteredFragmentList.getBinding('items').filter(filters);
                            }
                        } else if (that.isEmptyObject<Binding>(filteredFragmentList.getBinding('items')!)) {
                            // @ts-ignore
                            filteredFragmentList.getBinding('items').filter([]);
                        }
                        jsonModel.setProperty('/fragmentCount', filteredFragmentList.getItems().length);
                    },
                    search: function (event: Event) {
                        const clearBtnPressed = (event.getParameters() as object & { clearButtonPressed: boolean })
                            .clearButtonPressed;
                        if (clearBtnPressed && that.isEmptyObject<Binding>(filteredFragmentList.getBinding('items')!)) {
                            // @ts-ignore
                            filteredFragmentList.getBinding('items').filter([]);
                        }
                    }
                }),
                new HorizontalLayout({
                    content: [
                        new Label({
                            text: {
                                path: '/fragmentCount',
                                formatter: function (value: string) {
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
                            press: function (_: Event) {
                                buttonAddFragment = false;
                                fragmentNameInput.setValue('');
                                fragmentDialog.getBeginButton().setEnabled(false);
                                // @ts-ignore
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
                                formatter: function (value: string) {
                                    if (value) {
                                        return value.charAt(0).toUpperCase() + value.slice(1);
                                    }
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

            escapeHandler: function () {
                fragmentDialog.close();
                fragmentDialog.destroy();
            },
            beginButton: new Button({
                text: 'Add',
                enabled: false,
                type: ButtonType.Emphasized,
                press: async function (event: Event) {
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
                press: function () {
                    fragmentDialog.close();
                    fragmentDialog.destroy();
                }
            }),
            customHeader: new Bar({
                contentLeft: [
                    new Button({
                        icon: 'sap-icon://nav-back',
                        visible: false,
                        press: function (event: Event) {
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
     * @description Checks if an object is empty (has no own properties)
     * @param obj Any object to be checked
     * @returns Boolean value
     */
    private isEmptyObject<T>(obj: Record<string, unknown> | T): boolean {
        if (typeof obj === 'object') {
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
