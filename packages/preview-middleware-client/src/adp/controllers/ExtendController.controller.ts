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
import type { ControllersResponse, FragmentsResponse } from '../api-handler';
import ControlUtils, { type BuiltRuntimeControl } from '../control-utils';
import { getFragments, getManifestAppdescr, readControllers, writeFragment } from '../api-handler';

type ExtendedEventProvider = EventProvider & {
    setEnabled: (v: boolean) => void;
    getValue: () => string;
    getSelectedItem: () => {
        getTitle: () => string;
        getText: () => string;
        getCustomData: () => {
            [key: string]: () => void;
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
 * @namespace open.ux.preview.client.adp.controllers
 */
export default class ExtendController extends Controller {
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
     * RTA Command Executor
     */
    private commandExecutor: CommandExecutor;

    /**
     * Initializes controller, fills model with data and opens the dialog
     */
    async onInit() {
        this.model = new JSONModel();
        this.commandExecutor = new CommandExecutor(this.rta);

        this.dialog = (await this.loadFragment({ name: 'open.ux.preview.client.adp.ui.ExtendController' })) as Dialog;

        await this.buildDialogData();

        this.getView()?.addDependent(this.dialog).setModel(this.model);

        this.dialog.open();
    }

    /**
     * Handles fragment name input change
     *
     * @param event Event
     */
    onControllerNameInputChange(event: Event) {
        const source = event.getSource() as ExtendedEventProvider;
        const controllerName: string = source.getValue().trim();
        const controllerList: { controllerName: string }[] = this.model.getProperty('/controllersList');

        const iExistingFileIndex = controllerList.findIndex((f: { controllerName: string }) => {
            return f.controllerName === `${controllerName}.js`;
        });

        switch (true) {
            case iExistingFileIndex >= 0:
                source.setValueState(ValueState.Error);
                source.setValueStateText(
                    'Enter a different name. The controller name that you entered already exists in your project.'
                );
                this.dialog.getBeginButton().setEnabled(false);
                this.model.setProperty('/newControllerName', null);
                break;
            case controllerName.length <= 0:
                this.dialog.getBeginButton().setEnabled(false);
                source.setValueState(ValueState.None);
                this.model.setProperty('/newControllerName', null);
                break;
            case !/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(controllerName):
                source.setValueState(ValueState.Error);
                source.setValueStateText('A Fragment Name cannot contain white spaces or special characters.');
                this.dialog.getBeginButton().setEnabled(false);
                this.model.setProperty('/newControllerName', null);
                break;
            case controllerName.length > 0:
                this.dialog.getBeginButton().setEnabled(true);
                source.setValueState(ValueState.None);
                this.model.setProperty('/newControllerName', controllerName);
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
        const controllerNameToCreate = this.model.getProperty('/newControllerName');
        // const fragmentData = {
        //     fragmentName: fragmentNameToCreate,
        //     index: this.model.getProperty('/selectedIndex'),
        //     targetAggregation: this.model.getProperty('/selectedAggregation/value')
        // };
        // await this.createNewFragment(fragmentData);

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
    public async buildDialogData(): Promise<void> {
        try {
            const { controllers } = await readControllers<ControllersResponse>();
            this.model.setProperty('/controllersList', controllers);
        } catch (e) {
            MessageToast.show(e.message);
            throw new Error(e.message);
        }
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
    }
}
