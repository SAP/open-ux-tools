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
import Icon from 'sap/ui/core/Icon';
import Item from 'sap/ui/core/Item';
import UI5Element from 'sap/ui/core/Element';
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

/** sap.ui.dt */
// import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';

import ManagedObject from 'sap/ui/base/ManagedObject';

import ControlUtils, { BuiltRuntimeControl, ControlManagedObject } from '../control-utils';
import ApiRequestHandler from '../api-handler';
import type { FragmentsResponse } from '../api-handler';

import StandardListItem from 'sap/m/StandardListItem';
import type ElementMetadata from 'sap/ui/core/ElementMetadata';
import ManagedObjectMetadata from 'sap/ui/base/ManagedObjectMetadata';

interface CreateFragmentProps {
    fragmentName: string;
    index: string | number;
    targetAggregation: string;
}

export interface ManifestAppdescr {
    fileName: string;
    layer: string;
    fileType: string;
    reference: string;
    id: string;
    namespace: string;
    version: string;
    content: any[];
}

/**
 *
 */
export default class FragmentDialog {
    /**
     * @param rta Runtime Authoring
     */
    constructor(private rta: sap.ui.rta.RuntimeAuthoring) {}

    /**
     * @description Initilizes "Add XML Fragment" functionality and adds a new item to the context menu
     * @param contextMenu Context Menu from RTA
     */
    public init(contextMenu: sap.ui.dt.plugin.ContextMenu) {
        const that = this;

        contextMenu.addMenuItem({
            id: 'ADD_FRAGMENT',
            text: 'Add: Fragment',
            handler: async (overlays: any) => await this.handleAddNewFragment(overlays, that),
            icon: 'sap-icon://attachment-html'
        });
    }

