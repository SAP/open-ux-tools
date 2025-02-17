import type {
    ExternalAction,
    PendingChange,
    SavedPropertyChange,
    UnknownSavedChange,
    SavedControlChange,
    PendingConfigurationChange,
    SavedConfigurationChange,
    ConfigurationValue
} from '@sap-ux-private/control-property-editor-common';
import {
    changeProperty,
    changeStackModified,
    deletePropertyChanges,
    propertyChangeFailed,
    FlexChangesEndPoints,
    reloadApplication,
    setApplicationRequiresReload,
    save,
    CONFIGURATION_CHANGE_KIND,
    PropertyType,
    PENDING_CHANGE_TYPE,
    PROPERTY_CHANGE_KIND,
    UNKNOWN_CHANGE_KIND
} from '@sap-ux-private/control-property-editor-common';
import { applyChange } from './flex-change';
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
import { getControlById, isA } from '../../utils/core';
import UI5Element from 'sap/ui/core/Element';
import { getConfigMapControlIdMap } from '../../utils/fe-v4';

const TITLE_MAP: { [key: string]: string } = {
    appdescr_app_addAnnotationsToOData: 'Add New Annotation File'
};

interface ChangeContent {
    property: string;
    newValue: string;
    newBinding: string;
}
export const STACK_CHANGE_EVENT = 'STACK_CHANGED';
export interface StackChangedEventDetail {
    controls: UI5Element[];
}

interface ConfigurationChangeContent {
    page: string;
    entityPropertyChange: {
        propertyPath: string;
        operation: 'UPSERT' | 'DELETE' | 'INSERT' | 'UPDATE';
        propertyValue: string;
    };
}

interface ChangeSelector {
    id: string;
    type: string;
}

interface BaseChange {
    fileName: string;
    timestamp: string;
    creation: string;
    value: string;
    selector: ChangeSelector;
}

const PROPERTY_CHANGE = 'propertyChange';
const PROPERTY_BINDING_CHANGE = 'propertyBindingChange';
const MANIFEST_V4_CHANGE = 'appdescr_fe_changePageConfiguration';

interface PropertyChange extends BaseChange {
    changeType: typeof PROPERTY_CHANGE | typeof PROPERTY_BINDING_CHANGE;
    controlId: string;
    propertyName: string;
    content: ChangeContent;
}
interface ConfigChange extends BaseChange {
    changeType: typeof MANIFEST_V4_CHANGE;
    propertyName: string;
    content: ConfigurationChangeContent;
}

type SavedChangesResponse = Record<string, PropertyChange | ConfigChange>;

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
function assertChange(change: PropertyChange): void {
    assertProperties(['fileName', 'selector', 'content', 'creation'], change);
    assertProperties(['id'], change.selector);
    assertProperties(['property'], change.content);
}

/**
 * Assert v4 manifest change for its validity. Throws error if no value found in saved changes.
 *
 * @param change Change object
 */
