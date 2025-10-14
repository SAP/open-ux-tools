/** sap.m */
import Button from 'sap/m/Button';
import type ComboBox from 'sap/m/ComboBox';
import type Dialog from 'sap/m/Dialog';

/** sap.ui.core */
import type UI5Element from 'sap/ui/core/Element';

/** sap.ui.base */
import type Event from 'sap/ui/base/Event';

/** sap.ui.model */
import JSONModel from 'sap/ui/model/json/JSONModel';

/** sap.ui.rta */
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

/** sap.ui.dt */
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';

/** sap.ui.fl */
import { type AddFragmentChangeContentType } from 'sap/ui/fl/Change';

import { getResourceModel } from '../../i18n';

import { MessageBarType, setApplicationRequiresReload } from '@sap-ux-private/control-property-editor-common';
import { getFragmentTemplateName } from '../../cpe/additional-change-info/add-xml-additional-info';
import { CommunicationService } from '../../cpe/communication-service';
import { QuickActionTelemetryData } from '../../cpe/quick-actions/quick-action-definition';
import { getError } from '../../utils/error';
import { sendInfoCenterMessage } from '../../utils/info-center-message';
import type { AddFragmentData, DeferredXmlFragmentData } from '../add-fragment';
import { getFragments } from '../api-handler';
import CommandExecutor from '../command-executor';
import ControlUtils from '../control-utils';
import BaseDialog from './BaseDialog.controller';

const radix = 10;

export type AddFragmentModel = JSONModel & {
    getProperty(sPath: '/title'): string;
    getProperty(sPath: '/completeView'): boolean;
    getProperty(sPath: '/newFragmentName'): string;
    getProperty(sPath: '/selectedIndex'): number;
    getProperty(sPath: '/selectedAggregation/value'): string;
};

export interface AddFragmentOptions {
    title: string;
    aggregation?: string;
    defaultAggregationArrayIndex?: number;
}

/**
 * @namespace open.ux.preview.client.adp.controllers
 */
export default class AddFragment extends BaseDialog<AddFragmentModel> {
    private readonly data?: AddFragmentData;

    constructor(
        name: string,
        overlays: UI5Element,
        rta: RuntimeAuthoring,
        readonly options: AddFragmentOptions,
        data?: AddFragmentData,
        telemetryData?: QuickActionTelemetryData
    ) {
        super(name, telemetryData);
        this.rta = rta;
        this.overlays = overlays;
        this.model = new JSONModel({
            title: options.title,
            completeView: options.aggregation === undefined
        });
        this.commandExecutor = new CommandExecutor(this.rta);
        this.data = data;
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
            ControlUtils.getControlAggregationByName(this.getRuntimeControl(), selectedItemText)
        );

        newSelectedControlChildren = newSelectedControlChildren.map((key) => {
            return Number.parseInt(key, radix);
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

        await super.onCreateBtnPressHandler();

        const fragmentName = this.model.getProperty('/newFragmentName');
        const index = this.model.getProperty('/selectedIndex');
        const targetAggregation = this.model.getProperty('/selectedAggregation/value') ?? 'content';

        const modifiedValue = {
            fragment: `<core:FragmentDefinition xmlns:core='sap.ui.core'></core:FragmentDefinition>`,
            fragmentPath: `fragments/${fragmentName}.fragment.xml`,
            index: index ?? 0,
            targetAggregation: targetAggregation ?? 'content'
        };

        if (this.data) {
            this.data.deferred.resolve(modifiedValue);
        } else {
            await this.createFragmentChange(modifiedValue);
        }

        const templateName = getFragmentTemplateName(this.getRuntimeControl().getId(), targetAggregation);
        if (templateName) {
            CommunicationService.sendAction(setApplicationRequiresReload(true));
        }

        await sendInfoCenterMessage({
            title: { key: 'ADP_CREATE_XML_FRAGMENT_TITLE' },
            description: { key: 'ADP_ADD_FRAGMENT_NOTIFICATION', params: [fragmentName] },
            type: MessageBarType.info
        });

        this.handleDialogClose();
    }

    /**
     * Builds data that is used in the dialog
     */
    async buildDialogData(): Promise<void> {
        const { controlMetadata, targetAggregation } = this.getControlMetadata();
        const defaultAggregation = this.options.aggregation ?? controlMetadata.getDefaultAggregationName();
        const selectedControlName = controlMetadata.getName();

        let selectedControlChildren: string[] | number[] = Object.keys(
            ControlUtils.getControlAggregationByName(this.getRuntimeControl(), defaultAggregation)
        );

        selectedControlChildren = selectedControlChildren.map((key) => {
            return Number.parseInt(key, radix);
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
            const error = getError(e);
            await sendInfoCenterMessage({
                title: { key: 'ADP_ADD_FRAGMENT_FAILURE_TITLE' },
                description: error.message,
                type: MessageBarType.error
            });
            throw error;
        }

        this.model.setProperty('/selectedIndex', indexArray.length - 1);
        this.model.setProperty('/targetAggregation', controlAggregation);
        this.model.setProperty('/index', indexArray);
        const defaultIndex = Number(this.options.defaultAggregationArrayIndex);
        if (defaultIndex >= 0) {
            this.model.setProperty('/selectedIndex', indexArray.length - 1 > 0 ? defaultIndex : 0);
        }
    }

    /**
     * Creates an addXML fragment command and pushes it to the command stack
     *
     * @param modifiedValue - modified value
     * @param templateName - fragment template name
     */
    private async createFragmentChange(modifiedValue: DeferredXmlFragmentData): Promise<void> {
        const flexSettings = this.rta.getFlexSettings();

        const overlay = OverlayRegistry.getOverlay(this.getRuntimeControl() as UI5Element);
        const designMetadata = overlay.getDesignTimeMetadata();

        const command = await this.commandExecutor.getCommand<AddFragmentChangeContentType>(
            this.getRuntimeControl(),
            'addXML',
            modifiedValue,
            flexSettings,
            designMetadata
        );

        await this.commandExecutor.pushAndExecuteCommand(command);
    }
}
