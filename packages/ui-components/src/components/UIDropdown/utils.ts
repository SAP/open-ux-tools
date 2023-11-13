import type { IDropdownProps, IComboBoxProps, ICalloutProps } from '@fluentui/react';
import type { CalloutCollisionTransform } from '../UICallout';

/**
 * Method checks if drodpown or combobox is empty or any value is selected.
 *
 * @param {Partial<IDropdownProps | IComboBoxProps>} props Dropdown or combobox props.
 * @returns {boolean} Is dropdown or combobox empty.
 */
export function isDropdownEmpty(props: Partial<IDropdownProps | IComboBoxProps>): boolean {
    const { selectedKey } = props;
    if (Array.isArray(selectedKey)) {
        return selectedKey.length === 0;
    }
    if (('text' in props && props.text) || ('selectedKeys' in props && props.selectedKeys?.length)) {
        return false;
    }
    return !selectedKey;
}

/**
 * Method returns additional callout props for callout collision transformation if feature is enabled.
 * Callout collision transformation checks if dropdown menu overlaps with dialog action/submit buttons
 *  and if overlap happens, then additional offset is applied to make action buttons visible.
 *
 * @param calloutCollisionTransform Instance of callout collision transformation.
 * @param multiSelect Is multi select enabled.
 * @param enabled Is transformation enabled.
 * @returns Callout props to enable callout collision transformation.
 */
export function getCalloutCollisionTransformationProps(
    calloutCollisionTransform: CalloutCollisionTransform,
    multiSelect?: boolean,
    enabled?: boolean
): ICalloutProps | undefined {
    if (multiSelect && enabled) {
        return {
            preventDismissOnEvent: calloutCollisionTransform.preventDismissOnEvent,
            layerProps: {
                onLayerDidMount: calloutCollisionTransform.applyTransformation,
                onLayerWillUnmount: calloutCollisionTransform.resetTransformation
            }
        };
    }
    return undefined;
}
