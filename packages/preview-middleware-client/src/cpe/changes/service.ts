import type {
    ConfigurationValue,
    ExternalAction,
    PendingChange,
    PendingGenericChange,
    SavedChange,
    SavedControlChange,
    SavedGenericChange,
    UnknownSavedChange
} from '@sap-ux-private/control-property-editor-common';
import {
    changeProperty,
    changeStackModified,
    deletePropertyChanges,
    FlexChangesEndPoints,
    GENERIC_CHANGE_KIND,
    MessageBarType,
    PENDING_CHANGE_TYPE,
    propertyChangeFailed,
    reloadApplication,
    save,
    setApplicationRequiresReload,
    UNKNOWN_CHANGE_KIND
} from '@sap-ux-private/control-property-editor-common';
import Log from 'sap/base/Log';
import type Event from 'sap/ui/base/Event';
import UI5Element from 'sap/ui/core/Element';
import { ChangeDefinition } from 'sap/ui/fl/Change';
import type FlexCommand from 'sap/ui/rta/command/FlexCommand';
import { getTextBundle } from '../../i18n';
import { setAdditionalChangeInfo } from '../../utils/additional-change-info';
import { getControlById, isA } from '../../utils/core';
import { getError } from '../../utils/error';
import { sendInfoCenterMessage } from '../../utils/info-center-message';
import { modeAndStackChangeHandler } from '../rta-service';
import type { ActionSenderFunction, SubscribeFunction, UI5AdaptationOptions } from '../types';
import { applyChange } from './flex-change';
import {
    ChangeHandler,
    ChangeType,
    ConfigChange,
    GENERIC_CHANGE_HANDLER,
    getControlIdByChange,
    getFlexObject,
    type GenericChange
} from './generic-change';

const TITLE_MAP: { [key: string]: string } = {
    appdescr_app_addAnnotationsToOData: 'Add New Annotation File'
};

export const STACK_CHANGE_EVENT = 'STACK_CHANGED';
export interface StackChangedEventDetail {
    controls: UI5Element[];
}

type SavedChangesResponse = Record<string, ConfigChange | GenericChange>;

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
export class ChangeService extends EventTarget {
    private savedChanges: SavedChange[] = [];
    private changesRequiringReload = 0;
    private sendAction: (action: ExternalAction) => void;
    private pendingChanges: PendingChange[] = [];
    private changedFiles: Record<string, object> = {};
    private readonly eventStack: object[] = [];
    private pendingConfigChangeMap: Map<string, PendingGenericChange[]> = new Map();
    private configPropertyControlIdMap: Map<string, string[]> = new Map();
    /**
     *
     * @param options ui5 adaptation options.
     * @param ui5 facade for ui5 framework methods.
     * @param selectionService selection service instance.
     */
    constructor(private readonly options: UI5AdaptationOptions) {
        super();
    }

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
                    await sendInfoCenterMessage({
                        title: { key: 'CHANGE_CREATION_FAILED_TITLE' },
                        description: errorMessage,
                        type: MessageBarType.error
                    });
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

    private isGenericChange(change: GenericChange): change is GenericChange {
        return (
            change.changeType === 'appdescr_app_addAnnotationsToOData' ||
            change.changeType === 'rename' ||
            change.changeType === 'moveControls' ||
            change.changeType === 'addXML' ||
            change.changeType === 'propertyChange' ||
            change.changeType === 'propertyBindingChange' ||
            change.changeType === 'appdescr_fe_changePageConfiguration' ||
            change.changeType === 'appdescr_ui_generic_app_changePageConfiguration'
        );
    }

