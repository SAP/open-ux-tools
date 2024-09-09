import {
    setAppMode,
    setUndoRedoEnablement,
    setSaveEnablement,
    undo,
    redo,
    save,
    ExternalAction
} from '@sap-ux-private/control-property-editor-common';
import { ActionSenderFunction, SubscribeFunction } from './types';
import RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

/**
 * A Class of RtaService
 */
export class RtaService {
    /**
     *
     * @param options ui5 adaptation options.
     */
    constructor(private readonly rta: RuntimeAuthoring) {}

    /**
     * Initializes rta service.
     *
     * @param sendAction action sender function
     * @param subscribe subscriber function
     */
    public init(sendAction: ActionSenderFunction, subscribe: SubscribeFunction): void {
        subscribe(async (action): Promise<void> => {
            if (setAppMode.match(action)) {
                this.rta.setMode(action.payload);
            }
            if (undo.match(action)) {
                this.rta.undo();
            }
            if (redo.match(action)) {
                this.rta.redo();
            }

            if (save.match(action)) {
                if (this.rta.save) {
                    // v1.107.x and above
                    this.rta.save();
                } else {
                    // v1.71.x and above
                    this.rta?._serializeToLrep();
                }
            }
            return Promise.resolve();
        });
        this.rta.attachModeChanged(modeAndStackChangeHandler(sendAction, this.rta));
    }
}

export function modeAndStackChangeHandler(sendAction: (action: ExternalAction) => void, rta: RuntimeAuthoring) {
    return () => {
        const canUndo = rta.canUndo();
        const canRedo = rta.canRedo();
        const saveAllowed = rta?.canSave ? rta?.canSave() : canUndo; /* canSave v1.112.x and above only*/
        sendAction(setUndoRedoEnablement({ canUndo, canRedo }));
        sendAction(setSaveEnablement(saveAllowed));
    };
}
