/** sap.m */
import Button from 'sap/m/Button';
import type Dialog from 'sap/m/Dialog';
import type ComboBox from 'sap/m/ComboBox';
import MessageToast from 'sap/m/MessageToast';

/** sap.ui.core */
import type UI5Element from 'sap/ui/core/Element';

/** sap.ui.base */
import type Event from 'sap/ui/base/Event';
import type ManagedObjectMetadata from 'sap/ui/base/ManagedObjectMetadata';

/** sap.ui.model */
import JSONModel from 'sap/ui/model/json/JSONModel';

/** sap.ui.rta */
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

/** sap.ui.dt */
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import type ElementOverlay from 'sap/ui/dt/ElementOverlay';

import ControlUtils from '../control-utils';
import CommandExecutor from '../command-executor';
import { getFragments, writeFragment } from '../api-handler';
import BaseDialog from './BaseDialog.controller';

interface CreateFragmentProps {
    fragmentName: string;
    index: string | number;
    targetAggregation: string;
}

/**
 * @namespace open.ux.preview.client.adp.controllers
 */
export default class AddFragment extends BaseDialog {
    constructor(name: string, overlays: UI5Element, rta: RuntimeAuthoring) {
        super(name);
        this.rta = rta;
        this.overlays = overlays;
        this.model = new JSONModel();
        this.commandExecutor = new CommandExecutor(this.rta);
    }

    /**
     * Initializes controller, fills model with data and opens the dialog
     */
    async onInit() {
        this.dialog = this.byId('addNewFragmentDialog') as unknown as Dialog;

        this.setEscapeHandler();

        await this.buildDialogData();

        this.getView()?.setModel(this.model);

        this.dialog.open();
    }

    /**
     * Handles the change in aggregations
     *
     * @param event Event
     */
    onAggregationChanged(event: Event) {
        const source = event.getSource<ComboBox>();

        const selectedKey = source.getSelectedKey();
        const selectedItem = source.getSelectedItem();

        let selectedItemText = '';
        if (selectedItem) {
            selectedItemText = selectedItem.getText();
        }

        this.model.setProperty('/selectedAggregation/key', selectedKey);
        this.model.setProperty('/selectedAggregation/value', selectedItemText);

        let newSelectedControlChildren: string[] | number[] = Object.keys(
            ControlUtils.getControlAggregationByName(this.runtimeControl, selectedItemText)
        );

        newSelectedControlChildren = newSelectedControlChildren.map((key) => {
            return parseInt(key);
        });

        const updatedIndexArray: { key: number; value: number }[] = this.fillIndexArray(newSelectedControlChildren);

        this.model.setProperty('/index', updatedIndexArray);
        this.model.setProperty('/selectedIndex', updatedIndexArray.length - 1);
    }

    /**
     * Handles the change in target indexes
     *
     * @param event Event
     */
    onIndexChanged(event: Event) {
        const source = event.getSource<ComboBox>();
        const selectedIndex = source.getSelectedItem()?.getText();
        this.model.setProperty('/selectedIndex', selectedIndex);
    }

    /**
     * Handles create button press
     *
     * @param event Event
     */
    async onCreateBtnPress(event: Event) {
        const source = event.getSource<Button>();
        source.setEnabled(false);

        const fragmentName = this.model.getProperty('/newFragmentName');
        const index = parseInt(this.model.getProperty('/selectedIndex'));
        const targetAggregation = this.model.getProperty('/selectedAggregation/value');
        const fragmentData = {
            index,
            fragmentName,
            targetAggregation
        };

        await this.createNewFragment(fragmentData);

        this.handleDialogClose();
    }

    /**
     * Builds data that is used in the dialog
     */
    async buildDialogData(): Promise<void> {
        const selectorId = this.overlays.getId();

        let controlMetadata: ManagedObjectMetadata;

        const overlayControl = sap.ui.getCore().byId(selectorId) as unknown as ElementOverlay;
        if (overlayControl) {
            this.runtimeControl = ControlUtils.getRuntimeControl(overlayControl);
            controlMetadata = this.runtimeControl.getMetadata();
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
        const defaultAggregation = controlMetadata.getDefaultAggregationName();
        const selectedControlName = controlMetadata.getName();

        let selectedControlChildren: string[] | number[] = Object.keys(
            ControlUtils.getControlAggregationByName(this.runtimeControl, defaultAggregation)
        );

        selectedControlChildren = selectedControlChildren.map((key) => {
            return parseInt(key);
        });

        this.model.setProperty('/selectedControlName', selectedControlName);
        this.model.setProperty('/selectedAggregation', {});

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
                    this.model.setProperty('/selectedAggregation/key', obj.key);
                    this.model.setProperty('/selectedAggregation/value', obj.value);
                }
            });
        } else {
            this.model.setProperty('/selectedAggregation/key', controlAggregation[0].key);
            this.model.setProperty('/selectedAggregation/value', controlAggregation[0].value);
        }

        try {
            const { fragments } = await getFragments();

            this.model.setProperty('/fragmentList', fragments);
        } catch (e) {
            MessageToast.show(e.message);
            throw new Error(e.message);
        }

        this.model.setProperty('/selectedIndex', indexArray.length - 1);
        this.model.setProperty('/targetAggregation', controlAggregation);
        this.model.setProperty('/index', indexArray);
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
     * Creates a new fragment for the specified control
     *
     * @param fragmentData Fragment Data
     * @param fragmentData.index Index for XML Fragment placement
     * @param fragmentData.fragmentName Fragment name
     * @param fragmentData.targetAggregation Target aggregation for control
     */
    private async createNewFragment(fragmentData: CreateFragmentProps): Promise<void> {
        const { fragmentName, index, targetAggregation } = fragmentData;
        try {
            await writeFragment<unknown>({ fragmentName });
            MessageToast.show(`Fragment with name '${fragmentName}' was created.`);
        } catch (e) {
            // In case of error when creating a new fragment, we should not create a change file
            MessageToast.show(e.message);
            throw new Error(e.message);
        }

        await this.createFragmentChange({ fragmentName, index, targetAggregation });
    }

    /**
     * Creates an addXML fragment command and pushes it to the command stack
     *
     * @param fragmentData Fragment Data
     */
    private async createFragmentChange(fragmentData: CreateFragmentProps) {
        const { fragmentName, index, targetAggregation } = fragmentData;

        const flexSettings = this.rta.getFlexSettings();

        const overlay = OverlayRegistry.getOverlay(this.runtimeControl as UI5Element);
        const designMetadata = overlay.getDesignTimeMetadata();

        const modifiedValue = {
            fragmentPath: `fragments/${fragmentName}.fragment.xml`,
            index: index ?? 0,
            targetAggregation: targetAggregation ?? 'content'
        };

        await this.commandExecutor.generateAndExecuteCommand(
            this.runtimeControl,
            'addXML',
            modifiedValue,
            designMetadata,
            flexSettings
        );
    }
}
