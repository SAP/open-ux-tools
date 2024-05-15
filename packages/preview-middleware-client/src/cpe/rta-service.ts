import { appMode, rtaEventState, rtaEvent } from '@sap-ux-private/control-property-editor-common';
import { ActionSenderFunction, SubscribeFunction, UI5AdaptationOptions } from './types';
/**
 * A Class of RtaService
 */
export class RtaService {
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
                    if (this.options.rta.save) {
                        // v1.107.x and above
                        this.options.rta.save();
                    } else if ((this.options.rta as any)?._serializeToLrep) {
                        // v1.71.x
                        (this.options.rta as any)?._serializeToLrep();
                    }
                }
            }
        });
        this.options.rta.attachUndoRedoStackModified(async (): Promise<void> => {
            const canUndo = this.options.rta.canUndo();
            const canRedo = this.options.rta.canRedo();
            const canSave = this.options.rta?.canSave /* 1.112.x and above */ ? this.options.rta?.canSave() : canUndo;
            sendAction(rtaEventState({ undo: canUndo, redo: canRedo, save: canSave }));
        });
        this.options.rta.attachModeChanged(async (): Promise<void> => {
            const canUndo = this.options.rta.canUndo();
            const canRedo = this.options.rta.canRedo();
            const canSave = this.options.rta?.canSave ? this.options.rta?.canSave() : canUndo;
            sendAction(rtaEventState({ undo: canUndo, redo: canRedo, save: canSave }));
        });
    }
}
