import type {
    ExternalAction,
    SavedPropertyChange,
    PendingPropertyChange,
    UnknownSavedChange
} from '@sap-ux-private/control-property-editor-common';
import {
    changeProperty,
    changeStackModified,
    deletePropertyChanges,
    propertyChangeFailed,
    FlexChangesEndPoints
} from '@sap-ux-private/control-property-editor-common';
import { applyChange } from './flex-change';
import type { SelectionService } from '../selection';

import type { ActionSenderFunction, SubscribeFunction, UI5AdaptationOptions } from '../types';
import type Event from 'sap/ui/base/Event';
import type BaseCommand from 'sap/ui/rta/command/BaseCommand';
import Log from 'sap/base/Log';

interface ChangeContent {
    property: string;
    newValue: string;
    newBinding: string;
}

interface ChangeSelector {
    id: string;
    type: string;
}

interface Change {
    fileName: string;
    controlId: string;
    propertyName: string;
    value: string;
    timestamp: string;
    selector: ChangeSelector;
    content: ChangeContent;
    creation: string;
}

type Properties<T extends object> = { [K in keyof T]-?: K extends string ? K : never }[keyof T];
/**
 * Assert change for its validity. Throws error if no value found in saved changes.
 *
 * @param properties array of property name
 * @param target object which will be checked
 */
function assertProperties<T extends object>(properties: Properties<T>[], target: T): void {
    for (const property of properties) {
        const value = target[property];
        if (value === null || value === undefined) {
            throw new Error(`Invalid change, missing ${property} in the change file`);
        }
    }
}

/**
 * Assert change for its validity. Throws error if no value found in saved changes.
 *
 * @param change Change object
 */
function assertChange(change: Change): void {
    assertProperties(['fileName', 'selector', 'content', 'creation'], change);
    assertProperties(['id'], change.selector);
    assertProperties(['property'], change.content);
}

/**
 * Modify rta message.
 *
 * @param errorMessage error message to be replaced
 * @param id - control id
 * @param type - control type
 * @returns string
 */
function modifyRTAErrorMessage(errorMessage: string, id: string, type: string): string {
    return errorMessage.replace('Error: Applying property changes failed:', '').replace(`${type}#${id}`, '');
}

/**
 * A Class of ChangeService
 */
export class ChangeService {
    private savedChanges: SavedPropertyChange[] = [];
    /**
     *
     * @param options ui5 adaptation options.
     * @param ui5 facade for ui5 framework methods.
     * @param selectionService selection service instance.
     */
    constructor(
        private readonly options: UI5AdaptationOptions,
        private readonly selectionService: SelectionService
    ) {}

