import type { Control, ExternalAction } from '@sap-ux/control-property-editor-common';
import {
    controlSelected,
    propertyChanged,
    selectControl,
    reportTelemetry,
    Properties
} from '@sap-ux/control-property-editor-common';
import { buildControlData } from './control-data';
import { getRuntimeControl, ManagedObjectMetadataProperties, PropertiesInfo } from './utils';
import type { ActionSenderFunction, Service, SubscribeFunction, UI5Facade } from './types';

import type Event from 'sap/ui/base/Event';
import type ElementOverlay from 'sap/ui/dt/ElementOverlay';
import type ManagedObject from 'sap/ui/base/ManagedObject';
import type { SelectionChangeEvent } from 'sap/ui/rta/RuntimeAuthoring';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import Log from 'sap/base/Log';
import { getDocumentation } from './documentation';

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
              defaultValue: (property.defaultValue as string) || '-',
              description: '',
              propertyName: property.name,
              type: ui5Type || '-',
              propertyType: ui5Type || '-'
          } as PropertiesInfo);
}

async function addDocumentationForProperties(control: ManagedObject, controlData: Control): Promise<void> {
    const controlMetadata = control.getMetadata();
    const allProperties = controlMetadata.getAllProperties() as unknown as {
        [name: string]: ManagedObjectMetadataProperties;
    };
    const selectedControlName = controlMetadata.getName();
    const selContLibName = controlMetadata.getLibraryName();
    // Add the control's properties
    const document = await getDocumentation(selectedControlName, selContLibName);
    controlData.properties.map((controlProp) => {
        const property = allProperties[controlProp.name];
        controlProp.documentation = getPropertyDocument(property, controlProp.ui5Type, document);
    });
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
    constructor(private readonly rta: RuntimeAuthoring, private readonly ui5: UI5Facade) {}

    /**
     * Initialize selection service.
     *
     * @param sendAction action sender function
     * @param subscribe subscriber function
     */
    public async init(sendAction: ActionSenderFunction, subscribe: SubscribeFunction): Promise<void> {
        const eventOrigin: Set<string> = new Set();
        const onselectionChange = this.createOnSelectionChangeHandler(sendAction, eventOrigin);
        this.rta.attachSelectionChange((event) => {
            onselectionChange(event).catch((error) => Log.error('Event interrupted: ', error));
        });
        subscribe(async (action: ExternalAction): Promise<void> => {
            if (selectControl.match(action)) {
                const id = action.payload;
                const control = this.ui5.getControlById(id);
                if (!control) {
                    const component = this.ui5.getComponent(id);
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
                let controlOverlay = this.ui5.getOverlay(control);
                const selectedOverlayControls = this.rta.getSelection() || [];
                //remove previous selection
                for (const selectedOverlayControl of selectedOverlayControls) {
                    selectedOverlayControl.setSelected(false); //deselect previously selected control
                }

                if (!controlOverlay?.getDomRef()) {
                    //look for closest control in order to highlight in UI the (without firing the selection event)
                    controlOverlay = this.ui5.getClosestOverlayFor(control);
                }

                if (controlOverlay?.isSelectable()) {
                    controlOverlay.setSelected(true); //highlight without firing event only if the layer is selectable
                } else {
                    const controlData = await buildControlData(control);
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
                const overlayControl = this.ui5.getControlById<ElementOverlay>(selection[0].getId());
                if (overlayControl) {
                    const runtimeControl = getRuntimeControl(overlayControl);
                    const controlName = runtimeControl.getMetadata().getName();
                    this.handlePropertyChanges(runtimeControl, sendAction);
                    try {
                        const isOutline = eventOrigin.has('outline');
                        const name = controlName.toLowerCase().startsWith('sap') ? controlName : 'Other Control Types';
                        if (isOutline) {
                            reportTelemetry({ category: 'Outline Selection', controlName: name });
                        } else {
                            reportTelemetry({ category: 'Overlay Selection', controlName: name });
                        }
                    } catch (error) {
                        Log.error('Error in reporting telemetry', error);
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
            const info: { path?: string } = runtimeControl.getBindingInfo(propertyName);
            const newValue = info?.path ?? e.getParameter('newValue');
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
