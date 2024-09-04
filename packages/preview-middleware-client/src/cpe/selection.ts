import type { Control, ExternalAction } from '@sap-ux-private/control-property-editor-common';
import {
    controlSelected,
    propertyChanged,
    selectControl,
    reportTelemetry,
    Properties
} from '@sap-ux-private/control-property-editor-common';
import { buildControlData } from './control-data';
import { getRuntimeControl, ManagedObjectMetadataProperties, PropertiesInfo } from './utils';
import type { ActionSenderFunction, Service, SubscribeFunction } from './types';

import type Event from 'sap/ui/base/Event';
import type ElementOverlay from 'sap/ui/dt/ElementOverlay';
import type ManagedObject from 'sap/ui/base/ManagedObject';
import type { SelectionChangeEvent } from 'sap/ui/rta/RuntimeAuthoring';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import Log from 'sap/base/Log';
import { getDocumentation } from './documentation';
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import OverlayUtil from 'sap/ui/dt/OverlayUtil';
import { getComponent } from '../utils/core';
import { getError } from '../utils/error';

export interface PropertyChangeParams {
    name: string;
    id: string;
    newValue: string;
}
export type PropertyChangeEvent = Event<PropertyChangeParams>;

/**
 * Change id is a combination of controlId and propertyName.
 *
 * @param controlId unique identifier for a control.
 * @param propertyName name of the control property.
 * @returns string
 */
function propertyChangeId(controlId: string, propertyName: string): string {
    return [controlId, propertyName].join(',');
}

/**
 * Return document of a property.
 *
 * @param property - control metadata props.
 * @param ui5Type - ui5 type
 * @param document - property that is ignored during design time
 * @returns PropertiesInfo
 */
function getPropertyDocument(
    property: ManagedObjectMetadataProperties,
    ui5Type?: string,
    document?: Properties
): PropertiesInfo {
    return document?.[property.name]
        ? document[property.name]
        : ({
              defaultValue: (property.defaultValue as string) ?? '-',
              description: '',
              propertyName: property.name,
              type: ui5Type ?? '-',
              propertyType: ui5Type ?? '-'
          } as PropertiesInfo);
}

async function addDocumentationForProperties(control: ManagedObject, controlData: Control): Promise<void> {
    try {
        const controlMetadata = control.getMetadata();
        const allProperties = controlMetadata.getAllProperties() as unknown as {
            [name: string]: ManagedObjectMetadataProperties;
        };
        const selectedControlName = controlMetadata.getName();
        const selContLibName = controlMetadata.getLibraryName();
        // Add the control's properties
        const document = await getDocumentation(selectedControlName, selContLibName);
        controlData.properties.forEach((controlProp) => {
            const property = allProperties[controlProp.name];
            controlProp.documentation = getPropertyDocument(property, controlProp.ui5Type, document);
        });
    } catch (e) {
        Log.error('Document loading failed', getError(e));
    }
}

/**
 *
 */
export class SelectionService implements Service {
    private appliedChangeCache = new Map<string, number>();
    private activeChangeHandlers = new Set<() => void>();
    /**
     *
     * @param rta - rta object.
     * @param ui5 - facade for ui5 framework methods
     */
    constructor(private readonly rta: RuntimeAuthoring) {}

    /**
     * Initialize selection service.
     *
     * @param sendAction action sender function
     * @param subscribe subscriber function
     */
    public init(sendAction: ActionSenderFunction, subscribe: SubscribeFunction): void {
        const eventOrigin: Set<string> = new Set();
        const onselectionChange = this.createOnSelectionChangeHandler(sendAction, eventOrigin);
        this.rta.attachSelectionChange((event) => {
            onselectionChange(event).catch((error) => Log.error('Event interrupted: ', getError(error)));
        });
        subscribe(async (action: ExternalAction): Promise<void> => {
            if (selectControl.match(action)) {
                const id = action.payload;
                const control = sap.ui.getCore().byId(id);
                if (!control) {
                    const component = getComponent(id);
                    if (component) {
                        const controlData = buildControlData(component);

                        // add document
                        await addDocumentationForProperties(component, controlData);
                        const controlSelectedAction = controlSelected(controlData);
                        sendAction(controlSelectedAction);
                    }
                    return;
                }
                eventOrigin.add('outline');
                let controlOverlay = OverlayRegistry.getOverlay(control);
                const selectedOverlayControls = this.rta.getSelection() ?? [];
                //remove previous selection
                for (const selectedOverlayControl of selectedOverlayControls) {
                    selectedOverlayControl.setSelected(false); //deselect previously selected control
                }

                if (!controlOverlay?.getDomRef()) {
                    //look for closest control in order to highlight in UI the (without firing the selection event)
                    controlOverlay = OverlayUtil.getClosestOverlayFor(control);
                }

                if (controlOverlay?.isSelectable()) {
                    controlOverlay.setSelected(true); //highlight without firing event only if the layer is selectable
                } else {
                    const controlData = buildControlData(control);
                    await addDocumentationForProperties(control, controlData);
                    const controlSelectedAction = controlSelected(controlData);
                    sendAction(controlSelectedAction);
                }
            }
        });
    }

