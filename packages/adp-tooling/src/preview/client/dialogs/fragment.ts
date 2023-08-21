/** sap.m */
import type Dialog from 'sap/m/Dialog';
import MessageToast from 'sap/m/MessageToast';

/** sap.ui.core */
import Fragment from 'sap/ui/core/Fragment';
import type UI5Element from 'sap/ui/core/Element';
import { ValueState } from 'sap/ui/core/library';

/** sap.ui.model */
import JSONModel from 'sap/ui/model/json/JSONModel';

/** sap.ui.rta */
import CommandFactory from 'sap/ui/rta/command/CommandFactory';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

/** sap.ui.base */
import type Event from 'sap/ui/base/Event';
import type EventProvider from 'sap/ui/base/EventProvider';
import type ManagedObject from 'sap/ui/base/ManagedObject';
import type ManagedObjectMetadata from 'sap/ui/base/ManagedObjectMetadata';

/** sap.ui.dt */
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import type ElementOverlay from 'sap/ui/dt/ElementOverlay';
import type ContextMenu from 'sap/ui/dt/plugin/ContextMenu';

/** sap.ui.fl */
import type { Layer } from 'sap/ui/fl';

import ControlUtils from '../control-utils';
import type { FragmentsResponse } from '../api-handler';
import type { BuiltRuntimeControl } from '../control-utils';
import { getFragments, getManifestAppdescr, writeFragment } from '../api-handler';

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
 * Handles creation of the dialog, fills it with data
 */
export default class FragmentDialog {
    /**
     * Dialog instance
     */
    private dialog: Dialog;
    /**
     * JSON Model for the dialog
     */
    private model: JSONModel;
    /**
     * Runtime control managed object
     */
    private runtimeControl: ManagedObject;

    /**
     * @param rta Runtime Authoring
     */
    constructor(private rta: RuntimeAuthoring) {}

    /**
     * @description Initilizes "Add XML Fragment" functionality and adds a new item to the context menu
     * @param contextMenu Context Menu from RTA
     */
    public init(contextMenu: ContextMenu) {
        // We need this in order to keep the reference to the class
        // we cannot use this keyword, because it is overshadowed by function scope
        const that = this;

        /**
         * Controller for the action in the Dialog
         */
        const dummyController = {
            onAggregationChanged: (event: Event) => {
                let selectedItem = '';
                const source = event.getSource() as ExtendedEventProvider;
                if (source.getSelectedItem()) {
                    selectedItem = source.getSelectedItem().getText();
                }
                const selectedKey = source.getSelectedKey();

                that.model.setProperty('/selectedAggregation/key', selectedKey);
                that.model.setProperty('/selectedAggregation/value', selectedItem);

                let newSelectedControlChildren: string[] | number[] = Object.keys(
                    ControlUtils.getControlAggregationByName(that.runtimeControl, selectedItem)
                );

                newSelectedControlChildren = newSelectedControlChildren.map((key) => {
                    return parseInt(key);
                });

                const updatedIndexArray: { key: number; value: number }[] =
                    that.fillIndexArray(newSelectedControlChildren);

                that.model.setProperty('/index', updatedIndexArray);
                that.model.setProperty('/selectedIndex', updatedIndexArray.length - 1);
            },
            onIndexChanged: (event: Event) => {
                const source = event.getSource() as ExtendedEventProvider;
                const selectedIndex = source.getSelectedItem().getText();
                that.model.setProperty('/selectedIndex', parseInt(selectedIndex));
            },
            onFragmentNameInputChange: (event: Event) => {
                const source = event.getSource() as ExtendedEventProvider;
                const fragmentName: string = source.getValue().trim();
                const fragmentList: { fragmentName: string }[] = that.model.getProperty(
                    '/filteredFragmentList/unFilteredFragmentList'
                );

                const iExistingFileIndex = fragmentList.findIndex((f: { fragmentName: string }) => {
                    return f.fragmentName === `${fragmentName}.fragment.xml`;
                });

                switch (true) {
                    case iExistingFileIndex >= 0:
                        source.setValueState(ValueState.Error);
                        source.setValueStateText(
                            'Enter a different name. The fragment name that you entered already exists in your project.'
                        );
                        that.dialog.getBeginButton().setEnabled(false);
                        that.model.setProperty('/fragmentNameToCreate', null);
                        break;
                    case fragmentName.length <= 0:
                        that.dialog.getBeginButton().setEnabled(false);
                        source.setValueState(ValueState.None);
                        that.model.setProperty('/fragmentNameToCreate', null);
                        break;
                    case !/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(fragmentName):
                        source.setValueState(ValueState.Error);
                        source.setValueStateText('A Fragment Name cannot contain white spaces or special characters.');
                        that.dialog.getBeginButton().setEnabled(false);
                        that.model.setProperty('/fragmentNameToCreate', null);
                        break;
                    case fragmentName.length > 0:
                        that.dialog.getBeginButton().setEnabled(true);
                        source.setValueState(ValueState.None);
                        that.model.setProperty('/fragmentNameToCreate', fragmentName);
                        break;
                    default:
                        break;
                }
            },
            onCreateBtnPress: async (event: Event) => {
                const source = event.getSource() as ExtendedEventProvider;
                source.setEnabled(false);
                // Need to create a new fragment and a respective change file
                const fragmentNameToCreate = that.model.getProperty('/fragmentNameToCreate');
                const fragmentData = {
                    fragmentName: fragmentNameToCreate,
                    index: that.model.getProperty('/selectedIndex'),
                    targetAggregation: that.model.getProperty('/selectedAggregation/value')
                };
                await that.createNewFragment(fragmentData, that.runtimeControl, that);
                that.handleDialogClose(that);
            },
            closeDialog: () => that.handleDialogClose(that)
        };

        contextMenu.addMenuItem({
            id: 'ADD_FRAGMENT',
            text: 'Add: Fragment',
            handler: async (overlays: UI5Element[]) => {
                that.model = new JSONModel();
                if (!that.dialog) {
                    that.dialog = (await Fragment.load({
                        name: 'adp.fragments.add-fragment',
                        controller: dummyController
                    })) as Dialog;
                    const { runtimeControl } = await that.getDialogData(overlays, that.model);
                    that.runtimeControl = runtimeControl;
                    that.dialog
                        .setModel(that.model)
                        .addStyleClass('sapUiRTABorder')
                        .addStyleClass('sapUiResponsivePadding--content');
                }
                that.dialog.open();
            },
            icon: 'sap-icon://attachment-html'
        });
    }

