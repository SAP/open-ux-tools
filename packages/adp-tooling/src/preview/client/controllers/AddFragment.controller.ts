/** sap.ui.fl */
import type { Layer } from 'sap/ui/fl';

/** sap.m */
import type Dialog from 'sap/m/Dialog';
import MessageToast from 'sap/m/MessageToast';

/** sap.ui.core */
import { ValueState } from 'sap/ui/core/library';
import type UI5Element from 'sap/ui/core/Element';
import Controller from 'sap/ui/core/mvc/Controller';

/** sap.ui.base */
import type Event from 'sap/ui/base/Event';
import type EventProvider from 'sap/ui/base/EventProvider';
import type ManagedObject from 'sap/ui/base/ManagedObject';
import type ManagedObjectMetadata from 'sap/ui/base/ManagedObjectMetadata';

/** sap.ui.model */
import JSONModel from 'sap/ui/model/json/JSONModel';

/** sap.ui.rta */
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

/** sap.ui.dt */
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import type ElementOverlay from 'sap/ui/dt/ElementOverlay';

import CommandExecutor from '../command-executor';
import type { FragmentsResponse } from '../api-handler';
import ControlUtils, { type BuiltRuntimeControl } from '../control-utils';
import { getFragments, getManifestAppdescr, writeFragment } from '../api-handler';

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

/**
 * @namespace adp.extension.controllers
 */
export default class AddFragment extends Controller {
    /**
     * Runtime control managed object
     */
    public runtimeControl: ManagedObject;
    /**
     * JSON Model that has the data
     */
    public model: JSONModel;
    /**
     * Dialog instance
     */
    public dialog: Dialog;
    /**
     * Runtime Authoring
     */
    public rta: RuntimeAuthoring;
    /**
     * Controll Overlays
     */
    public overlays: UI5Element[];
    /**
     * RTA Command Executor
     */
    private commandExecutor: CommandExecutor;

    /**
     * Initializes controller, fills model with data and opens the dialog
     */
    async onInit() {
        this.model = new JSONModel();
        this.commandExecutor = new CommandExecutor(this.rta);

        this.dialog = (await this.loadFragment({ name: 'adp.extension.ui.AddFragment' })) as Dialog;

        await this.buildDialogData(this.overlays, this.model);

        this.getView()?.addDependent(this.dialog).setModel(this.model);

        this.dialog.open();
    }

    /**
     * Handles the change in aggregations
     *
     * @param event Event
     */
    onAggregationChanged(event: Event) {
        let selectedItem = '';
        const source = event.getSource() as ExtendedEventProvider;
        if (source.getSelectedItem()) {
            selectedItem = source.getSelectedItem().getText();
        }
        const selectedKey = source.getSelectedKey();

        this.model.setProperty('/selectedAggregation/key', selectedKey);
        this.model.setProperty('/selectedAggregation/value', selectedItem);

        let newSelectedControlChildren: string[] | number[] = Object.keys(
            ControlUtils.getControlAggregationByName(this.runtimeControl, selectedItem)
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
        const source = event.getSource() as ExtendedEventProvider;
        const selectedIndex = source.getSelectedItem().getText();
        this.model.setProperty('/selectedIndex', parseInt(selectedIndex));
    }

    /**
     * Handles fragment name input change
     *
     * @param event Event
     */
    onFragmentNameInputChange(event: Event) {
        const source = event.getSource() as ExtendedEventProvider;
        const fragmentName: string = source.getValue().trim();
        const fragmentList: { fragmentName: string }[] = this.model.getProperty(
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
                this.dialog.getBeginButton().setEnabled(false);
                this.model.setProperty('/fragmentNameToCreate', null);
                break;
            case fragmentName.length <= 0:
                this.dialog.getBeginButton().setEnabled(false);
                source.setValueState(ValueState.None);
                this.model.setProperty('/fragmentNameToCreate', null);
                break;
            case !/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(fragmentName):
                source.setValueState(ValueState.Error);
                source.setValueStateText('A Fragment Name cannot contain white spaces or special characters.');
                this.dialog.getBeginButton().setEnabled(false);
                this.model.setProperty('/fragmentNameToCreate', null);
                break;
            case fragmentName.length > 0:
                this.dialog.getBeginButton().setEnabled(true);
                source.setValueState(ValueState.None);
                this.model.setProperty('/fragmentNameToCreate', fragmentName);
                break;
            default:
                break;
        }
    }

    /**
     * Handles create button press
     *
     * @param event Event
     */
    async onCreateBtnPress(event: Event) {
        const source = event.getSource() as ExtendedEventProvider;
        source.setEnabled(false);
        // Need to create a new fragment and a respective change file
        const fragmentNameToCreate = this.model.getProperty('/fragmentNameToCreate');
        const fragmentData = {
            fragmentName: fragmentNameToCreate,
            index: this.model.getProperty('/selectedIndex'),
            targetAggregation: this.model.getProperty('/selectedAggregation/value')
        };
        await this.createNewFragment(fragmentData);

        this.handleDialogClose();
    }

    /**
     * Handles the closing of the dialog
     */
    closeDialog() {
        this.handleDialogClose();
    }

    /**
     * Handles the dialog closing and destruction of it
     */
    private handleDialogClose() {
        this.dialog.close();
        this.getView()?.destroy();
    }

    /**
     * Builds data that is used in the dialog
     *
     * @param overlays Overlays
     * @param jsonModel JSON Model for the dialog
     */
    public async buildDialogData(overlays: UI5Element[], jsonModel: JSONModel): Promise<void> {
        const selectorId = overlays[0].getId();

        let control: BuiltRuntimeControl;
        let controlMetadata: ManagedObjectMetadata;

        const overlayControl = sap.ui.getCore().byId(selectorId) as unknown as ElementOverlay;
        if (overlayControl) {
            this.runtimeControl = ControlUtils.getRuntimeControl(overlayControl);
            controlMetadata = this.runtimeControl.getMetadata();
            control = await ControlUtils.buildControlData(this.runtimeControl, overlayControl);
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
        const defaultAggregation = this.runtimeControl.getMetadata().getDefaultAggregationName();
        const selectedControlName = control.name;

        let selectedControlChildren: string[] | number[] = Object.keys(
            ControlUtils.getControlAggregationByName(this.runtimeControl, defaultAggregation)
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

        const designMetadata = OverlayRegistry.getOverlay(this.runtimeControl as UI5Element).getDesignTimeMetadata();

        const modifiedValue = {
            fragment:
                "<!-- Use stable and unique IDs!-->\n<core:FragmentDefinition xmlns:core='sap.ui.core' xmlns='sap.m'>\n\t<!--  add your xml here -->\n</core:FragmentDefinition>",
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
