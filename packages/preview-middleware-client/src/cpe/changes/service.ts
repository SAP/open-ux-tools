import type {
    ExternalAction,
    PendingChange,
    SavedPropertyChange,
    UnknownSavedChange,
    SavedControlChange
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
import JsControlTreeModifier from 'sap/ui/core/util/reflection/JsControlTreeModifier';
import FlexChange from 'sap/ui/fl/Change';
import { getError } from '../../utils/error';
import { isLowerThanMinimalUi5Version, getUi5Version } from '../../utils/version';
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
    private savedChanges: SavedPropertyChange[] | UnknownSavedChange[] | SavedControlChange[] = [];
    private changesRequiringReload = 0;
    private sendAction: (action: ExternalAction) => void;
    private pendingChanges: PendingChange[] = [];
    private changedFiles: Record<string, object> = {};
    private readonly eventStack: object[] = [];
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
    private updateStack() {
        this.sendAction(
            changeStackModified({
                saved: this.savedChanges ?? [],
                pending: this.pendingChanges ?? []
            })
        );
    }

    /**
     * Fetches saved changes from the workspace and sorts them.
     */
    private async fetchSavedChanges(): Promise<void> {
        this.changedFiles = {};
        const savedChangesResponse = await fetch(FlexChangesEndPoints.changes + `?_=${Date.now()}`);
        const savedChanges = (await savedChangesResponse.json()) as SavedChangesResponse;
        const changes = (
            (
                await Promise.all(
                    Object.keys(savedChanges ?? {}).map(
                        async (
                            key
                        ): Promise<SavedPropertyChange | UnknownSavedChange | SavedControlChange | undefined> => {
                            const change: Change = savedChanges[key];
                            let selectorId;
                            try {
                                const flexObject = await this.getFlexObject(change);
                                selectorId = await this.getControlIdByChange(flexObject);
                                assertChange(change);
                                if (
                                    [change.content.newValue, change.content.newBinding].every(
                                        (item) => item === undefined || item === null
                                    )
                                ) {
                                    throw new Error('Invalid change, missing new value in the change file');
                                }
                                if (
                                    change.changeType !== 'propertyChange' &&
                                    change.changeType !== 'propertyBindingChange'
                                ) {
                                    throw new Error('Unknown Change Type');
                                }
                                this.changedFiles[change.fileName] = change;
                                return {
                                    type: 'saved',
                                    kind: 'property',
                                    fileName: change.fileName,
                                    controlId: selectorId,
                                    propertyName: change.content.property,
                                    value: change.content.newValue ?? change.content.newBinding,
                                    timestamp: new Date(change.creation).getTime(),
                                    controlName: change.selector.type
                                        ? (change.selector.type.split('.').pop() as string)
                                        : '',
                                    changeType: change.changeType
                                } as SavedPropertyChange;
                            } catch (error) {
                                // Gracefully handle change files with invalid content
                                if (change.fileName) {
                                    this.changedFiles[change.fileName] = change;
                                    const unknownChange: UnknownSavedChange = {
                                        type: 'saved',
                                        kind: 'unknown',
                                        changeType: change.changeType,
                                        fileName: change.fileName,
                                        timestamp: new Date(change.creation).getTime()
                                    };
                                    if (change.creation) {
                                        unknownChange.timestamp = new Date(change.creation).getTime();
                                    }
                                    if (selectorId) {
                                        const controlChange: SavedControlChange = {
                                            ...unknownChange,
                                            kind: 'control',
                                            controlId: selectorId
                                        };

                                        return controlChange;
                                    }
                                    return unknownChange;
                                }
                                return undefined;
                            }
                        }
                    )
                )
            ).filter((change) => !!change) as SavedPropertyChange[]
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
            .filter((change) => {
                if (fileName) {
                    return fileName === change.fileName;
                }

                if (change.kind === 'property') {
                    return change.controlId === controlId && change.propertyName === propertyName;
                }

                if (change.kind === 'control') {
                    return change.controlId === controlId;
                }
            })
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
        return async (event): Promise<void> => {
            const pendingChanges: PendingChange[] = [];
            this.eventStack.push(event);
            const stack = this.options.rta.getCommandStack();
            const allCommands = stack.getCommands();
            const executedCommands = stack.getAllExecutedCommands();
            const inactiveCommandCount = allCommands.length - executedCommands.length;
            let i: number, command: FlexCommand;
            for ([i, command] of allCommands.entries()) {
                try {
                    if (typeof command.getCommands === 'function') {
                        const subCommands = command.getCommands();
                        for (const subCommand of subCommands) {
                            await this.handleCommand(subCommand, inactiveCommandCount, i, pendingChanges);
                        }
                    } else {
                        await this.handleCommand(command, inactiveCommandCount, i, pendingChanges);
                    }
                } catch (error) {
                    Log.error('CPE: Change creation Failed', getError(error));
                }
            }
            const resourceBundle = await getTextBundle();
            const eventIndex = this.eventStack.indexOf(event);
            if (this.eventStack.length - 1 === eventIndex) {
                this.pendingChanges = pendingChanges.filter((change): boolean => !!change);
                const changesRequiringReload = this.pendingChanges.reduce(
                    (sum, change) => (change.changeType === 'appdescr_fe_changePageConfiguration' ? sum + 1 : sum),
                    0
                );
                if (changesRequiringReload > this.changesRequiringReload) {
                    MessageToast.show(resourceBundle.getText('CPE_CHANGES_VISIBLE_AFTER_SAVE_AND_RELOAD_MESSAGE'), {
                        duration: 8000
                    });
                    this.sendAction(setApplicationRequiresReload(changesRequiringReload > 0));
                }
                this.changesRequiringReload = changesRequiringReload;
            }
            this.eventStack.splice(eventIndex, 1);
            if (Array.isArray(allCommands) && allCommands.length === 0) {
                this.pendingChanges = [];
                await this.fetchSavedChanges();
            }
            this.updateStack();
            handleStackChange();
        };
    }

    private async handleCommand(
        command: FlexCommand,
        inactiveCommandCount: number,
        index: number,
        pendingChanges: PendingChange[]
    ): Promise<void> {
        const pendingChange = await this.prepareChangeType(command, inactiveCommandCount, index);
        if (pendingChange) {
            pendingChanges.push(pendingChange);
        }
    }

    private async prepareChangeType(
        command: FlexCommand,
        inactiveCommandCount: number,
        index: number
    ): Promise<PendingChange | undefined> {
        let result: PendingChange;
        let value = '';

        const change = command.getPreparedChange();

        const selectorId =
            typeof change.getSelector === 'function'
                ? await this.getControlIdByChange(change)
                : this.getCommandSelectorId(command);

        const changeType = this.getCommandChangeType(command);

        if (!changeType) {
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

        const { fileName } = change.getDefinition();
        if ((changeType === 'propertyChange' || changeType === 'propertyBindingChange') && selectorId) {
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
                changeType,
                isActive: index >= inactiveCommandCount,
                fileName
            };

            if (selectorId) {
                result = {
                    ...result,
                    kind: 'control',
                    controlId: selectorId
                };
            }
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

    /**
     * Get element id by change.
     *
     * @param change to be executed for creating change
     * @returns element id or empty string
     */
    private async getControlIdByChange(change: FlexChange<ChangeContent>): Promise<string | undefined> {
        const appComponent = this.options.rta.getRootControlInstance();
        const selector = typeof change.getSelector === 'function' ? change.getSelector() : undefined;
        const changeType = change.getChangeType();
        const layer = change.getLayer();

        if (!selector?.id) {
            return;
        }

        try {
            let control = JsControlTreeModifier.bySelector(selector, appComponent);
            if (!control) {
                return selector.id;
            }

            const changeHandlerAPI = (await import('sap/ui/fl/write/api/ChangesWriteAPI')).default;

            const changeHandler = await changeHandlerAPI.getChangeHandler({
                changeType,
                element: control,
                modifier: JsControlTreeModifier,
                layer
            });

            if (changeHandler && typeof changeHandler.getChangeVisualizationInfo === 'function') {
                const result: { affectedControls?: [string] } = await changeHandler.getChangeVisualizationInfo(
                    change,
                    appComponent
                );
                return JsControlTreeModifier.getControlIdBySelector(
                    result?.affectedControls?.[0] ?? selector,
                    appComponent
                );
            }

            return JsControlTreeModifier.getControlIdBySelector(selector, appComponent);
        } catch (error) {
            Log.error('Getting element ID from change has failed:', getError(error));
            return selector.id;
        }
    }

    /**
     * Sync outline changes to place modification markers when outline is changed.
     *
     * @returns void
     */
    public async syncOutlineChanges(): Promise<void> {
        for (const change of this.savedChanges) {
            if (change.kind !== 'unknown') {
                const flexObject = await this.getFlexObject(this.changedFiles[change.fileName]);
                change.controlId = (await this.getControlIdByChange(flexObject)) ?? '';
            }
        }
        this.updateStack();
    }

    /**
     * Get FlexObject from change object based on UI5 version.
     *
     * @param change change object
     * @returns FlexChange
     */
    private async getFlexObject(change: object): Promise<FlexChange<ChangeContent>> {
        if (isLowerThanMinimalUi5Version(await getUi5Version(), { major: 1, minor: 109 })) {
            const Change = (await import('sap/ui/fl/Change')).default;
            return new Change(change);
        }

        const FlexObjectFactory = (await import('sap/ui/fl/apply/_internal/flexObjects/FlexObjectFactory')).default;
        return FlexObjectFactory.createFromFileContent(change) as FlexChange<ChangeContent>;
    }
}