function assertManifestChange(change: ConfigChange): void {
    assertProperties(['fileName', 'content', 'creation'], change);
    assertProperties(['page', 'entityPropertyChange'], change.content);
    assertProperties(['propertyPath', 'operation', 'propertyValue'], change.content.entityPropertyChange);
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
 * Returns a shortened version of the given configuration path segments by removing excess segments,
 * leaving only the most relevant parts for display. For example, the configuration path
 * `controlConfiguration/com.sap.UI.v1.LineItem/tableSettings` will be shortened to
 * `LineItem/tableSettings`.
 *
 * @param propertyPathSeg string[]
 * @returns string
 */
function getCompactV4ConfigPath(propertyPathSeg: string[]): string {
    return propertyPathSeg.join('/').replace(/^controlConfiguration\/(?:([^/]+\/))?@[^/]+\.v1\./, '$1');
}

/**
 * A Class of ChangeService
 */
export class ChangeService extends EventTarget {
    private savedChanges:
        | SavedPropertyChange[]
        | UnknownSavedChange[]
        | SavedControlChange[]
        | SavedConfigurationChange[] = [];
    private changesRequiringReload = 0;
    private sendAction: (action: ExternalAction) => void;
    private pendingChanges: PendingChange[] = [];
    private changedFiles: Record<string, object> = {};
    private readonly eventStack: object[] = [];
    private pendingConfigChangeMap: Map<string, PendingConfigurationChange[]> = new Map();
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

    private getSavedConfigurationChange(change: ConfigChange): SavedConfigurationChange {
        assertManifestChange(change);
        if ([change.content.entityPropertyChange.propertyValue].every((item) => item === undefined || item === null)) {
            throw new Error('Invalid change, missing property value on change file');
        }
        const propertyPathSegments = change.content.entityPropertyChange.propertyPath.split('/');
        const propertyName = propertyPathSegments.pop();
        const configMapKey = getConfigMapControlIdMap(change.content.page, propertyPathSegments);
        const controlIds = this.configPropertyControlIdMap?.get(configMapKey) || [];
        return {
            type: 'saved',
            kind: 'configuration',
            fileName: change.fileName,
            controlIds,
            propertyPath: getCompactV4ConfigPath(propertyPathSegments) || change.content.page,
            propertyName: propertyName ?? '',
            value: change.content.entityPropertyChange.propertyValue,
            timestamp: new Date(change.creation).getTime()
        };
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
                        ): Promise<
                            | SavedPropertyChange
                            | UnknownSavedChange
                            | SavedControlChange
                            | SavedConfigurationChange
                            | undefined
                        > => {
                            const change: PropertyChange | ConfigChange = savedChanges[key];
                            let selectorId;
                            try {
                                if (change.changeType === MANIFEST_V4_CHANGE) {
                                    return this.getSavedConfigurationChange(change);
                                } else {
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
                                }
                            } catch (error) {
                                // Gracefully handle change files with invalid content
                                const title = TITLE_MAP[change.changeType] ?? '';
                                if (change.fileName) {
                                    this.changedFiles[change.fileName] = change;
                                    const unknownChange: UnknownSavedChange = {
                                        type: 'saved',
                                        kind: 'unknown',
                                        changeType: change.changeType,
                                        fileName: change.fileName,
                                        timestamp: new Date(change.creation).getTime(),
                                        ...(title && { title })
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
            const resourceBundle = await getTextBundle();
            const eventIndex = this.eventStack.indexOf(event);
            if (this.eventStack.length - 1 === eventIndex) {
                this.pendingChanges = pendingChanges.filter((change): boolean => !!change);
                const changesRequiringReload = this.pendingChanges.reduce(
                    (sum, change) =>
                        change.kind === CONFIGURATION_CHANGE_KIND ||
                        change.changeType === 'appdescr_ui_generic_app_changePageConfiguration' ||
                        change.changeType === 'appdescr_app_addAnnotationsToOData'
                            ? sum + 1
                            : sum,
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
                this.pendingConfigChangeMap = new Map();
                await this.fetchSavedChanges();
            }

            // Notify to update the ui for configuration changes.
            const configurationChanges = this.pendingChanges?.filter((item) => item.kind === 'configuration');
            if (configurationChanges.length) {
                const stackChangeEvent = new CustomEvent(STACK_CHANGE_EVENT, {
                    detail: {
                        controls: configurationChanges.reduce((acc: UI5Element[], item) => {
                            const controls = (item.controlIds || [])
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
        return (pendingChanges || []).find((item) => item.isActive && item.propertyName === propertyName)?.value;
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
        const pendingChange = await this.prepareChangeType(command, inactiveCommandCount, index);
        if (pendingChange) {
            pendingChanges.push(pendingChange);
        }
    }

    private prepareV4ConfigurationChange(
        command: FlexCommand,
        value: ConfigurationValue,
        fileName: string,
        index: number,
        inactiveCommandCount: number
    ): PendingConfigurationChange {
        const { entityPropertyChange, page } = command.getProperty('parameters') as {
            entityPropertyChange: {
                propertyPath: string;
            };
            page: string;
        };
        const controlId = this.getCommandSelectorId(command) ?? '';
        const propertyPathSegments = entityPropertyChange.propertyPath.split('/');
        const propName = propertyPathSegments.pop() as string;
        const key = getConfigMapControlIdMap(page, propertyPathSegments);

        const isActive = index >= inactiveCommandCount;
        const controlIds = this.configPropertyControlIdMap?.get(key) || [controlId];
        const result: PendingConfigurationChange = {
            type: PENDING_CHANGE_TYPE,
            kind: CONFIGURATION_CHANGE_KIND,
            controlIds,
            propertyPath: getCompactV4ConfigPath(propertyPathSegments) || page,
            propertyName: propName,
            isActive,
            value,
            fileName
        };
        for (const id of result.controlIds) {
            if (!this.pendingConfigChangeMap.get(id)) {
                this.pendingConfigChangeMap.set(id, []);
            }
            const pendingChanges = this.pendingConfigChangeMap.get(id);
            pendingChanges?.push(result);
        }

        return result;
    }

    private prepareV2ConfigurationChange(
        command: FlexCommand,
        fileName: string,
        index: number,
        inactiveCommandCount: number
    ): PendingConfigurationChange {
        const { entityPropertyChange, page } = command.getProperty('parameters') as {
            entityPropertyChange: {
                propertyPath: string;
                propertyValue: Record<string, string>;
            };
            page: string;
        };
        const propertyPathSegments = entityPropertyChange.propertyPath.split('/');
        const propertyName =
            Object.keys(entityPropertyChange.propertyValue)?.[0] ??
            propertyPathSegments[propertyPathSegments.length - 1];
        const propertyValue = entityPropertyChange.propertyValue?.[propertyName] ?? entityPropertyChange.propertyValue;
        const controlId = this.getCommandSelectorId(command) ?? '';

        const key = getConfigMapControlIdMap(page, propertyPathSegments);

        const isActive = index >= inactiveCommandCount;
        const controlIds = this.configPropertyControlIdMap?.get(key) || [controlId];

        const result: PendingConfigurationChange = {
            type: PENDING_CHANGE_TYPE,
            kind: CONFIGURATION_CHANGE_KIND,
            controlIds,
            propertyPath: getCompactV4ConfigPath(propertyPathSegments) || page,
            propertyName,
            isActive,
            value: propertyValue,
            fileName
        };
        for (const id of result.controlIds) {
            if (!this.pendingConfigChangeMap.get(id)) {
                this.pendingConfigChangeMap.set(id, []);
            }
            const pendingChanges = this.pendingConfigChangeMap.get(id);
            pendingChanges?.push(result);
        }

        return result;
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

        const selectorId =
            typeof change?.getSelector === 'function'
                ? await this.getControlIdByChange(change)
                : this.getCommandSelectorId(command);

        const changeType = this.getCommandChangeType(command);

        if (!changeType) {
            return undefined;
        }

        const { fileName } = change.getDefinition ? change.getDefinition() : (change.getJson() as { fileName: string });
        if ((changeType === 'propertyChange' || changeType === 'propertyBindingChange') && selectorId) {
            let value = '';
            switch (changeType) {
                case 'propertyChange':
                    value = command.getProperty('newValue') as string;
                    break;
                case 'propertyBindingChange':
                    value = command.getProperty('newBinding') as string;
                    break;
            }

            return {
                type: PENDING_CHANGE_TYPE,
                kind: PROPERTY_CHANGE_KIND,
                changeType,
                controlId: selectorId,
                propertyType: PropertyType.ControlProperty,
                propertyName: command.getProperty('propertyName') as string,
                isActive: index >= inactiveCommandCount,
                value,
                controlName: command.getElement().getMetadata().getName().split('.').pop() ?? '',
                fileName
            };
        } else if (changeType === 'appdescr_fe_changePageConfiguration') {
            const value = (
                command.getProperty('parameters') as { entityPropertyChange: { propertyValue: ConfigurationValue } }
            ).entityPropertyChange.propertyValue;
            return this.prepareV4ConfigurationChange(command, value, fileName, index, inactiveCommandCount);
        } else if (changeType === 'appdescr_ui_generic_app_changePageConfiguration') {
            return this.prepareV2ConfigurationChange(command, fileName, index, inactiveCommandCount);
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

            if (typeof changeHandlerAPI?.getChangeHandler !== 'function') {
                return selector.id;
            }

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
            if (change.kind !== 'unknown' && change.kind !== 'configuration') {
                const flexObject = await this.getFlexObject(this.changedFiles[change.fileName]);
                change.controlId = (await this.getControlIdByChange(flexObject)) ?? '';
            }
        }
        this.updateStack();
    }

    public onStackChange(handler: (event: CustomEvent<StackChangedEventDetail>) => void | Promise<void>): void {
        this.addEventListener(STACK_CHANGE_EVENT, handler as EventListener);
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