    /**
     * @description Builds an Add XML Fragment dialog, fills it with data and opens it
     * @param overlays Overlays when clicking on control
     * @param that Points to FragmentDialog class for accessing its methods
     */
    public async handleAddNewFragment(overlays: any, that: FragmentDialog) {
        const selectorId = overlays[0].getId();
        const oModel = new JSONModel();

        let bAddFragment: boolean;
        let runtimeControl: ControlManagedObject;
        let control: BuiltRuntimeControl;
        let controlMetadata: ManagedObjectMetadata;

        const overlayControl = sap.ui.getCore().byId(selectorId) as unknown as sap.ui.dt.ElementOverlay;
        if (overlayControl) {
            runtimeControl = ControlUtils.getRuntimeControl(overlayControl) as unknown as ControlManagedObject;
            controlMetadata = runtimeControl.getMetadata();
            control = await ControlUtils.buildControlData(runtimeControl, overlayControl);
        } else {
            return;
        }

        const aAllAggregation = Object.keys(controlMetadata!.getAllAggregations());
        const aHiddenAggregation = ['customData', 'layoutData', 'dependents'];
        const targetAggregation = aAllAggregation.filter(function (item) {
            if (aHiddenAggregation.indexOf(item) === -1) {
                return item;
            }
        });
        const defaultAggregation = runtimeControl.getMetadata().getDefaultAggregationName();
        const selectedControlName = control.name;

        let selectedControlChildren = Object.keys(
            ControlUtils.getControlAggregationByName(runtimeControl, defaultAggregation)
        );

        let allowIndexForDefaultAggregation = true;
        const oDefaultAggregationDesignTimeMetadata = overlayControl.getDesignTimeMetadata().getData().aggregations[
            defaultAggregation
        ];

        if (oDefaultAggregationDesignTimeMetadata !== undefined) {
            allowIndexForDefaultAggregation =
                oDefaultAggregationDesignTimeMetadata.specialIndexHandling === true ? false : true;
        }

        // @ts-ignore
        selectedControlChildren = selectedControlChildren.map(function (key) {
            return parseInt(key);
        });

        let _aIndexArray: { key: number; value: number }[] = [];
        const selectedControlChildrenLength = selectedControlChildren.length;

        oModel.setProperty('/selectedControlName', selectedControlName);
        oModel.setProperty('/selectedAggregation', {});
        oModel.setProperty('/indexHandlingFlag', allowIndexForDefaultAggregation);

        if (selectedControlChildren.length === 0) {
            _aIndexArray.push({ key: 0, value: 0 });
        } else {
            // @ts-ignore
            _aIndexArray = selectedControlChildren.map(function (elem, index) {
                return { key: index + 1, value: elem + 1 };
            });
            _aIndexArray.unshift({ key: 0, value: 0 });
            _aIndexArray.push({
                key: selectedControlChildrenLength + 1,
                value: selectedControlChildrenLength + 1
            });
        }

        const _aControlAggregation = targetAggregation.map(function (elem, index) {
            return { key: index, value: elem };
        });

        if (defaultAggregation !== null) {
            _aControlAggregation.forEach(function (obj) {
                if (obj.value === defaultAggregation) {
                    // @ts-ignore
                    obj.key = 'default';
                    oModel.setProperty('/selectedAggregation/key', obj.key);
                    oModel.setProperty('/selectedAggregation/value', obj.value);
                }
            });
        } else {
            oModel.setProperty('/selectedAggregation/key', _aControlAggregation[0].key);
            oModel.setProperty('/selectedAggregation/value', _aControlAggregation[0].value);
        }

        try {
            const { fragments, filteredFragments } = await ApiRequestHandler.getFragments<FragmentsResponse>();

            // TODO: Filter fragments that have a respective change file
            oModel.setProperty('/filteredFragmentList', {
                fragmentList: filteredFragments, // filtered fragments that have no corresponding change file
                newFragmentName: '',
                selectorId: selectorId,
                unFilteredFragmentList: fragments // All fragments under /fragments folder
            });
            oModel.setProperty('/fragmentCount', fragments.length);
        } catch (e) {}

        oModel.setProperty('/selectedIndex', _aIndexArray.length - 1);
        oModel.setProperty('/defaultAggregation', defaultAggregation);
        oModel.setProperty('/targetAggregation', _aControlAggregation);
        oModel.setProperty('/index', _aIndexArray);
        oModel.setProperty('/selectorId', selectorId ? selectorId : 'oCurrentSelection.id');

        const oFragmentList = new List('filteredFragmentList', {
            noDataText: 'Create a fragment. There is no fragment available for the target aggregation.',
            mode: ListMode.SingleSelectMaster,
            selectionChange: function (oEvent: any) {
                const oSelectedItem = oEvent.getSource().getSelectedItem();
                oModel.setProperty('/SelectedFragment', {
                    selectedFragmentName: oSelectedItem.getTitle(),
                    selectedFragmentPath: oSelectedItem.getCustomData()[0].getKey()
                });
                // const bEnabled = !!(oSelectedItem && that._getExtPointTargetAggregationComboItem());
                const bEnabled = !!oSelectedItem;
                bAddFragment = true;
                fragmentDialog.getBeginButton().setEnabled(bEnabled);
            }
        }).addStyleClass('uiadaptationFragmentList');

        oFragmentList.bindItems(
            '/filteredFragmentList/fragmentList',
            // @ts-ignore
            new StandardListItem({
                customData: new CustomData({
                    key: '{fragmentDocumentPath}'
                }),
                title: '{fragmentName}'
            })
        );

        const oFragmentNameInput = new Input({
            width: '24rem',
            description: '.fragment.xml',
            value: '{/newFragmentName}',
            liveChange: async function (oEvent: any) {
                const fragmentName = oEvent.getSource().getValue();
                const fragmentList = oModel.getProperty('/filteredFragmentList/unFilteredFragmentList');

                const iExistingFileIndex = fragmentList.findIndex((f: { fragmentName: string }) => {
                    return f.fragmentName === `${fragmentName}.fragment.xml`;
                });
                switch (true) {
                    case iExistingFileIndex >= 0:
                        oEvent.getSource().setValueState(ValueState.Error);
                        oEvent
                            .getSource()
                            .setValueStateText(
                                'Enter a different name. The fragment name that you entered already exists in your project.'
                            );
                        fragmentDialog.getBeginButton().setEnabled(false);
                        oModel.setProperty('/fragmentNameToCreate', null);
                        break;
                    case fragmentName.length <= 0:
                        fragmentDialog.getBeginButton().setEnabled(false);
                        oModel.setProperty('/fragmentNameToCreate', null);
                        break;
                    case !/^[a-zA-Z_]+[a-zA-Z0-9_-]*$/.test(fragmentName):
                        oEvent.getSource().setValueState(ValueState.Error);
                        oEvent
                            .getSource()
                            .setValueStateText('A Fragment Name cannot contain white spaces or special characters.');
                        fragmentDialog.getBeginButton().setEnabled(false);
                        oModel.setProperty('/fragmentNameToCreate', null);
                        break;
                    case fragmentName.length > 0:
                        fragmentDialog.getBeginButton().setEnabled(true);
                        oEvent.getSource().setValueState(ValueState.None);
                        oModel.setProperty('/fragmentNameToCreate', fragmentName);
                        break;
                }
            }
        });
        const oControlAggregationComboBox = new ComboBox('extPointTargetAggregationCombo', {
            selectedKey: '{/selectedAggregation/key}',
            change: function (oEvent: any) {
                let selectedItem = null;
                // @ts-ignore
                sap.ui.getCore().byId('filteredFragmentSearchField')!.setValue('');
                if (oEvent.oSource.getSelectedItem()) {
                    selectedItem = oEvent.oSource.getSelectedItem().getText();
                }
                const selectedKey = oEvent.oSource.getSelectedKey();
                if (!selectedItem) {
                    // sap.ui.getCore().byId('createNewFragmentLink').setEnabled(false);
                } else {
                    // sap.ui.getCore().byId('createNewFragmentLink').setEnabled(true);
                }
                oModel.setProperty('/selectedAggregation/key', selectedKey);
                oModel.setProperty('/selectedAggregation/value', selectedItem);

                const newSelectedControlChildren = Object.keys(
                    ControlUtils.getControlAggregationByName(runtimeControl, selectedItem)
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
                oModel.setProperty('/index', updatedIndexArray);
                oModel.setProperty('/selectedIndex', updatedIndexArray.length - 1);
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
        const oIndexComboBox = new ComboBox({
            change: function (oEvent: any) {
                const sSelectedIndex = oEvent.oSource.getSelectedItem().getText();
                oModel.setProperty('/selectedIndex', parseInt(sSelectedIndex));
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

        // const oPopoverIndexField = new Popover('popoverr1', {
        //     placement: PlacementType.Bottom,
        //     showHeader: false,
        //     offsetX: 20,
        //     contentWidth: '22rem',
        //     showArrow: false,
        //     content: new Text()
        // });
        const oIndexFieldHelpIcon = new Icon({
            src: 'sap-icon://message-information',
            size: '1rem',
            visible: {
                path: '/indexHandlingFlag',
                formatter: function (oValue: boolean | string) {
                    if (oValue) {
                        return false;
                    }
                    return true;
                }
            },
            press: function () {
                // oPopoverIndexField
                //     .getContent()[0]
                //     .setText(
                //         that.context.i18n.getText('UIAdaptationFragment_fragment_index_uneditable', [
                //             oModel.getProperty('/selectedControlName')
                //         ])
                //     );
                // oPopoverIndexField.openBy(this);
            }
        }).addStyleClass('uiadaptationFragmentIndexHelpIcon');

        const oSelectFragmentLayout = new VerticalLayout({
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
                        oControlAggregationComboBox
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
                        oIndexComboBox,
                        oIndexFieldHelpIcon
                    ]
                }).addStyleClass('sapUiTinyMarginTopBottom'),

                new SearchField('filteredFragmentSearchField', {
                    placeholder: 'Search Fragments',
                    liveChange: function (oEvent: any) {
                        const aFilters = [];
                        const sValue = oEvent.getSource().getValue();
                        if (sValue && sValue.length > 0) {
                            const oFilterName = new Filter('fragmentName', FilterOperator.Contains, sValue);
                            const oFilter = new Filter({
                                filters: [oFilterName],
                                and: false
                            });
                            aFilters.push(oFilter);
                            // TODO: Replace this jQuery
                            // @ts-ignore
                            if (!jQuery.isEmptyObject(oFragmentList.getBinding('items'))) {
                                // @ts-ignore
                                oFragmentList.getBinding('items').filter(aFilters);
                            }
                            // TODO: Replace this jQuery
                            // @ts-ignore
                        } else if (!jQuery.isEmptyObject(oFragmentList.getBinding('items'))) {
                            // @ts-ignore
                            oFragmentList.getBinding('items').filter([]);
                        }
                        oModel.setProperty('/fragmentCount', oFragmentList.getItems().length);
                    },
                    search: function (oEvent: any) {
                        const bClearBtnPressed = oEvent.getParameters().clearButtonPressed;
                        // @ts-ignore
                        if (bClearBtnPressed && !jQuery.isEmptyObject(oFragmentList.getBinding('items'))) {
                            // @ts-ignore
                            oFragmentList.getBinding('items').filter([]);
                        }
                    }
                }),
                new HorizontalLayout({
                    content: [
                        new Label({
                            text: {
                                path: '/fragmentCount',
                                formatter: function (oValue: string) {
                                    if (oValue !== undefined) {
                                        return oValue + ' ' + 'Fragments';
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
                            press: function (oEvent: any) {
                                bAddFragment = false;
                                oFragmentNameInput.setValue('');
                                fragmentDialog.getBeginButton().setEnabled(false);
                                // @ts-ignore
                                fragmentDialog.getCustomHeader().getContentLeft()[0].setVisible(true);
                                fragmentDialog.getBeginButton().setText('Create');
                                fragmentDialog.getContent()[0].setVisible(false);
                                fragmentDialog.getContent()[1].setVisible(true);
                            },
                            enabled: oModel.getProperty('/selectedAggregation/value') ? true : false
                        }).addStyleClass('uiadaptationFragmentDialogLink')
                    ]
                }).addStyleClass('sapUiTinyMarginBottom'),
                oFragmentList
            ]
        });

        const oCreateFragmentLayout = new VerticalLayout({
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
                                formatter: function (oValue: string) {
                                    if (oValue) {
                                        return oValue.charAt(0).toUpperCase() + oValue.slice(1);
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
                        oFragmentNameInput
                    ]
                }).addStyleClass('sapUiTinyMarginTopBottom')
            ]
        });
        var fragmentDialog = new Dialog({
            content: [oSelectFragmentLayout, oCreateFragmentLayout],
            contentWidth: '600px',

            escapeHandler: function () {
                fragmentDialog.close();
                fragmentDialog.destroy();
            },
            beginButton: new Button({
                text: 'Add',
                enabled: false,
                type: ButtonType.Emphasized,
                press: async function (oEvent: any) {
                    oEvent.getSource().setEnabled(false);
                    if (!bAddFragment) {
                        // Need to create a new fragment and a respective change file
                        const fragmentNameToCreate = oModel.getProperty('/fragmentNameToCreate');
                        await that.createNewFragment(
                            {
                                fragmentName: fragmentNameToCreate,
                                index: oModel.getProperty('/selectedIndex'),
                                targetAggregation: oModel.getProperty('/selectedAggregation/value')
                            },
                            runtimeControl
                        );
                        fragmentDialog.close();
                        fragmentDialog.destroy();
                    } else {
                        const sSelectedFragmentName = oModel.getProperty('/SelectedFragment/selectedFragmentName');
                        // TODO: Just create a change file for that XML Fragment and close the dialog
                    }
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
                        press: function (oEvent: any) {
                            oEvent.getSource().setVisible(false);
                            bAddFragment = true;
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
        }).setModel(oModel);

        fragmentDialog.addStyleClass('sapUiRTABorder').addStyleClass('sapUiResponsivePadding--content');
        fragmentDialog.open();
    }

    /**
     * @description Creates a new fragment for the specified control
     * @param fragmentName Fragment name
     * @param index Index for XML Fragment placement
     * @param targetAggregation Target aggregation for control
     * @param runtimeControl Runtime control
     */
    public async createNewFragment(
        { fragmentName, index, targetAggregation }: CreateFragmentProps,
        runtimeControl: any
    ): Promise<void> {
        try {
            await ApiRequestHandler.writeFragment<unknown>({ fragmentName });
        } catch (e) {
            // In case of error when creating a new fragment, we should not create a change file
            console.error(e.message);
            MessageToast.show(e.message);
            return;
        }

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
            rootNamespace: namespace.split('/').slice(0, 2).join('/'),
            scenario: undefined
        };

        const designMetadata = sap.ui.dt.OverlayRegistry.getOverlay(runtimeControl).getDesignTimeMetadata();

        const modifiedValue = {
            fragment:
                "<!-- Use stable and unique IDs!-->\n<core:FragmentDefinition xmlns:core='sap.ui.core' xmlns='sap.m'>\n\t<!--  add your xml here -->\n</core:FragmentDefinition>",
            fragmentPath: `fragments/${fragmentName}.fragment.xml`,
            index: index ?? 0,
            targetAggregation: targetAggregation ?? 'content'
        };

        const command = await sap.ui.rta.command.CommandFactory.getCommandFor(
            runtimeControl,
            'addXML',
            modifiedValue,
            designMetadata,
            flexSettings
        );

        /**
         * The change will have pending state and will only be saved to the workspace when the user clicks save icon
         *  */
        await this.rta.getCommandStack().pushAndExecute(command);
    }
}
