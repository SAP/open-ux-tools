import type ElementOverlay from 'sap/ui/dt/ElementOverlay';
import type ManagedObject from 'sap/ui/base/ManagedObject';

/**
 * Handles calling control specific functions for retrieving control data
 */
export default class ControlUtils {
    /**
     * Returns ManagedObject runtime control
     *
     * @param overlayControl Overlay
     * @returns {ManagedObject} Managed Object instance
     */
    public static getRuntimeControl(overlayControl: ElementOverlay): ManagedObject {
        let runtimeControl;
        if (overlayControl.getElementInstance) {
            runtimeControl = overlayControl.getElementInstance();
        } else {
            runtimeControl = overlayControl.getElement();
        }
        return runtimeControl;
    }

    /**
     * Returns control aggregation names in an array
     *
     * @param control Managed Object runtime controll
     * @param name Aggregation name
     * @returns Array of control aggregations
     */
    public static getControlAggregationByName(
        control: ManagedObject & { __calledJSONKeys?: boolean; [key: string]: any },
        name: string
    ) {
        let result = [];
        const aggregation = (control ? control.getMetadata().getAllAggregations() : {})[name] as unknown as object & {
            _sGetter: string;
        };

        if (aggregation) {
            if (!aggregation._sGetter && !control.__calledJSONKeys) {
                // Performance optimization
                control.__calledJSONKeys = true;
            }
            // This executes a _sGetter function that can vary from control to control (_sGetter can be: getContent, getItems, etc)
            result = (aggregation._sGetter && control[aggregation._sGetter]()) || [];

            // The aggregation has primitive alternative type
            if (typeof result !== 'object') {
                result = [];
            }
            result = Array.isArray(result) ? result : [result];
        }
        return result;
    }
}
