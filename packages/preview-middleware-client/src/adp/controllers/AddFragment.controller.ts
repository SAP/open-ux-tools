/** sap.m */
import Button from 'sap/m/Button';
import type Dialog from 'sap/m/Dialog';
import type ComboBox from 'sap/m/ComboBox';

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

/** sap.ui.fl */
import { type AddFragmentChangeContentType } from 'sap/ui/fl/Change';

import { setApplicationRequiresReload } from '@sap-ux-private/control-property-editor-common';

import { getResourceModel, getTextBundle } from '../../i18n';
import { CommunicationService } from '../../cpe/communication-service';

import ControlUtils from '../control-utils';
import CommandExecutor from '../command-executor';
import { getFragments } from '../api-handler';
import BaseDialog from './BaseDialog.controller';
import { notifyUser } from '../utils';
import { getControlById } from '../../utils/core';

interface CreateFragmentProps {
    fragmentName: string;
    index: string | number;
    targetAggregation: string;
}

const radix = 10;

type AddFragmentModel = JSONModel & {
    getProperty(sPath: '/title'): string;
    getProperty(sPath: '/completeView'): boolean;
    getProperty(sPath: '/newFragmentName'): string;
    getProperty(sPath: '/selectedIndex'): number;
    getProperty(sPath: '/selectedAggregation/value'): string;
};

export interface AddFragmentOptions {
    title: string;
    aggregation?: string;
}

/**
 * @namespace open.ux.preview.client.adp.controllers
 */
export default class AddFragment extends BaseDialog<AddFragmentModel> {
    constructor(name: string, overlays: UI5Element, rta: RuntimeAuthoring, readonly options: AddFragmentOptions) {
        super(name);
        this.rta = rta;
        this.overlays = overlays;
        this.model = new JSONModel({
            title: options.title,
            completeView: options.aggregation === undefined
        });
        this.ui5Version = sap.ui.version;
        this.commandExecutor = new CommandExecutor(this.rta);
    }

    /**
     * Setups the Dialog and the JSON Model
     *
     * @param {Dialog} dialog - Dialog instance
     */
    async setup(dialog: Dialog): Promise<void> {
        this.dialog = dialog;

        this.setEscapeHandler();

        await this.buildDialogData();
        const resourceModel = await getResourceModel('open.ux.preview.client');

        this.dialog.setModel(resourceModel, 'i18n');
        this.dialog.setModel(this.model);

        this.dialog.open();
    }

