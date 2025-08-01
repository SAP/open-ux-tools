import type { PayloadAction, SliceCaseReducers } from '@reduxjs/toolkit';
import { createSlice, createAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';

import type {
    Control,
    ContextMenu,
    IconDetails,
    InfoCenterMessage,
    OutlineNode,
    PendingChange,
    PendingControlChange,
    PropertyChange,
    QuickActionGroup,
    SavedChange,
    SavedControlChange,
    Scenario,
    PendingGenericChange,
    SavedGenericChange
} from '@sap-ux-private/control-property-editor-common';
import {
    setApplicationRequiresReload,
    changeStackModified,
    controlSelected,
    iconsLoaded,
    outlineChanged,
    propertyChanged,
    propertyChangeFailed,
    SCENARIO,
    reloadApplication,
    storageFileChanged,
    setAppMode,
    setUndoRedoEnablement,
    setSaveEnablement,
    appLoaded,
    updateQuickAction,
    quickActionListChanged,
    applicationModeChanged,
    MessageBarType,
    UNKNOWN_CHANGE_KIND,
    SAVED_CHANGE_TYPE,
    PENDING_CHANGE_TYPE,
    requestControlContextMenu,
    showInfoCenterMessage,
    GENERIC_CHANGE_KIND,
    toggleAppPreviewVisibility
} from '@sap-ux-private/control-property-editor-common';
import { DeviceType } from './devices';

export interface SliceState {
    deviceType: DeviceType;
    scale: number;

    /**
     * If set to true on resize the preview will be scaled to fit available space
     */
    fitPreview?: boolean;
    selectedControl: Control | undefined;
    outline: OutlineNode[];
    filterQuery: FilterOptions[];
    scenario: Scenario;
    isAdpProject: boolean;
    icons: IconDetails[];
    features: Record<string, boolean>;
    changes: ChangesSlice;
    isAppPreviewVisible: boolean;
    fileChanges?: string[];
    lastExternalFileChangeTimestamp?: number;
    appMode: 'navigation' | 'adaptation';
    changeStack: {
        canUndo: boolean;
        canRedo: boolean;
    };
    canSave: boolean;
    applicationRequiresReload: boolean;
    isAppLoading: boolean;
    quickActions: QuickActionGroup[];
    infoCenterMessages: InfoCenterItem[];
    contextMenu: ContextMenu | undefined;
}

export interface ChangesSlice {
    controls: ControlChanges;
    pending: PendingChange[];
    saved: SavedChange[];
    pendingChangeIds: string[];
}
export interface ControlChanges {
    [id: string]: ControlChangeStats;
}

export interface ControlChangeStats {
    controlName?: string;
    pending: number;
    saved: number;
    properties: PropertyChanges;
}

export interface PropertyChanges {
    [id: string]: PropertyChangeStats;
}
export interface PropertyChangeStats {
    pending: number;
    saved: number;
    lastSavedChange?: SavedGenericChange;
    lastChange?: PendingGenericChange;
}

export const enum FilterName {
    focusEditable = 'focus-editable-controls',
    focusCommonlyUsed = 'focus-commonly-used-controls',
    query = 'query',
    changeSummaryFilterQuery = 'change-summary-filter-query',
    showEditableProperties = 'show-editable-properties'
}
export interface FilterOptions {
    name: FilterName;
    value: string | boolean;
}
const filterInitOptions: FilterOptions[] = [
    { name: FilterName.focusEditable, value: true },
    { name: FilterName.focusCommonlyUsed, value: true },
    { name: FilterName.query, value: '' },
    { name: FilterName.changeSummaryFilterQuery, value: '' },
    { name: FilterName.showEditableProperties, value: true }
];

export interface InfoCenterItem {
    message: InfoCenterMessage;
    id: string;
    expandable?: boolean;
}

export const changeProperty = createAction<PropertyChange, 'app/change-property'>('app/change-property');
export const changePreviewScale = createAction<number>('app/change-preview-scale');
export const changePreviewScaleMode = createAction<'fit' | 'fixed'>('app/change-preview-scale-mode');
export const changeDeviceType = createAction<DeviceType>('app/change-device-type');
export const filterNodes = createAction<FilterOptions[]>('app/filter-nodes');
export const fileChanged = createAction<string[]>('app/file-changed');
export const setFeatureToggles = createAction<{ feature: string; isEnabled: boolean }[]>('app/set-feature-toggles');
interface LivereloadOptions {
    port: number;

    /**
     * Url used to connect to the livereload service. If provided, port option is ignored.
     */
    url?: string;
}
export const initializeLivereload = createAction<LivereloadOptions>('app/initialize-livereload');
export const clearInfoCenterMessage = createAction<string>('clear-info-center-message');
export const clearAllInfoCenterMessages = createAction<void>('clear-all-info-center-message');
export const expandableMessage = createAction<string>('expandable-message');
export const initialState: SliceState = {
    deviceType: DeviceType.Desktop,
    scale: 1.0,
    selectedControl: undefined,
    outline: [],
    filterQuery: filterInitOptions,
    scenario: SCENARIO.UiAdaptation,
    isAdpProject: false,
    icons: [],
    features: {},
    changes: {
        controls: {},
        pending: [],
        saved: [],
        pendingChangeIds: []
    },
    isAppPreviewVisible: true,
    appMode: 'adaptation',
    changeStack: {
        canUndo: false,
        canRedo: false
    },
    canSave: false,
    applicationRequiresReload: false,
    isAppLoading: true,
    quickActions: [],
    infoCenterMessages: [],
    contextMenu: undefined
};

/**
 * Process a control and update the control stats.
 *
 * @param control The control to update
 * @param changeType The type of change
 */
const processControl = (control: ControlChangeStats, changeType: string): void => {
    if (changeType === PENDING_CHANGE_TYPE) {
        control.pending++;
    } else if (changeType === SAVED_CHANGE_TYPE) {
        control.saved++;
    }
};

/**
 * Process a property change and update the property stats.
 *
 * @param control The control to update
 * @param change The change to process
 */
const processPropertyChange = (
    control: ControlChangeStats,
    change: PendingGenericChange | SavedGenericChange
): void => {
    const propertyName = change.properties[0].label;
    const property = control.properties[propertyName]
        ? {
              pending: control.properties[propertyName].pending,
              saved: control.properties[propertyName].saved,
              lastSavedChange: control.properties[propertyName].lastSavedChange,
              lastChange: control.properties[propertyName].lastChange
          }
        : {
              pending: 0,
              saved: 0
          };
    if (change.type === PENDING_CHANGE_TYPE) {
        property.pending++;
        property.lastChange = change;
    } else if (change.type === SAVED_CHANGE_TYPE) {
        property.lastSavedChange = change;
        property.saved++;
    }
    control.properties[propertyName] = property;
};

/**
 * Gets control chnage stats.
 *
 * @param controls ControlChanges
 * @param key string
 * @param change all supported changes
 * @param type
 * @returns ControlChangeStats
 */
const getControlChangeStats = (
    controls: ControlChanges,
    key: string,
    change: PendingGenericChange | SavedGenericChange | PendingControlChange | SavedControlChange,
    type: string
): ControlChangeStats => {
    const control = controls[key]
        ? {
              pending: controls[key].pending,
              saved: controls[key].saved,
              controlName: controls[key]?.controlName ?? undefined,
              properties: controls[key].properties
          }
        : {
              pending: 0,
              saved: 0,
              controlName:
                  change.kind === GENERIC_CHANGE_KIND && change.changeType === 'property'
                      ? change.controlName
                      : undefined,
              properties: {}
          };
    processControl(control, type);
    if (change.kind === GENERIC_CHANGE_KIND && ['property', 'configuration'].includes(change.changeType)) {
        processPropertyChange(control, change);
    }

    controls[key] = control;
    return control;
};

const slice = createSlice<SliceState, SliceCaseReducers<SliceState>, string>({
    name: 'app',
    initialState,
    reducers: {
        setProjectScenario: (state, action: PayloadAction<Scenario>) => {
            state.scenario = action.payload;
            state.isAdpProject = action.payload === SCENARIO.AdaptationProject;
        }
    },
    extraReducers: (builder) =>
        builder
            .addMatcher(outlineChanged.match, (state, action: ReturnType<typeof outlineChanged>): void => {
                state.outline = action.payload;
            })
            .addMatcher(controlSelected.match, (state, action: ReturnType<typeof controlSelected>): void => {
                state.selectedControl = action.payload;
            })
            .addMatcher(changeDeviceType.match, (state, action: ReturnType<typeof changeDeviceType>): void => {
                state.deviceType = action.payload;
            })
            .addMatcher(changePreviewScale.match, (state, action: ReturnType<typeof changePreviewScale>): void => {
                state.scale = action.payload;
            })
            .addMatcher(
                changePreviewScaleMode.match,
                (state, action: ReturnType<typeof changePreviewScaleMode>): void => {
                    state.fitPreview = action.payload === 'fit';
                }
            )
            .addMatcher(iconsLoaded.match, (state, action: ReturnType<typeof iconsLoaded>): void => {
                state.icons = action.payload;
            })
            .addMatcher(changeProperty.match, (state, action: ReturnType<typeof changeProperty>): void => {
                if (state.selectedControl?.id === action.payload.controlId) {
                    const index = state.selectedControl?.properties.findIndex(
                        (property) => property.name === action.payload.propertyName
                    );
                    if (index !== -1) {
                        state.selectedControl.properties[index].value = action.payload.value;
                        state.selectedControl.properties[index].errorMessage = '';
                    }
                }
            })
            .addMatcher(propertyChanged.match, (state, action: ReturnType<typeof propertyChanged>): void => {
                if (state.selectedControl?.id === action.payload.controlId) {
                    const index = state.selectedControl?.properties.findIndex(
                        (property) => property.name === action.payload.propertyName
                    );
                    if (index !== -1) {
                        state.selectedControl.properties[index].value = action.payload.newValue;
                    }
                }
            })
            .addMatcher(filterNodes.match, (state, action: ReturnType<typeof filterNodes>): void => {
                action.payload.forEach((item) => {
                    const stateItem = state.filterQuery.find((filterItem) => filterItem.name === item.name);
                    if (stateItem) {
                        stateItem.value = item.value;
                    }
                });
            })
            .addMatcher(propertyChangeFailed.match, (state, action: ReturnType<typeof propertyChangeFailed>): void => {
                if (state.selectedControl?.id === action.payload.controlId) {
                    const index = state.selectedControl?.properties.findIndex(
                        (property) => property.name === action.payload.propertyName
                    );
                    if (index !== -1) {
                        state.selectedControl.properties[index].errorMessage = action.payload.errorMessage;
                    }
                }
            })
            .addMatcher(changeStackModified.match, (state, action: ReturnType<typeof changeStackModified>): void => {
                state.changes.saved = action.payload.saved;
                state.changes.pending = action.payload.pending;
                state.changes.controls = {};

                for (const change of [...action.payload.pending, ...action.payload.saved].reverse()) {
                    if (change.kind === UNKNOWN_CHANGE_KIND) {
                        continue;
                    }
                    // So far array of controlId is only used for generic configuration changes
                    if (change.kind === GENERIC_CHANGE_KIND && Array.isArray(change?.controlId)) {
                        const { controlId, type } = change;
                        for (const id of controlId) {
                            const key = `${id}`;
                            const control = getControlChangeStats(state.changes.controls, key, change, type);
                            state.changes.controls[key] = control;
                        }
                    }
                    // Unknown control changes missing change indicator, if restricted by generic change kind
                    else if (change.controlId) {
                        const { controlId, type } = change;
                        const key = `${controlId}`;
                        const control = getControlChangeStats(state.changes.controls, key, change, type);
                        state.changes.controls[key] = control;
                    }
                }
            })
            .addMatcher(
                toggleAppPreviewVisibility.match,
                (state: SliceState, action: ReturnType<typeof toggleAppPreviewVisibility>): void => {
                    state.isAppPreviewVisible = action.payload;
                }
            )
            .addMatcher(fileChanged.match, (state, action: ReturnType<typeof fileChanged>): void => {
                const firstFile = action.payload[0] ?? '';
                const separator = firstFile.indexOf('\\') > -1 ? '\\' : '/';

                const newFileChanges = action.payload.filter((changedFile) => {
                    const idx = state.changes.pendingChangeIds.findIndex((pendingFile) =>
                        changedFile.includes(pendingFile.replace(/\//g, separator))
                    );
                    if (idx > -1) {
                        state.changes.pendingChangeIds.splice(idx, 1);
                    }
                    return idx < 0;
                });
                if (newFileChanges.length) {
                    state.lastExternalFileChangeTimestamp = Date.now();
                }
                if (!state.fileChanges) {
                    state.fileChanges = newFileChanges;
                } else {
                    state.fileChanges = [
                        ...state.fileChanges,
                        ...newFileChanges.filter((changedFile) => !state.fileChanges?.includes(changedFile))
                    ];
                }
            })
            .addMatcher(reloadApplication.match, (state): void => {
                state.fileChanges = [];
                state.isAppLoading = true;
            })
            .addMatcher(storageFileChanged.match, (state, action: ReturnType<typeof storageFileChanged>): void => {
                const fileName = action.payload;
                if (fileName) {
                    state.changes.pendingChangeIds.push(fileName);
                }
            })
            .addMatcher(setAppMode.match, (state, action: ReturnType<typeof setAppMode>): void => {
                // optimistic update
                state.appMode = action.payload;
            })
            .addMatcher(
                applicationModeChanged.match,
                (state, action: ReturnType<typeof applicationModeChanged>): void => {
                    state.appMode = action.payload;
                }
            )
            .addMatcher(
                setUndoRedoEnablement.match,
                (state, action: ReturnType<typeof setUndoRedoEnablement>): void => {
                    state.changeStack = action.payload;
                }
            )
            .addMatcher(setSaveEnablement.match, (state, action: ReturnType<typeof setSaveEnablement>): void => {
                state.canSave = action.payload;
            })
            .addMatcher(setFeatureToggles.match, (state, action: ReturnType<typeof setFeatureToggles>): void => {
                for (const { feature, isEnabled } of action.payload) {
                    state.features[feature] = isEnabled;
                }
            })
            .addMatcher(appLoaded.match, (state): void => {
                state.isAppLoading = false;
            })
            .addMatcher(
                setApplicationRequiresReload.match,
                (state, action: ReturnType<typeof setApplicationRequiresReload>): void => {
                    state.applicationRequiresReload = action.payload;
                }
            )
            .addMatcher(
                quickActionListChanged.match,
                (state: SliceState, action: ReturnType<typeof quickActionListChanged>): void => {
                    state.quickActions = action.payload;
                }
            )
            .addMatcher(
                updateQuickAction.match,
                (state: SliceState, action: ReturnType<typeof updateQuickAction>): void => {
                    for (const group of state.quickActions) {
                        for (let index = 0; index < group.actions.length; index++) {
                            const quickAction = group.actions[index];
                            if (quickAction.id === action.payload.id) {
                                group.actions[index] = action.payload;
                                return;
                            }
                        }
                    }
                }
            )
            .addMatcher(
                showInfoCenterMessage.match,
                (state: SliceState, action: ReturnType<typeof showInfoCenterMessage>): void => {
                    state.infoCenterMessages.unshift({
                        id: uuidv4(),
                        message: action.payload
                    });
                }
            )
            .addMatcher(
                clearInfoCenterMessage.match,
                (state: SliceState, action: ReturnType<typeof clearInfoCenterMessage>): void => {
                    state.infoCenterMessages = state.infoCenterMessages.filter(
                        (message) => message.id !== action.payload
                    );
                }
            )
            .addMatcher(clearAllInfoCenterMessages.match, (state: SliceState): void => {
                state.infoCenterMessages = state.infoCenterMessages.filter(
                    (info) => info.message.type === MessageBarType.error
                );
            })
            .addMatcher(
                expandableMessage.match,
                (state: SliceState, action: ReturnType<typeof expandableMessage>): void => {
                    const id = action.payload;
                    state.infoCenterMessages = state.infoCenterMessages.map((message) =>
                        message.id === id ? { ...message, expandable: true } : message
                    );
                }
            )
            .addMatcher(
                requestControlContextMenu.fulfilled.match,
                (state: SliceState, action: ReturnType<typeof requestControlContextMenu.fulfilled>): void => {
                    const { contextMenuItems, controlId } = action.payload;
                    state.contextMenu = {
                        contextMenuItems,
                        controlId
                    };
                }
            )
});

export const { setProjectScenario } = slice.actions;

export default slice.reducer;
