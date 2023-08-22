import type { ExternalAction } from '@sap-ux/control-property-editor-common';
import { controlSelected, propertyChanged, selectControl } from '@sap-ux/control-property-editor-common';
import { reportTelemetry } from '@sap-ux/control-property-editor-common';
import { buildControlData } from './controlData';
import { getRuntimeControl } from './utils';
import type { ActionSenderFunction, Service, SubscribeFunction, UI5Facade } from './types';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import type Event from 'sap/ui/base/Event';
import type ElementOverlay from 'sap/ui/dt/ElementOverlay';
import type ManagedObject from 'sap/ui/base/ManagedObject';
import type { SelectionChangeEvent } from 'sap/ui/rta/RuntimeAuthoring';

/**
 *
 */
export class SelectionService implements Service {
    private appliedChangeCache = new Map<string, number>();
    private activeChangeHandlers = new Set<() => void>();
    /**
     *
     * @param rta
     * @param ui5
     */
    constructor(private readonly rta: RuntimeAuthoring, private readonly ui5: UI5Facade) {}

    /**
     * Initialize selection service.
     *
     * @param sendAction
     * @param subscribe
     */
    public init(sendAction: ActionSenderFunction, subscribe: SubscribeFunction): void {
        const eventOrigin: Set<string> = new Set();
        this.rta.attachSelectionChange(this.createOnSelectionChangeHandler(sendAction, eventOrigin));
        subscribe(async (action: ExternalAction): Promise<void> => {
            if (selectControl.match(action)) {
                const id = action.payload;
                const control = this.ui5.getControlById(id);
                if (!control) {
                    const component = this.ui5.getComponent(id);
                    if (component) {
                        const controlData = await buildControlData(component);
                        const action = controlSelected(controlData);
                        sendAction(action);
                    }
                    return;
                }
                eventOrigin.add('outline');
                let controlOverlay = this.ui5.getOverlay(control);
                const selectedOverlayControls = this.rta.getSelection();
                if (selectedOverlayControls.length > 0) {
                    //remove previous selection
                    for (let i = 0; i < selectedOverlayControls.length; i++) {
                        selectedOverlayControls[i].setSelected(false); //deselect previously selected control
                    }
                }

                if (!controlOverlay || !controlOverlay.getDomRef()) {
                    //look for closest control in order to highlight in UI the (without firing the selection event)
                    controlOverlay = this.ui5.getClosestOverlayFor(control);
                }

                if (controlOverlay && controlOverlay.isSelectable()) {
                    controlOverlay.setSelected(true); //highlight without firing event only if the layer is selectable
                } else {
                    const controlData = await buildControlData(control);
                    const action = controlSelected(controlData);
                    sendAction(action);
                }
            }
        });
    }

    /**
     *
     * @param controlId
     * @param propertyName
     */
    public applyControlPropertyChange(controlId: string, propertyName: string): void {
        const changeId = propertyChangeId(controlId, propertyName);
        this.appliedChangeCache.set(changeId, Date.now());
    }

    /**
     * Create handler for onSelectionChange.
     *
     * @param sendAction
     * @param eventOrigin
     * @returns { (event: Event) => Promise<void>}
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
                        console.error(`Error in reporting telemetry`, error);
                    } finally {
                        const control = await buildControlData(runtimeControl, overlayControl);
                        const action = controlSelected(control);
                        sendAction(action);
                        eventOrigin.delete('outline');
                    }
                }
            }
        };
    }

    /**
     *
     * @param runtimeControl
     * @param sendAction
     */
    private handlePropertyChanges(runtimeControl: ManagedObject, sendAction: (action: ExternalAction) => void): void {
        const handler = (e: Event) => {
            const propertyName = e.getParameter('name');
            const controlId = e.getParameter('id');
            const changeId = propertyChangeId(controlId, propertyName);
            const timestamp = this.appliedChangeCache.get(changeId);
            if (timestamp) {
                // Change originated from control property editor, we do not need to notify it
                this.appliedChangeCache.delete(changeId);
                return;
            }
            const info: { bindingString?: string } = runtimeControl.getBindingInfo(propertyName);
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

/**
 * Property change id of controlId and propertyName.
 *
 * @param controlId
 * @param propertyName
 * @returns {string}
 */
function propertyChangeId(controlId: string, propertyName: string): string {
    return [controlId, propertyName].join(',');
}
