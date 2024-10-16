import type { PayloadAction, SliceCaseReducers } from '@reduxjs/toolkit';
import { createSlice, createAction } from '@reduxjs/toolkit';

import type {
    Control,
    IconDetails,
    OutlineNode,
    PendingChange,
    PendingPropertyChange,
    PropertyChange,
    QuickActionGroup,
    SavedChange,
    SavedPropertyChange,
    Scenario,
    ShowMessage
} from '@sap-ux-private/control-property-editor-common';
import {
    setApplicationRequiresReload,
    changeStackModified,
    controlSelected,
    iconsLoaded,
    outlineChanged,
    propertyChanged,
    propertyChangeFailed,
    showMessage,
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
    UNKNOWN_CHANGE_KIND,
    SAVED_CHANGE_TYPE,
    PENDING_CHANGE_TYPE
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
    dialogMessage: ShowMessage | undefined;
    fileChanges?: string[];
    appMode: 'navigation' | 'adaptation';
    changeStack: {
        canUndo: boolean;
        canRedo: boolean;
    };
    canSave: boolean;
    applicationRequiresReload: boolean;
    isAppLoading: boolean;
    quickActions: QuickActionGroup[];
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
    controlName: string;
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
    lastSavedChange?: SavedPropertyChange;
    lastChange?: PendingPropertyChange;
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
    dialogMessage: undefined,
    appMode: 'adaptation',
    changeStack: {
        canUndo: false,
        canRedo: false
    },
    canSave: false,
    applicationRequiresReload: false,
    isAppLoading: true,
    quickActions: []
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
                    const { controlId, propertyName, type, controlName } = change;
                    const key = `${controlId}`;
                    const control = state.changes.controls[key]
                        ? {
                              pending: state.changes.controls[key].pending,
                              saved: state.changes.controls[key].saved,
                              controlName: state.changes.controls[key].controlName,
                              properties: state.changes.controls[key].properties
                          }
                        : {
                              pending: 0,
                              saved: 0,
                              controlName: controlName ?? '',
                              properties: {}
                          };
                    if (type === PENDING_CHANGE_TYPE) {
                        control.pending++;
                    } else if (type === SAVED_CHANGE_TYPE) {
                        control.saved++;
                    }
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
                    state.changes.controls[key] = control;
                }
            })
            .addMatcher(showMessage.match, (state, action: ReturnType<typeof showMessage>): void => {
                state.dialogMessage = action.payload;
            })
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
});

export const { setProjectScenario } = slice.actions;

export default slice.reducer;
