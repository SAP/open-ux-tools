export interface Control {
    /**
     * unique identifier for a control
     */
    id: string;
    /**
     * control name
     */
    name: string;
    /**
     * control type
     */
    type: string;

    properties: ControlProperty[];
}
export type PropertyValue = string | boolean | number;
export type ConfigurationValue = PropertyValue | Record<string, unknown>;
export type PropertyChangeType = 'propertyChange' | 'propertyBindingChange';
export interface PropertyChange<T extends PropertyValue = PropertyValue> {
    controlId: string;
    controlName: string;
    propertyName: string;
    value: T;
    propertyType: PropertyType;
    changeType: PropertyChangeType;
}
export interface PropertyChanged<T extends PropertyValue = PropertyValue> {
    controlId: string;
    propertyName: string;
    newValue: T;
}

export interface PropertyChangeFailed {
    controlId: string;
    propertyName: string;
    errorMessage: string;
}

export const BOOLEAN_VALUE_TYPE = 'boolean';
export const INTEGER_VALUE_TYPE = 'integer';
export const FLOAT_VALUE_TYPE = 'float';
export const STRING_VALUE_TYPE = 'string';
export const INPUT_EDITOR_TYPE = 'input';
export const DROPDOWN_EDITOR_TYPE = 'dropdown';
export const CHECKBOX_EDITOR_TYPE = 'checkbox';

export const SCENARIO = {
    AppVariant: 'APP_VARIANT',
    VersionedAppVariant: 'VERSIONED_APP_VARIANT',
    AdaptationProject: 'ADAPTATION_PROJECT',
    FioriElementsFromScratch: 'FE_FROM_SCRATCH',
    UiAdaptation: 'UI_ADAPTATION'
} as const;

export enum PropertyType {
    Configuration = 'configuration',
    ControlProperty = 'controlProperty'
}

export type Scenario = (typeof SCENARIO)[keyof typeof SCENARIO];

interface ControlPropertyBase<T, V, E> {
    type: T;
    editor: E;
    propertyType: PropertyType;
    name: string;
    readableName: string;
    value: V | string; // string: expression binding
    isEnabled: boolean;
    isIcon?: boolean;
    label?: string;
    errorMessage?: string;
    ui5Type?: string;
    documentation?: {
        defaultValue: string;
        description: string;
        propertyName: string;
        type?: string;
        propertyType?: string;
    };
}

export type BooleanControlProperty = ControlPropertyBase<
    typeof BOOLEAN_VALUE_TYPE,
    boolean,
    typeof CHECKBOX_EDITOR_TYPE
>;

export type IntegerControlProperty = ControlPropertyBase<typeof INTEGER_VALUE_TYPE, number, typeof INPUT_EDITOR_TYPE>;

export type FloatControlProperty = ControlPropertyBase<typeof FLOAT_VALUE_TYPE, number, typeof INPUT_EDITOR_TYPE>;

export type StringControlProperty = ControlPropertyBase<typeof STRING_VALUE_TYPE, string, typeof INPUT_EDITOR_TYPE>;

export interface StringControlPropertyWithOptions
    extends ControlPropertyBase<typeof STRING_VALUE_TYPE, string, typeof DROPDOWN_EDITOR_TYPE> {
    options: { key: string; text: string }[];
}

export type ControlProperty =
    | BooleanControlProperty
    | IntegerControlProperty
    | FloatControlProperty
    | StringControlProperty
    | ControlPropertyBase<typeof STRING_VALUE_TYPE, string, 'unknown'>
    | StringControlPropertyWithOptions;

export interface OutlineNode {
    controlId: string;
    controlType: string; // as used in rta i.e sap.m.NavContainer
    name: string;
    visible: boolean;
    editable: boolean;
    children: OutlineNode[];
    icon?: string;
    hasDefaultContent?: boolean;
}

export interface IconDetails {
    name: string;
    content: string;
    fontFamily: string;
}