    /**
     *
     * @param sendAction action sender function
     * @param subscribe subscriber function
     */
    public async init(sendAction: ActionSenderFunction, subscribe: SubscribeFunction): Promise<void> {
        subscribe(async (action): Promise<void> => {
            if (changeProperty.match(action)) {
                try {
                    this.selectionService.applyControlPropertyChange(
                        action.payload.controlId,
                        action.payload.propertyName
                    );
                    await applyChange(this.options, action.payload);
                } catch (exception) {
                    // send error information
                    let name = '';
                    const id = action.payload.controlId || '';
                    const control = sap.ui.getCore().byId(id);
                    if (control) {
                        name = control.getMetadata().getName();
                    }
                    const modifiedMessage = modifyRTAErrorMessage(exception?.toString(), id, name);
                    const errorMessage =
                        modifiedMessage || `RTA Exception applying expression "${action.payload.value}"`;
                    const propertyChangeFailedAction = propertyChangeFailed({ ...action.payload, errorMessage });
                    sendAction(propertyChangeFailedAction);
                }
            } else if (deletePropertyChanges.match(action)) {
                await this.deleteChange(action.payload.controlId, action.payload.propertyName, action.payload.fileName);
            }
        });

        const savedChangesResponse = await fetch(FlexChangesEndPoints.changes + `?_=${Date.now()}`);
        const savedChanges = await savedChangesResponse.json();
        const changes = (
            Object.keys(savedChanges ?? {})
                .map((key): SavedPropertyChange | UnknownSavedChange | undefined => {
                    const change: Change = savedChanges[key];
                    try {
                        assertChange(change);
                        if (
                            [change.content.newValue, change.content.newBinding].every(
                                (item) => item === undefined || item === null
                            )
                        ) {
                            throw new Error('Invalid change, missing new value in the change file');
                        }
                        return {
                            type: 'saved',
                            kind: 'valid',
                            fileName: change.fileName,
                            controlId: change.selector.id,
                            propertyName: change.content.property,
                            value: change.content.newValue ?? change.content.newBinding,
                            timestamp: new Date(change.creation).getTime(),
                            controlName: change.selector.type.split('.').pop()
                        };
                    } catch (error) {
                        // Gracefully handle change files with invalid content
                        if (change.fileName) {
                            const unknownChange: UnknownSavedChange = {
                                type: 'saved',
                                kind: 'unknown',
                                fileName: change.fileName
                            };
                            if (change.creation) {
                                unknownChange.timestamp = new Date(change.creation).getTime();
                            }
                            return unknownChange;
                        }
                        return undefined;
                    }
                })
                .filter((change) => !!change) as SavedPropertyChange[]
        ).sort((a, b) => b.timestamp - a.timestamp);
        this.savedChanges = changes;
        sendAction(
            changeStackModified({
                saved: changes,
                pending: []
            })
        );
        this.options.rta.attachUndoRedoStackModified(this.createOnStackChangeHandler(sendAction));
    }

    /**
     *
     * @param controlId unique identifier for a control
     * @param propertyName name of the property change to be deleted
     * @param fileName name of the file.
     */
    public async deleteChange(controlId: string, propertyName: string, fileName?: string): Promise<void> {
        const filesToDelete = this.savedChanges
            .filter((change) =>
                fileName
                    ? fileName === change.fileName
                    : change.controlId === controlId && change.propertyName === propertyName
            )
            .map((change) =>
                fetch(FlexChangesEndPoints.changes, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ fileName: change.fileName })
                })
            );

        await Promise.all(filesToDelete).catch((error) => Log.error(error));
    }

    /**
     * Handler for undo/redo stack change.
     *
     * @param sendAction send action method
     * @returns (event: sap.ui.base.Event) => void
     */
    private createOnStackChangeHandler(sendAction: (action: ExternalAction) => void): (event: Event) => void {
        return (): void => {
            const stack = this.options.rta.getCommandStack();
            const allCommands = stack.getCommands();
            const executedCommands = stack.getAllExecutedCommands();
            const inactiveCommandCount = allCommands.length - executedCommands.length;

            const activeChanges = allCommands
                .map((command: BaseCommand, i): PendingPropertyChange | undefined => {
                    let result: PendingPropertyChange | undefined;
                    try {
                        const selector = command.getProperty('selector');
                        const changeType = command.getProperty('changeType');
                        let value = '';
                        switch (changeType) {
                            case 'propertyChange':
                                value = command.getProperty('newValue');
                                break;
                            case 'propertyBindingChange':
                                value = command.getProperty('newBinding');
                                break;
                            default:
                                throw new Error(`Invalid changeType ${changeType}`);
                        }
                        result = {
                            type: 'pending',
                            controlId: selector.id,
                            propertyName: command.getProperty('propertyName'),
                            isActive: i >= inactiveCommandCount,
                            value,
                            controlName: command.getElement().getMetadata().getName().split('.').pop() ?? ''
                        };
                    } catch (error) {
                        Log.error('Failed: ', error);
                    }
                    return result;
                })
                .filter((change): boolean => !!change) as PendingPropertyChange[];
            sendAction(
                changeStackModified({
                    saved: this.savedChanges,
                    pending: activeChanges
                })
            );
        };
    }
}