    /**
     * Fetches saved changes from the workspace and sorts them.
     */
    private async fetchSavedChanges(): Promise<void> {
        this.changedFiles = {};
        const savedChangesResponse = await fetch(FlexChangesEndPoints.changes + `?_=${Date.now()}`);
        const savedChanges = (await savedChangesResponse.json()) as SavedChangesResponse;
        const textBundle = await getTextBundle();
        const changes = (
            await Promise.all(
                Object.keys(savedChanges ?? {}).map(
                    async (key): Promise<UnknownSavedChange | SavedControlChange | SavedGenericChange | undefined> => {
                        const change = savedChanges[key];
                        try {
                            const handler = GENERIC_CHANGE_HANDLER[
                                change.changeType
                            ] as unknown as ChangeHandler<GenericChange>;
                            if (this.isGenericChange(change)) {
                                const {
                                    properties,
                                    changeTitle,
                                    controlId,
                                    changeType: type,
                                    subtitle
                                } = await handler(change as unknown as GenericChange, {
                                    textBundle,
                                    appComponent: this.options.rta.getRootControlInstance(),
                                    configPropertyControlIdMap: this.configPropertyControlIdMap
                                });
                                this.changedFiles[change.fileName] = change;
                                return {
                                    kind: GENERIC_CHANGE_KIND,
                                    type: 'saved',
                                    fileName: change.fileName,
                                    ...(subtitle && { subtitle }),
                                    changeType: type ?? change.changeType,
                                    timestamp: new Date(change.creation).getTime(),
                                    ...(controlId && { controlId }),
                                    properties,
                                    title: textBundle.getText(changeTitle)
                                };
                            }
                            throw new Error('Unknown change type');
                        } catch (error) {
                            // Gracefully handle change files with invalid content
                            const flexObject = await getFlexObject(change);
                            const selectorId = await getControlIdByChange(
                                flexObject,
                                this.options.rta.getRootControlInstance()
                            );
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
        )
            .filter((change) => !!change)
            .sort((a, b) => b.timestamp - a.timestamp);
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

                if (change.kind === 'control') {
                    return change.controlId === controlId;
                }
                return false;
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
            const allCommandsFlattened = allCommands.flatMap((command: FlexCommand) =>
                typeof command.getCommands === 'function' ? command.getCommands() : [command]
            );
            const activeCommandCount = allCommandsFlattened.length - executedCommands.length;
            this.pendingConfigChangeMap = new Map();
            let i = 0;
            for (const command of allCommands) {
                try {
                    if (typeof command.getCommands === 'function') {
                        const subCommands = command.getCommands();
                        for (const subCommand of subCommands) {
                            await this.handleCommand(subCommand, activeCommandCount, i, pendingChanges);
                            i++;
                        }
                    } else {
                        await this.handleCommand(command, activeCommandCount, i, pendingChanges);
                        i++;
                    }
                } catch (error) {
                    Log.error('CPE: Change creation Failed', getError(error));
                }
            }
            const eventIndex = this.eventStack.indexOf(event);
            if (this.eventStack.length - 1 === eventIndex) {
                this.pendingChanges = pendingChanges.filter((change): boolean => !!change);
                const changesRequiringReload = this.pendingChanges.reduce(
                    (sum, change) => (isGenericConfigChange(change) ? sum + 1 : sum),
                    0
                );
                if (changesRequiringReload > this.changesRequiringReload) {
                    await sendInfoCenterMessage({
                        title: { key: 'CHANGES_VISIBLE_AFTER_SAVE_AND_RELOAD_TITLE' },
                        description: { key: 'CHANGES_VISIBLE_AFTER_SAVE_AND_RELOAD_DESCRIPTION' },
                        type: MessageBarType.info
                    });
                    this.sendAction(setApplicationRequiresReload(changesRequiringReload > 0));
                }
                this.changesRequiringReload = changesRequiringReload;
            }
            this.eventStack.splice(eventIndex, 1);
            if (Array.isArray(allCommands) && allCommands.length === 0) {
                this.pendingChanges = [];
                this.pendingConfigChangeMap = new Map();
                await this.fetchSavedChanges();
            }

            // Notify to update the ui for configuration changes.
            const configurationChanges: PendingGenericChange[] = this.pendingChanges?.filter(isGenericConfigChange);
            if (configurationChanges.length) {
                const stackChangeEvent = new CustomEvent(STACK_CHANGE_EVENT, {
                    detail: {
                        controls: configurationChanges.reduce((acc: UI5Element[], item) => {
                            const controls = ([...(item.controlId ?? [])] as string[])
                                .map((id: string) => {
                                    return getControlById(id);
                                })
                                .filter((ui5Element) => isA<UI5Element>('sap.ui.core.Element', ui5Element));
                            acc.push(...controls);
                            return acc;
                        }, [])
                    }
                });
                this.dispatchEvent(stackChangeEvent);
            }
            this.updateStack();
            handleStackChange();
        };
    }
    /**
     * Cached configuration commands to set reset value during stack change event.
     *
     * @param  controlId - control id of the config property.
     * @param  propertyName - config property name.
     * @returns Configuration property value.
     */
    public getConfigurationPropertyValue(controlId: string, propertyName: string): ConfigurationValue | undefined {
        const pendingChanges = this.pendingConfigChangeMap?.get(controlId);
        return (pendingChanges || []).find((item) => item.isActive && item.properties[0].label === propertyName)
            ?.properties[0].value;
    }

    /**
     * Update config changes with associated controls.
     *
     * @param {Map<string, string[]>} configPropertyControlIdMap - config property path control id map.
     */
    public async updateConfigurationProps(configPropertyControlIdMap: Map<string, string[]>): Promise<void> {
        this.configPropertyControlIdMap = configPropertyControlIdMap;
        await this.fetchSavedChanges();
        this.updateStack();
    }

    /**
     * Handles a command by preparing a pending change and adding it to the list of pending changes.
     *
     * @param {FlexCommand} command - The command to process.
     * @param {number} inactiveCommandCount - The number of inactive commands.
     * @param {number} index - The index of the current command being processed.
     * @param {PendingChange[]} pendingChanges - The list of pending changes to update.
     * @returns {Promise<void>} A promise that resolves when the command is handled.
     */
    private async handleCommand(
        command: FlexCommand,
        inactiveCommandCount: number,
        index: number,
        pendingChanges: PendingChange[]
    ): Promise<void> {
        setAdditionalChangeInfo(command?.getPreparedChange?.());
        const pendingChange = await this.prepareChangeType(command, inactiveCommandCount, index);
        if (pendingChange) {
            pendingChanges.push(pendingChange);
        }
    }

    private trackPendingConfigChanges(result: PendingGenericChange): void {
        for (const id of result?.controlId ?? []) {
            if (!this.pendingConfigChangeMap.get(id)) {
                this.pendingConfigChangeMap.set(id, []);
            }
            const pendingChanges = this.pendingConfigChangeMap.get(id);
            pendingChanges?.push(result);
        }
    }

    /**
     * Prepares the type of change based on the command and other parameters.
     *
     * @param {FlexCommand} command - The command to process.
     * @param {number} inactiveCommandCount - The number of inactive commands.
     * @param {number} index - The index of the current command being processed.
     * @returns {Promise<PendingChange | undefined>} - A promise that resolves to a `PendingChange` or `undefined`.
     */
    private async prepareChangeType(
        command: FlexCommand,
        inactiveCommandCount: number,
        index: number
    ): Promise<PendingChange | undefined> {
        const change = command?.getPreparedChange?.();
        const textBundle = await getTextBundle();
        const selectorId =
            typeof change?.getSelector === 'function'
                ? await getControlIdByChange(change, this.options.rta.getRootControlInstance())
                : this.getCommandSelectorId(command);

        const changeType = this.getCommandChangeType(command);

        if (!changeType) {
            return undefined;
        }

        const changeDefinition = change.getDefinition ? change.getDefinition() : (change.getJson() as ChangeDefinition);
        const { fileName } = changeDefinition;
        const handler = GENERIC_CHANGE_HANDLER[changeType as ChangeType] as unknown as ChangeHandler<GenericChange>;
        if (handler) {
            const {
                properties,
                changeTitle,
                controlId,
                changeType: type,
                subtitle
            } = await handler(changeDefinition as unknown as GenericChange, {
                textBundle,
                appComponent: this.options.rta.getRootControlInstance(),
                configPropertyControlIdMap: this.configPropertyControlIdMap
            });
            const genericChange: PendingGenericChange = {
                kind: GENERIC_CHANGE_KIND,
                type: 'pending',
                changeType: type ?? changeType,
                ...(subtitle && { subtitle }),
                isActive: index >= inactiveCommandCount,
                title: textBundle.getText(changeTitle),
                fileName,
                ...(controlId && { controlId }),
                properties
            };
            if (changeType === 'appdescr_fe_changePageConfiguration') {
                this.trackPendingConfigChanges(genericChange);
            }
            return genericChange;
        } else {
            const title = TITLE_MAP[changeType] ?? '';
            let result: PendingChange = {
                type: PENDING_CHANGE_TYPE,
                kind: UNKNOWN_CHANGE_KIND,
                ...(title && { title }),
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
            return result;
        }
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
                continue;
            }
        }
        Log.error('All retry operations failed');
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
     * Sync outline changes to place modification markers when outline is changed.
     *
     * @returns void
     */
    public async syncOutlineChanges(): Promise<void> {
        for (const change of this.savedChanges) {
            if (change.kind !== 'unknown' && change.changeType !== 'configuration') {
                const flexObject = await getFlexObject(this.changedFiles[change.fileName]);
                change.controlId =
                    (await getControlIdByChange(flexObject, this.options.rta.getRootControlInstance())) ?? '';
            }
        }
        this.updateStack();
    }

    public onStackChange(handler: (event: CustomEvent<StackChangedEventDetail>) => void | Promise<void>): void {
        this.addEventListener(STACK_CHANGE_EVENT, handler as EventListener);
    }
}

function isGenericConfigChange(change: PendingChange): change is PendingGenericChange {
    return change.kind === GENERIC_CHANGE_KIND && change.changeType === 'configuration';
}