    /**
     * Handles the index field whenever a specific aggregation is chosen
     *
     * @param specialIndexAggregation string | number
     */
    private specialIndexHandling(specialIndexAggregation: string | number): void {
        const overlay = OverlayRegistry.getOverlay(this.runtimeControl as UI5Element);
        const aggregations = overlay.getDesignTimeMetadata().getData().aggregations;

        if (
            specialIndexAggregation in aggregations &&
            'specialIndexHandling' in aggregations[specialIndexAggregation]
        ) {
            const controlType = this.runtimeControl.getMetadata().getName();
            this.model.setProperty('/indexHandlingFlag', false);
            this.model.setProperty('/specialIndexHandlingIcon', true);
            this.model.setProperty(
                '/iconTooltip',
                `Index is defined by special logic of ${controlType} and can't be set here`
            );
        } else {
            this.model.setProperty('/indexHandlingFlag', true);
            this.model.setProperty('/specialIndexHandlingIcon', false);
            this.model.setProperty('/specialIndexHandlingIconPressed', false);
        }
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
            return parseInt(key, radix);
        });

        this.specialIndexHandling(selectedItemText);

        const updatedIndexArray: { key: number; value: number }[] = this.fillIndexArray(newSelectedControlChildren);

        this.model.setProperty('/index', updatedIndexArray);
        this.model.setProperty('/selectedIndex', updatedIndexArray.length - 1);
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
        const index = this.model.getProperty('/selectedIndex');
        const targetAggregation = this.model.getProperty('/selectedAggregation/value');
        const fragmentData = {
            index,
            fragmentName,
            targetAggregation
        };

        const templateName = await this.createFragmentChange(fragmentData);

        const textKey = templateName ? 'ADP_ADD_FRAGMENT_WITH_TEMPLATE_NOTIFICATION' : 'ADP_ADD_FRAGMENT_NOTIFICATION';
        const bundle = await getTextBundle();
        notifyUser(bundle.getText(textKey, [fragmentName]), 8000);

        this.handleDialogClose();
    }

    /**
     * Builds data that is used in the dialog
     */
    async buildDialogData(): Promise<void> {
        const selectorId = this.overlays.getId();

        let controlMetadata: ManagedObjectMetadata;

        const overlayControl = getControlById(selectorId) as unknown as ElementOverlay;
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
        const defaultAggregation = this.options.aggregation ?? controlMetadata.getDefaultAggregationName();
        const selectedControlName = controlMetadata.getName();

        let selectedControlChildren: string[] | number[] = Object.keys(
            ControlUtils.getControlAggregationByName(this.runtimeControl, defaultAggregation)
        );

        selectedControlChildren = selectedControlChildren.map((key) => {
            return parseInt(key, radix);
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
                    this.specialIndexHandling(obj.value);
                }
            });
        } else {
            this.model.setProperty('/selectedAggregation/key', controlAggregation[0].key);
            this.model.setProperty('/selectedAggregation/value', controlAggregation[0].value);
            this.specialIndexHandling(controlAggregation[0].value);
        }

        try {
            const { fragments } = await getFragments();

            this.model.setProperty('/fragmentList', fragments);
        } catch (e) {
            this.handleError(e);
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
     * Creates an addXML fragment command and pushes it to the command stack
     *
     * @param fragmentData Fragment Data
     */
    private async createFragmentChange(fragmentData: CreateFragmentProps): Promise<string | undefined> {
        const { fragmentName, index, targetAggregation } = fragmentData;

        const flexSettings = this.rta.getFlexSettings();

        const overlay = OverlayRegistry.getOverlay(this.runtimeControl as UI5Element);
        const designMetadata = overlay.getDesignTimeMetadata();

        const modifiedValue = {
            fragment: `<core:FragmentDefinition xmlns:core='sap.ui.core'></core:FragmentDefinition>`,
            fragmentPath: `fragments/${fragmentName}.fragment.xml`,
            index: index ?? 0,
            targetAggregation: targetAggregation ?? 'content'
        };

        const command = await this.commandExecutor.getCommand<AddFragmentChangeContentType>(
            this.runtimeControl,
            'addXML',
            modifiedValue,
            designMetadata,
            flexSettings
        );

        const templateName = this.getFragmentTemplateName(modifiedValue.targetAggregation);
        if (templateName) {
            const preparedChange = command.getPreparedChange();
            const content = preparedChange.getContent();
            preparedChange.setContent({ ...content, templateName });
            CommunicationService.sendAction(setApplicationRequiresReload(true));
        }
        await this.commandExecutor.pushAndExecuteCommand(command);
        return templateName;
    }

    /**
     * Determines fragment template name based on current control name and provided target aggregation
     * @param targetAggregation - target aggregation name
     * @returns fragment template name or empty string
     */
    private getFragmentTemplateName(targetAggregation: string): string {
        const currentControlName = this.runtimeControl.getMetadata().getName();
        if (currentControlName === 'sap.uxap.ObjectPageLayout' && targetAggregation === 'sections') {
            return 'OBJECT_PAGE_CUSTOM_SECTION';
        } else if (this.isCustomAction(currentControlName, targetAggregation)) {
            return 'CUSTOM_ACTION';
        } else if (this.isObjectPageHeaderField(currentControlName, targetAggregation)) {
            return 'OBJECT_PAGE_HEADER_FIELD';
        }
        return '';
    }

    /**
     * Determines conditions for custom action fragment creation
     * @param currentControlName - current control name
     * @param targetAggregation - target aggregation name
     * @returns true if control and aggregation combination allows to create custom action fragment
     */
    private isCustomAction(currentControlName: string, targetAggregation: string): boolean {
        if (
            ['sap.f.DynamicPageTitle', 'sap.uxap.ObjectPageHeader', 'sap.uxap.ObjectPageDynamicHeaderTitle'].includes(
                currentControlName
            )
        ) {
            return targetAggregation === 'actions';
        } else if (currentControlName === 'sap.m.OverflowToolbar' || currentControlName === 'sap.m.Toolbar') {
            return targetAggregation === 'content';
        }
        return false;
    }

    /**
     * Determines conditions for object page header field fragment creation
     * @param currentControlName - current control name
     * @param targetAggregation - target aggregation name
     * @returns true if conditions allow to create object page header field fragment
     */
    private isObjectPageHeaderField(currentControlName: string, targetAggregation: string): boolean {
        if (currentControlName === 'sap.uxap.ObjectPageLayout') {
            return targetAggregation === 'headerContent';
        } else if (currentControlName === 'sap.m.FlexBox') {
            const parentName = this.runtimeControl.getParent()?.getMetadata().getName();
            if (
                parentName === 'sap.uxap.ObjectPageDynamicHeaderContent' ||
                parentName === 'sap.uxap.ObjectPageLayout'
            ) {
                return targetAggregation === 'items';
            }
        }
        return false;
    }
}
