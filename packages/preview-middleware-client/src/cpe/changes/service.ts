import type {
    ExternalAction,
    PendingChange,
    SavedPropertyChange,
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
    changeType: string;
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
    private sendAction: (action: ExternalAction) => void;
    /**
     *
     * @param options ui5 adaptation options.
     * @param ui5 facade for ui5 framework methods.
     * @param selectionService selection service instance.
     */
    constructor(private readonly options: UI5AdaptationOptions, private readonly selectionService: SelectionService) {}

    /**
     * Initializes change service.
     *
     * @param sendAction action sender function
     * @param subscribe subscriber function
     */
    public async init(sendAction: ActionSenderFunction, subscribe: SubscribeFunction): Promise<void> {
        this.sendAction = sendAction;
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

        await this.fetchSavedChanges();
        this.updateStack();

        this.options.rta.attachUndoRedoStackModified(this.createOnStackChangeHandler());
    }

    /**
     * Send update to the editor with modified stack.
     *
     * @param pendingChanges Changes that are waiting to be saved
     */
    private updateStack(pendingChanges: PendingChange[] = []) {
        this.sendAction(
            changeStackModified({
                saved: this.savedChanges,
                pending: pendingChanges
            })
        );
    }

    /**
     * Fetches saved changes from the workspace and sorts them.
     */
    private async fetchSavedChanges(): Promise<void> {
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
                        if (change.changeType !== 'propertyChange' && change.changeType !== 'propertyBindingChange') {
                            throw new Error('Unknown Change Type');
                        }
                        return {
                            type: 'saved',
                            kind: 'valid',
                            fileName: change.fileName,
                            controlId: change.selector.id,
                            propertyName: change.content.property,
                            value: change.content.newValue ?? change.content.newBinding,
                            timestamp: new Date(change.creation).getTime(),
                            controlName: change.selector.type ? (change.selector.type.split('.').pop() as string) : '',
                            changeType: change.changeType
                        };
                    } catch (error) {
                        // Gracefully handle change files with invalid content
                        if (change.fileName) {
                            const unknownChange: UnknownSavedChange = {
                                type: 'saved',
                                kind: 'unknown',
                                fileName: change.fileName,
                                controlId: change.selector?.id // some changes may not have selector
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

        await this.fetchSavedChanges();
        this.updateStack();
    }

    /**
     * Handler for undo/redo stack change.
     *
     * @param sendAction send action method
     * @returns (event: sap.ui.base.Event) => Promise<void>
     */
    private createOnStackChangeHandler(): (event: Event) => Promise<void> {
        return async (): Promise<void> => {
            const stack = this.options.rta.getCommandStack();
            const allCommands = stack.getCommands();
            const executedCommands = stack.getAllExecutedCommands();
            const inactiveCommandCount = allCommands.length - executedCommands.length;
            let activeChanges: PendingChange[] = [];
            allCommands.forEach((command: BaseCommand, i): void => {
                try {
                    if (typeof command.getCommands === 'function') {
                        const subCommands = command.getCommands();
                        subCommands.forEach((command) => {
                            activeChanges.push(this.prepareChangeType(command, inactiveCommandCount, i));
                        });
                    } else {
                        activeChanges.push(this.prepareChangeType(command, inactiveCommandCount, i));
                    }
                } catch (error) {
                    Log.error('CPE: Change creation Failed', error);
                }
            });

            activeChanges = activeChanges.filter((change): boolean => !!change);

            if (Array.isArray(allCommands) && allCommands.length === 0) {
                await this.fetchSavedChanges();
            }

            this.updateStack(activeChanges);
        };
    }

    private prepareChangeType(command: BaseCommand, inactiveCommandCount: number, index: number): PendingChange {
        let result: PendingChange;
        let value = '';
        const selector = command.getSelector();
        const changeType = command.getChangeType();
        switch (changeType) {
            case 'propertyChange':
                value = command.getProperty('newValue');
                break;
            case 'propertyBindingChange':
                value = command.getProperty('newBinding');
                break;
        }
        if (changeType === 'propertyChange' || changeType === 'propertyBindingChange') {
            result = {
                type: 'pending',
                changeType,
                controlId: selector.id,
                propertyName: command.getProperty('propertyName'),
                isActive: index >= inactiveCommandCount,
                value,
                controlName: command.getElement().getMetadata().getName().split('.').pop() ?? ''
            };
        } else {
            result = {
                type: 'pending',
                controlId: selector.id,
                changeType,
                isActive: index >= inactiveCommandCount,
                controlName: command.getElement().getMetadata().getName().split('.').pop() ?? ''
            };
        }

        return result;
    }
}