    /**
     *
     * @param controlId unique identifier for a control
     * @param propertyName name of the control property.
     */
    public applyControlPropertyChange(controlId: string, propertyName: string): void {
        const changeId = propertyChangeId(controlId, propertyName);
        this.appliedChangeCache.set(changeId, Date.now());
    }

    /**
     * Create handler for onSelectionChange.
     *
     * @param sendAction sending action method
     * @param eventOrigin origin of the event.
     * @returns (event: Event) => Promise<void>
     */
    private createOnSelectionChangeHandler(
        sendAction: (action: ExternalAction) => void,
        eventOrigin: Set<string>
    ): (event: SelectionChangeEvent) => Promise<void> {
        return async (event: SelectionChangeEvent): Promise<void> => {
            const selection = event.getParameter('selection');
            for (const dispose of this.activeChangeHandlers) {
                dispose();
            }
            this.activeChangeHandlers.clear();
            if (Array.isArray(selection) && selection.length === 1) {
                const overlayControl = sap.ui.getCore().byId(selection[0].getId()) as ElementOverlay;
                if (overlayControl) {
                    const runtimeControl = getRuntimeControl(overlayControl);
                    const controlName = runtimeControl.getMetadata().getName();
                    this.handlePropertyChanges(runtimeControl, sendAction);
                    try {
                        const isOutline = eventOrigin.has('outline');
                        const name = controlName.toLowerCase().startsWith('sap') ? controlName : 'Other Control Types';
                        if (isOutline) {
                            // eslint-disable-next-line @typescript-eslint/no-floating-promises
                            reportTelemetry({ category: 'Outline Selection', controlName: name });
                        } else {
                            // eslint-disable-next-line @typescript-eslint/no-floating-promises
                            reportTelemetry({ category: 'Overlay Selection', controlName: name });
                        }
                    } catch (error) {
                        Log.error('Failed to report telemetry', getError(error));
                    } finally {
                        const controlData = buildControlData(runtimeControl, overlayControl);
                        await addDocumentationForProperties(runtimeControl, controlData);
                        const action = controlSelected(controlData);
                        sendAction(action);
                        eventOrigin.delete('outline');
                    }
                }
            }
        };
    }

    /**
     *
     * @param runtimeControl sap/ui/base/ManagedObject
     * @param sendAction send action method.
     */
    private handlePropertyChanges(runtimeControl: ManagedObject, sendAction: (action: ExternalAction) => void): void {
        const handler = (e: PropertyChangeEvent) => {
            const propertyName = e.getParameter('name');
            const controlId = e.getParameter('id');
            const changeId = propertyChangeId(controlId, propertyName);
            const timestamp = this.appliedChangeCache.get(changeId);
            if (timestamp) {
                // Change originated from control property editor, we do not need to notify it
                this.appliedChangeCache.delete(changeId);
                return;
            }
            const info = runtimeControl.getBindingInfo(propertyName) as { bindingString?: string };
            const newValue = info?.bindingString ?? e.getParameter('newValue');
            const change = propertyChanged({
                controlId,
                propertyName,
                newValue
            });
            sendAction(change);
        };
        runtimeControl.attachEvent('_change', handler);
        this.activeChangeHandlers.add(() => {
            try {
                runtimeControl.detachEvent('_change', handler);
            } catch {
                // control has already been cleaned up, nothing to do here
            }
        });
    }
}
