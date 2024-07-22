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
export type PropertyChangeType = 'propertyChange' | 'propertyBindingChange';
export interface PropertyChange<T extends PropertyValue = PropertyValue> {
    controlId: string;
    controlName: string;
    propertyName: string;
    value: T;
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

export type Scenario = (typeof SCENARIO)[keyof typeof SCENARIO];

interface ControlPropertyBase<T, V, E> {
    type: T;
    editor: E;
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

export interface PendingPropertyChange<T extends PropertyValue = PropertyValue> extends PropertyChange<T> {
    type: 'pending';
    /**
     * Indicates if change is before or after current position in undo redo stack
     */
    isActive: boolean;
    fileName: string;
}

export interface PendingOtherChange {
    type: 'pending';
    isActive: boolean;
    changeType: string;
    controlId: string;
    controlName: string;
    fileName: string;
}

export type PendingChange = PendingPropertyChange | PendingOtherChange;

export interface SavedPropertyChange<T extends PropertyValue = PropertyValue> extends PropertyChange<T> {
    type: 'saved';
    kind: 'valid';
    fileName: string;
    timestamp: number;
}

export interface UnknownSavedChange {
    type: 'saved';
    kind: 'unknown';
    fileName: string;
    controlId?: string;
    timestamp?: number;
}
export type ValidChange = PendingPropertyChange | SavedPropertyChange;
export type Change = ValidChange | UnknownSavedChange;

export interface ChangeStackModified {
    pending: PendingChange[];
    saved: SavedPropertyChange[];
}

export interface PropertyChangeDeletionDetails {
    controlId: string;
    propertyName: string;
    fileName?: string;
}

export interface ShowMessage {
    message: string;
    shouldHideIframe: boolean;
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
    return function createAction<T>(name: string) {
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
export const showMessage = createExternalAction<ShowMessage>('show-dialog-message');
export const reloadApplication = createExternalAction<void>('reload-application');
export const storageFileChanged = createExternalAction<string>('storage-file-changed');
export const setAppMode = createExternalAction<'navigation' | 'adaptation'>('set-app-mode');
export const setUndoRedoEnablement = createExternalAction<{ canRedo: boolean; canUndo: boolean }>(
    'set-undo-redo-enablement'
);
export const setSaveEnablement = createExternalAction<boolean>('set-save-enablement');
export const appLoaded = createExternalAction<void>('app-loaded');
export const undo = createExternalAction<void>('undo');
export const redo = createExternalAction<void>('redo');
export const save = createExternalAction<void>('save');

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
    | ReturnType<typeof showMessage>
    | ReturnType<typeof reloadApplication>
    | ReturnType<typeof storageFileChanged>
    | ReturnType<typeof setAppMode>
    | ReturnType<typeof setUndoRedoEnablement>
    | ReturnType<typeof setSaveEnablement>
    | ReturnType<typeof undo>
    | ReturnType<typeof redo>
    | ReturnType<typeof save>
    | ReturnType<typeof appLoaded>;