export const PENDING_CHANGE_TYPE = 'pending';
export const SAVED_CHANGE_TYPE = 'saved';
export const UNKNOWN_CHANGE_KIND = 'unknown';
export const GENERIC_CHANGE_KIND = 'generic';
export const CONTROL_CHANGE_KIND = 'control';
export interface PendingOtherChange {
    type: typeof PENDING_CHANGE_TYPE;
    kind: typeof UNKNOWN_CHANGE_KIND;
    isActive: boolean;
    title?: string;
    changeType: string;
    fileName: string;
}

export interface PendingControlChange {
    type: typeof PENDING_CHANGE_TYPE;
    kind: typeof CONTROL_CHANGE_KIND;
    isActive: boolean;
    changeType: string;
    controlId: string;
    fileName: string;
    title?: string;
}

export type PendingChange = PendingOtherChange | PendingControlChange | PendingGenericChange;
export type SavedChange = SavedControlChange | UnknownSavedChange | SavedGenericChange;

export interface UnknownSavedChange {
    type: typeof SAVED_CHANGE_TYPE;
    kind: typeof UNKNOWN_CHANGE_KIND;
    fileName: string;
    changeType: string;
    title?: string;
    controlId?: string;
    timestamp: number;
}

export interface PendingGenericChange {
    type: typeof PENDING_CHANGE_TYPE;
    kind: typeof GENERIC_CHANGE_KIND;
    title: string;
    isActive: boolean;
    fileName: string;
    changeType: string;
    controlId?: string | string[];
    subtitle?: string;
    controlName?: string;
    properties: {
        label: string;
        value?: PropertyValue;
        displayValueWithIcon?: boolean;
    }[];
}

export interface SavedGenericChange {
    type: typeof SAVED_CHANGE_TYPE;
    kind: typeof GENERIC_CHANGE_KIND;
    timestamp: number;
    fileName: string;
    title: string;
    controlId?: string | string[];
    subtitle?: string;
    controlName?: string;
    changeType: string;
    properties: {
        label: string;
        value?: PropertyValue;
        displayValueWithIcon?: boolean;
    }[];
}

export interface SavedControlChange {
    type: typeof SAVED_CHANGE_TYPE;
    kind: typeof CONTROL_CHANGE_KIND;
    controlId: string;
    fileName: string;
    changeType: string;
    title?: string;
    timestamp: number;
}

export type Change = PendingChange | SavedChange;

export interface ChangeStackModified {
    pending: PendingChange[];
    saved: SavedChange[];
}
export interface ChangeDeletionDetails {
    fileName?: string;
}
export interface PropertyChangeDeletionDetails extends ChangeDeletionDetails {
    controlId: string;
    propertyName: string;
}

export const SIMPLE_QUICK_ACTION_KIND = 'simple';
export interface SimpleQuickAction {
    kind: typeof SIMPLE_QUICK_ACTION_KIND;
    id: string;
    title: string;
    tooltip?: string;
    enabled: boolean;
}

export const NESTED_QUICK_ACTION_KIND = 'nested';
export interface NestedQuickAction {
    kind: typeof NESTED_QUICK_ACTION_KIND;
    id: string;
    title: string;
    tooltip?: string;
    enabled: boolean;
    children: NestedQuickActionChild[];
}

export interface NestedQuickActionChild {
    path: string;
    label: string;
    tooltip?: string;
    enabled: boolean;
    children: NestedQuickActionChild[];
}

export type QuickAction = SimpleQuickAction | NestedQuickAction;

export interface QuickActionGroup {
    title: string;
    actions: QuickAction[];
}
export interface SimpleQuickActionExecutionPayload {
    kind: typeof SIMPLE_QUICK_ACTION_KIND;
    id: string;
}

export interface NestedQuickActionExecutionPayload {
    kind: typeof NESTED_QUICK_ACTION_KIND;
    id: string;
    path: string;
}

export type QuickActionExecutionPayload = SimpleQuickActionExecutionPayload | NestedQuickActionExecutionPayload;

export interface InfoCenterMessage {
    type: MessageBarType;
    title: string;
    description: string;
    details?: string;
}

export enum MessageBarType {
    /** Info styled MessageBar */
    info = 0,
    /** Error styled MessageBar */
    error = 1,
    /** Warning styled MessageBar */
    warning = 5
}

