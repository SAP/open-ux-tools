import type { SliceCaseReducers } from '@reduxjs/toolkit';
import { createSlice, createAction } from '@reduxjs/toolkit';

import type {
    Control,
    IconDetails,
    OutlineNode,
    PendingPropertyChange,
    PropertyChange,
    SavedPropertyChange,
    Scenario
} from '@sap-ux-private/control-property-editor-common';
import {
    changeStackModified,
    controlSelected,
    iconsLoaded,
    outlineChanged,
    propertyChanged,
    propertyChangeFailed,
    scenario,
    scenarioLoaded
} from '@sap-ux-private/control-property-editor-common';
import { DeviceType } from './devices';

interface SliceState {
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
    icons: IconDetails[];
    changes: ChangesSlice;
}

export interface ChangesSlice {
    controls: ControlChanges;
    pending: PendingPropertyChange[];
    saved: SavedPropertyChange[];
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

export const changeProperty = createAction<PropertyChange>('app/change-property');
export const changePreviewScale = createAction<number>('app/change-preview-scale');
export const changePreviewScaleMode = createAction<'fit' | 'fixed'>('app/change-preview-scale-mode');
export const changeDeviceType = createAction<DeviceType>('app/change-device-type');
export const filterNodes = createAction<FilterOptions[]>('app/filter-nodes');

export const initialState = {
    deviceType: DeviceType.Desktop,
    scale: 1.0,
    selectedControl: undefined,
    outline: [],
    filterQuery: filterInitOptions,
    scenario: scenario.UiAdaptation,
    icons: [],
    changes: {
        controls: {},
        pending: [],
        saved: []
    }
};
const slice = createSlice<SliceState, SliceCaseReducers<SliceState>, string>({
    name: 'app',
    initialState,
    reducers: {},
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
            .addMatcher(scenarioLoaded.match, (state, action: ReturnType<typeof scenarioLoaded>): void => {
                state.scenario = action.payload;
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
                    if (type === 'pending') {
                        control.pending++;
                    } else if (type === 'saved') {
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
                    if (change.type === 'pending') {
                        property.pending++;
                        property.lastChange = change;
                    } else if (change.type === 'saved') {
                        property.lastSavedChange = change;
                        property.saved++;
                    }
                    control.properties[propertyName] = property;
                    state.changes.controls[key] = control;
                }
            })
});

export default slice.reducer;
