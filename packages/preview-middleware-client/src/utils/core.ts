import Component from 'sap/ui/core/Component';
import type { ID } from 'sap/ui/core/library';
import type ManagedObject from 'sap/ui/base/ManagedObject';
import Element from 'sap/ui/core/Element';

/**
 * Gets Component by id.
 *
 * @param id - unique identifier for control
 * @returns Component | undefined
 */
export function getComponent<T extends Component = Component>(id: ID): T | undefined {
    if (Component?.getComponentById) {
        return Component.getComponentById(id) as T;
    } else if (Component?.get) {
        // Older version must be still supported until maintenance period.
        return Component.get(id) as T; // NOSONAR
    } else {
        // Older version must be still supported until maintenance period.
        return sap.ui.getCore().getComponent(id) as T; // NOSONAR
    }
}

/**
 * Returns control by its global ID.
 *
 * @param id Id of the control.
 * @returns Control instance if it exists.
 */
export function getControlById<T extends Element = Element>(id: string): T | undefined {
    if (typeof Element.getElementById === 'function') {
        return Element.getElementById(id) as T;
    } else {
        return sap.ui.getCore().byId(id) as T;
    }
}

/**
 * Checks wether this object is an instance of a ManagedObject.
 *
 * @param element An object.
 * @returns True if element is an instance of a ManagedObject.
 */
export function isManagedObject(element: object | undefined): element is ManagedObject {
    if (typeof (element as unknown as { isA?: (_type: string) => boolean })?.isA === 'function') {
        return (element as unknown as { isA: (_type: string) => boolean }).isA('sap.ui.base.ManagedObject');
    }

    return false;
}

/**
 * Checks whether this object is an instance of the named type.
 *
 * @param type - Type to check for.
 * @param element - Object to check
 * @returns Whether this object is an instance of the given type.
 */
export function isA<T extends ManagedObject>(type: string, element: ManagedObject | undefined): element is T {
    return !!element?.isA(type);
}