export interface ContextMenuActionExecutionPayload {
    controlId: string;
    actionName: string;
}

/**
 * ACTIONS
 */

export interface PayloadAction<T extends string, U> {
    type: T;
    payload: U;
}

/**
 * Create matcher.
 *
 * @param type action type
 * @returns (value: { type: unknown } | undefined) => value is Y
 */
function createMatcher<Y extends { type: string }>(
    type: Y['type']
): (value: { type: unknown } | undefined) => value is Y {
    return function match(value: { type: unknown } | undefined): value is Y {
        return value?.type === type;
    };
}

/**
 * Create action factory.
 *
 * @param prefix to determine ext action
 * @returns Function
 */
function createActionFactory(prefix: string) {
    return function createAction<T>(name: string): {
        (payload: T): PayloadAction<string, T>;
        type: string;
        match: (
            value:
                | {
                      type: unknown;
                  }
                | undefined
        ) => value is PayloadAction<string, T>;
    } {
        const actionType = [prefix, name].join(' ');
        /**
         *
         * @param payload action payload
         * @returns PayloadAction<typeof actionType, T>
         */
        function action(payload: T): PayloadAction<typeof actionType, T> {
            return {
                type: actionType,
                payload
            };
        }

        action.type = actionType;
        action.match = createMatcher<PayloadAction<typeof actionType, T>>(actionType);
        return action;
    };
}

export interface ErrorAction<T extends string, U> extends PayloadAction<T, U> {
    error: { message: string };
    showMessage: boolean;
}
export const PENDING_SUFFIX = '<pending>';
export const FULFILLED_SUFFIX = '<fulfilled>';
export const REJECTED_SUFFIX = '<rejected>';

/**
 * Factory for creating  request response actions.
 *
 * @param prefix action prefix
 * @returns Function
 */
export function createAsyncActionFactory(prefix: string) {
    return function createAction<T, F = T, R = T>(
        name: string
    ): { pending: typeof pending; fulfilled: typeof fulfilled; rejected: typeof rejected } {
        const pendingType = [prefix, name, PENDING_SUFFIX].join(' ');

        /**
         * Pending action.
         *
         * @param payload action payload
         * @returns PayloadAction<typeof pendingType, T>
         */
        function pending(payload: T): PayloadAction<typeof pendingType, T> {
            return {
                type: pendingType,
                payload
            };
        }

        pending.type = pendingType;
        pending.match = createMatcher<PayloadAction<typeof pendingType, T>>(pendingType);
        const fulfilledType = [prefix, name, FULFILLED_SUFFIX].join(' ');

        /**
         * Fulfill action.
         *
         * @param payload action payload
         * @returns PayloadAction<typeof fulfilledType, F>
         */
        function fulfilled(payload: F): PayloadAction<typeof fulfilledType, F> {
            return {
                type: fulfilledType,
                payload
            };
        }

        fulfilled.type = fulfilledType;
        fulfilled.match = createMatcher<PayloadAction<typeof fulfilledType, F>>(fulfilledType);
        const rejectedType = [prefix, name, REJECTED_SUFFIX].join(' ');
        /**
         * Reject action.
         *
         * @param message error message
         * @param payload R
         * @returns ErrorAction<typeof rejectedType, F>
         */
        function rejected(message: string, payload: R): ErrorAction<typeof rejectedType, R> {
            return {
                type: rejectedType,
                payload,
                error: {
                    message
                },
                showMessage: true
            };
        }
        rejected.type = rejectedType;
        rejected.match = createMatcher<PayloadAction<typeof rejectedType, T>>(rejectedType);

        return {
            pending,
            fulfilled,
            rejected
        };
    };
}

export const EXTERNAL_ACTION_PREFIX = '[ext]';

const createExternalAction = createActionFactory(EXTERNAL_ACTION_PREFIX);

