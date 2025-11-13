import Component from 'sap/ui/core/Component';
import type { ID } from 'sap/ui/core/library';
import type ManagedObject from 'sap/ui/base/ManagedObject';
import Element from 'sap/ui/core/Element';
import View from 'sap/ui/core/mvc/View';

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

export function hasParent(component: ManagedObject, parentIdToFind: string): boolean  {
    const parent = component.getParent();
    if (!parent) {
        return false;
    }
    if (parent.getId() === parentIdToFind) {
        return true;
    }
    return hasParent(parent, parentIdToFind);
}

/**
 * Utility function to safely call getParent on UI5 elements
 * @param element UI5 element
 * @returns parent element or null
 */
function getElementParent(element: Element | ManagedObject): ManagedObject | null {
    if (typeof element.getParent === 'function') {
        return element.getParent();
    }
    return null;
}

/**
 * Finds the view that contains the given control.
 *
 * @param control - Control instance  
 * @returns View instance if found, undefined otherwise
 */
export function findViewByControl(control: Element | ManagedObject): View | undefined {
    if (!control) {
        return undefined;
    }
    if (isA<View>('sap.ui.core.mvc.View', control)) {
        return control;
    }
    const parent = getElementParent(control);
    if (!parent) {
        return undefined;
    }
    return findViewByControl(parent);
}

export function findNestedElements(
    ownerElement: Element,
    candidates: Element[]
): Element[] {
    const ownerId = ownerElement.getId();
    return candidates.filter((item) => hasParent(item, ownerId));
}