    /**
     * Handles the dialog closing and data cleanup
     *
     * @param that FragmentDialog instance
     */
    private handleDialogClose(that: FragmentDialog) {
        that.dialog.close();
        that.dialog.destroy();
    }

    /**
     * Builds and returns data that is used in the dialog
     *
     * @param overlays Overlays
     * @param jsonModel JSON Model for the dialog
     * @returns {Promise<DialogueData>} Dialog data
     */
    public async getDialogData(overlays: UI5Element[], jsonModel: JSONModel): Promise<DialogueData> {
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
            return false;
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
            allowIndexForDefaultAggregation = !defaultAggregationDesignTimeMetadata.specialIndexHandling;
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
            const { fragments } = await getFragments<FragmentsResponse>();

            jsonModel.setProperty('/filteredFragmentList', {
                newFragmentName: '',
                selectorId: selectorId,
                unFilteredFragmentList: fragments // All fragments under /changes/fragments folder
            });
            jsonModel.setProperty('/fragmentCount', fragments.length);
        } catch (e) {
            throw new Error(e.message);
        }

        jsonModel.setProperty('/selectedIndex', indexArray.length - 1);
        jsonModel.setProperty('/defaultAggregation', defaultAggregation);
        jsonModel.setProperty('/targetAggregation', controlAggregation);
        jsonModel.setProperty('/index', indexArray);
        jsonModel.setProperty('/selectorId', selectorId);

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
        runtimeControl: ManagedObject,
        that: FragmentDialog
    ): Promise<void> {
        const { fragmentName, index, targetAggregation } = fragmentData;
        try {
            await writeFragment<unknown>({ fragmentName });
        } catch (e) {
            // In case of error when creating a new fragment, we should not create a change file
            MessageToast.show(e.message);
            throw new Error(e.message);
        }

        await that.createFragmentChange({ fragmentName, index, targetAggregation }, runtimeControl);
    }

    /**
     * @description Creates an addXML fragment command and pushes it to the command stack
     * @param fragmentData Fragment Data
     * @param runtimeControl Runtime control
     */
    private async createFragmentChange(fragmentData: CreateFragmentProps, runtimeControl: ManagedObject) {
        const { fragmentName, index, targetAggregation } = fragmentData;
        let manifest: ManifestAppdescr;
        try {
            manifest = await getManifestAppdescr<ManifestAppdescr>();

            if (!manifest) {
                // Highly unlikely since adaptation projects are required to have manifest.appdescr_variant
                throw new Error('Could not retrieve manifest');
            }
        } catch (e) {
            MessageToast.show(e.message);
            throw new Error(e.message);
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

        const designMetadata = OverlayRegistry.getOverlay(runtimeControl as UI5Element).getDesignTimeMetadata();

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
