import { ExternalAction, appMode, rtaEventState, rtaEvent } from '@sap-ux-private/control-property-editor-common';
import { ActionSenderFunction, SubscribeFunction, UI5AdaptationOptions } from './types';
import type AppLifeCycle from 'sap/ushell/services/AppLifeCycle';
import { init, initializeRta } from '../flp/init';
import Event from 'sap/ui/base/Event';
import EventProvider from 'sap/ui/base/EventProvider';
import Stack from 'sap/ui/rta/command/Stack';

const oTempCommandStack: any[] = [];
let oCommandStack: any;
/**
 * A Class of RtaService
 */
export class RtaService {
    private sendAction: (action: ExternalAction) => void;
    /**
     *
     * @param options ui5 adaptation options.
     */
    constructor(private readonly options: UI5AdaptationOptions) {}

    /**
     * Initializes rta service.
     *
     * @param sendAction action sender function
     * @param subscribe subscriber function
     */
    public async init(sendAction: ActionSenderFunction, subscribe: SubscribeFunction): Promise<void> {
        this.sendAction = sendAction;
        subscribe(async (action): Promise<void> => {
            if (appMode.match(action)) {
                // Option 1
                this.options.rta.setMode(action.payload);
            }
            if (rtaEvent.match(action)) {
                if (action.payload === 'undo') {
                    this.options.rta.undo();
                } else if (action.payload === 'redo') {
                    this.options.rta.redo();
                } else if (action.payload === 'save') {
                    if ((this.options.rta as any)?._serializeAndSave) {
                        (this.options.rta as any)?._serializeAndSave();
                    } else {
                        this.options.rta.save();
                    }
                }
            }
        });
        this.options.rta.attachUndoRedoStackModified(async (): Promise<void> => {
            const canUndo = this.options.rta.canUndo();
            const canRedo = this.options.rta.canRedo();
            const canSave = canUndo; // this.options.rta.canSave() (to find alternative for older versions); 
            sendAction(rtaEventState({ undo: canUndo, redo: canRedo, save: canSave }));
        });
        this.options.rta.attachModeChanged(async (): Promise<void> => {
            const canUndo = this.options.rta.canUndo();
            const canRedo = this.options.rta.canRedo();
            const canSave = canUndo; // this.options.rta.canSave();
            sendAction(rtaEventState({ undo: canUndo, redo: canRedo, save: canSave }));
        });
    }
}