export const iconsLoaded = createExternalAction<IconDetails[]>('icons-loaded');
export const controlSelected = createExternalAction<Control>('control-selected');
export const selectControl = createExternalAction<string>('select-control');
export const addExtensionPoint = createExternalAction<OutlineNode>('add-extension-point');
export const deletePropertyChanges = createExternalAction<PropertyChangeDeletionDetails>('delete-property-changes');
export const outlineChanged = createExternalAction<OutlineNode[]>('outline-changed');
export const changeProperty = createExternalAction<PropertyChange>('change-property');
export const propertyChanged = createExternalAction<PropertyChanged>('property-changed');
export const propertyChangeFailed = createExternalAction<PropertyChangeFailed>('change-property-failed');
export const changeStackModified = createExternalAction<ChangeStackModified>('change-stack-modified');
export const toggleAppPreviewVisibility = createExternalAction<boolean>('toggle-app-preview-visibility');
export const reloadApplication = createExternalAction<{
    save?: boolean;
}>('reload-application');
export const storageFileChanged = createExternalAction<string>('storage-file-changed');
export const setAppMode = createExternalAction<'navigation' | 'adaptation'>('set-app-mode');
export const applicationModeChanged = createExternalAction<'navigation' | 'adaptation'>('application-mode-changed');
export const setUndoRedoEnablement = createExternalAction<{ canRedo: boolean; canUndo: boolean }>(
    'set-undo-redo-enablement'
);
export const setSaveEnablement = createExternalAction<boolean>('set-save-enablement');
export const appLoaded = createExternalAction<void>('app-loaded');
export const undo = createExternalAction<void>('undo');
export const redo = createExternalAction<void>('redo');
export const save = createExternalAction<void>('save');
export const quickActionListChanged = createExternalAction<QuickActionGroup[]>('quick-action-list-changed');
export const updateQuickAction = createExternalAction<QuickAction>('update-quick-action');
export const executeQuickAction = createExternalAction<QuickActionExecutionPayload>('execute-quick-action');
export const executeContextMenuAction =
    createExternalAction<ContextMenuActionExecutionPayload>('execute-context-menu-action');
export const setApplicationRequiresReload = createExternalAction<boolean>('set-application-requires-reload');
export const externalFileChange = createExternalAction<string>('external-file-change');
export const showInfoCenterMessage = createExternalAction<InfoCenterMessage>('show-info-center-message');

const createAsyncExternalAction = createAsyncActionFactory(EXTERNAL_ACTION_PREFIX);

interface ContextMenuItem {
    id: string;
    enabled: boolean;
    title: string;
    tooltip?: string;
}

export interface ContextMenu {
    controlId: string;
    contextMenuItems: ContextMenuItem[];
}

export const requestControlContextMenu = createAsyncExternalAction<string, ContextMenu>('request-control-context-menu');

export type ExternalAction =
    | ReturnType<typeof iconsLoaded>
    | ReturnType<typeof controlSelected>
    | ReturnType<typeof deletePropertyChanges>
    | ReturnType<typeof changeProperty>
    | ReturnType<typeof propertyChanged>
    | ReturnType<typeof outlineChanged>
    | ReturnType<typeof selectControl>
    | ReturnType<typeof addExtensionPoint>
    | ReturnType<typeof propertyChangeFailed>
    | ReturnType<typeof changeStackModified>
    | ReturnType<typeof toggleAppPreviewVisibility>
    | ReturnType<typeof reloadApplication>
    | ReturnType<typeof storageFileChanged>
    | ReturnType<typeof setAppMode>
    | ReturnType<typeof applicationModeChanged>
    | ReturnType<typeof setUndoRedoEnablement>
    | ReturnType<typeof setSaveEnablement>
    | ReturnType<typeof undo>
    | ReturnType<typeof redo>
    | ReturnType<typeof save>
    | ReturnType<typeof appLoaded>
    | ReturnType<typeof quickActionListChanged>
    | ReturnType<typeof setApplicationRequiresReload>
    | ReturnType<typeof updateQuickAction>
    | ReturnType<typeof executeQuickAction>
    | ReturnType<typeof showInfoCenterMessage>
    | ReturnType<typeof externalFileChange>
    | ReturnType<typeof executeContextMenuAction>
    | ReturnType<typeof requestControlContextMenu.fulfilled>;
