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
    FlexChangesEndPoints,
    reloadApplication,
    setApplicationRequiresReload,
    save
} from '@sap-ux-private/control-property-editor-common';
import { applyChange } from './flex-change';
import type { SelectionService } from '../selection';

import type { ActionSenderFunction, SubscribeFunction, UI5AdaptationOptions } from '../types';
import type Event from 'sap/ui/base/Event';
import type FlexCommand from 'sap/ui/rta/command/FlexCommand';
import Log from 'sap/base/Log';
import { modeAndStackChangeHandler } from '../rta-service';
import { getError } from '../../utils/error';
import MessageToast from 'sap/m/MessageToast';
import { getTextBundle } from '../../i18n';

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

type SavedChangesResponse = Record<string, Change>;

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
    private changesRequiringReload = 0;
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

                    const error = getError(exception);
                    // eslint-disable-next-line  @typescript-eslint/no-unsafe-call
                    const modifiedMessage = modifyRTAErrorMessage(error.toString(), id, name);
                    const errorMessage =
                        modifiedMessage || `RTA Exception applying expression "${action.payload.value}"`;
                    const propertyChangeFailedAction = propertyChangeFailed({ ...action.payload, errorMessage });
                    sendAction(propertyChangeFailedAction);
                }
            } else if (deletePropertyChanges.match(action)) {
                await this.deleteChange(action.payload.controlId, action.payload.propertyName, action.payload.fileName);
            } else if (reloadApplication.match(action)) {
                this.sendAction(setApplicationRequiresReload(false));
            } else if (save.match(action)) {
                this.changesRequiringReload = 0;
                this.sendAction(setApplicationRequiresReload(false));
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
        const savedChanges = (await savedChangesResponse.json()) as SavedChangesResponse;
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
                            kind: 'property',
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
                                changeType: change.changeType,
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

        await Promise.all(filesToDelete).catch((error) => Log.error(getError(error).message));

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
        const handleStackChange = modeAndStackChangeHandler(this.sendAction, this.options.rta);
        return async (): Promise<void> => {
            const stack = this.options.rta.getCommandStack();
            const allCommands = stack.getCommands();
            const executedCommands = stack.getAllExecutedCommands();
            const inactiveCommandCount = allCommands.length - executedCommands.length;
            let activeChanges: PendingChange[] = [];
            allCommands.forEach((command: FlexCommand, i): void => {
                try {
                    if (typeof command.getCommands === 'function') {
                        const subCommands = command.getCommands();
                        subCommands.forEach((subCommand) => {
                            const pendingChange = this.prepareChangeType(subCommand, inactiveCommandCount, i);
                            if (pendingChange) {
                                activeChanges.push(pendingChange);
                            }
                        });
                    } else {
                        const pendingChange = this.prepareChangeType(command, inactiveCommandCount, i);
                        if (pendingChange) {
                            activeChanges.push(pendingChange);
                        }
                    }
                } catch (error) {
                    Log.error('CPE: Change creation Failed', getError(error));
                }
            });

            activeChanges = activeChanges.filter((change): boolean => !!change);
            const changesRequiringReload = activeChanges.reduce(
                (sum, change) => (change.changeType === 'appdescr_fe_changePageConfiguration' ? sum + 1 : sum),
                0
            );
            if (changesRequiringReload > this.changesRequiringReload) {
                const resourceBundle = await getTextBundle();
                MessageToast.show(resourceBundle.getText('CPE_CHANGES_VISIBLE_AFTER_SAVE_AND_RELOAD_MESSAGE'), {
                    duration: 8000
                });
                this.sendAction(setApplicationRequiresReload(changesRequiringReload > 0));
            }
            this.changesRequiringReload = changesRequiringReload;

            if (Array.isArray(allCommands) && allCommands.length === 0) {
                await this.fetchSavedChanges();
            }

            this.updateStack(activeChanges);
            handleStackChange();
        };
    }

    private prepareChangeType(
        command: FlexCommand,
        inactiveCommandCount: number,
        index: number
    ): PendingChange | undefined {
        let result: PendingChange;
        let value = '';
        const selectorId = this.getCommandSelectorId(command);
        const changeType = this.getCommandChangeType(command);

        if (!selectorId || !changeType) {
            return undefined;
        }

        switch (changeType) {
            case 'propertyChange':
                value = command.getProperty('newValue') as string;
                break;
            case 'propertyBindingChange':
                value = command.getProperty('newBinding') as string;
                break;
        }
        const { fileName } = command.getPreparedChange().getDefinition();
        if (changeType === 'propertyChange' || changeType === 'propertyBindingChange') {
            result = {
                type: 'pending',
                kind: 'property',
                changeType,
                controlId: selectorId,
                propertyName: command.getProperty('propertyName') as string,
                isActive: index >= inactiveCommandCount,
                value,
                controlName: command.getElement().getMetadata().getName().split('.').pop() ?? '',
                fileName
            };
        } else {
            result = {
                type: 'pending',
                kind: 'unknown',
                controlId: selectorId,
                changeType,
                isActive: index >= inactiveCommandCount,
                controlName:
                    changeType === 'addXMLAtExtensionPoint'
                        ? command.getSelector().name ?? ''
                        : command.getElement().getMetadata().getName().split('.').pop() ?? '',
                fileName
            };
        }

        return result;
    }

    /**
     * Retry operations.
     *
     * @param operations to be executed
     * @returns first successfull operation result or undefined
     */
    private retryOperations<T>(operations: Array<() => T>): T | undefined {
        for (const operation of operations) {
            try {
                const result = operation();
                if (!result) {
                    continue;
                }
                return result;
            } catch (error) {
                Log.error('Retry operation failed:', getError(error));
                continue;
            }
        }
        return undefined;
    }

    /**
     * Get command change type.
     *
     * @param command to be executed for creating change
     * @returns command change type or undefined
     */
    private getCommandChangeType(command: FlexCommand): string | undefined {
        return this.retryOperations([
            () => command.getChangeType(),
            () => command.getPreparedChange().getDefinition().changeType
        ]);
    }

    /**
     * Get command selector id.
     *
     * @param command to be executed for creating change
     * @returns command selector id or undefined
     */
    private getCommandSelectorId(command: FlexCommand): string | undefined {
        return this.retryOperations([
            () => command.getSelector().id,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            () => command.getElement().getProperty('persistencyKey'),
            () => command.getElement().getId(),
            () => command.getParent()?.getElement().getId()
        ]) as string | undefined;
    }
}
