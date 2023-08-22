/** sap.m */
import type Dialog from 'sap/m/Dialog';
import MessageToast from 'sap/m/MessageToast';

/** sap.ui.core */
import Fragment from 'sap/ui/core/Fragment';
import type UI5Element from 'sap/ui/core/Element';

/** sap.ui.model */
import JSONModel from 'sap/ui/model/json/JSONModel';

/** sap.ui.rta */
import CommandFactory from 'sap/ui/rta/command/CommandFactory';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

/** sap.ui.base */
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
import Controller from 'sap/ui/core/mvc/Controller';
import type AddFragment from '../controllers/AddFragment.controller';

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

/**
 * Handles creation of the dialog, fills it with data
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
    public async init(contextMenu: ContextMenu) {
        contextMenu.addMenuItem({
            id: 'ADD_FRAGMENT',
            text: 'Add: Fragment',
            handler: async function (this: FragmentDialog, overlays: UI5Element[]) {
                const controller = (await Controller.create({
                    name: 'adp.extension.controllers.AddFragment'
                })) as unknown as AddFragment;

                controller.model = new JSONModel();
                const { runtimeControl } = await this.getDialogData(overlays, controller.model);
                controller.runtimeControl = runtimeControl;

                if (!controller.dialog) {
                    controller.dialog = (await Fragment.load({
                        name: 'adp.extension.ui.AddFragment',
                        controller
                    })) as Dialog;

                    controller.dialog.setModel(controller.model).addStyleClass('sapUiRTABorder');
                }
                controller.fillIndexArray = this.fillIndexArray;
                controller.createNewFragment = this.createNewFragment.bind(this);
                controller.dialog.open();
            }.bind(this),
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
     */
    private async createNewFragment(fragmentData: CreateFragmentProps, runtimeControl: ManagedObject): Promise<void> {
        const { fragmentName, index, targetAggregation } = fragmentData;
        try {
            await writeFragment<unknown>({ fragmentName });
        } catch (e) {
            // In case of error when creating a new fragment, we should not create a change file
            MessageToast.show(e.message);
            throw new Error(e.message);
        }

        await this.createFragmentChange({ fragmentName, index, targetAggregation }, runtimeControl);
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
