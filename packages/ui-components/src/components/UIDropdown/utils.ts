import type { IDropdownProps, IComboBoxProps, ICalloutProps } from '@fluentui/react';
import type { CalloutCollisionTransform } from '../UICallout';
import type { UIDropdown } from './UIDropdown';
import type { UIComboBox } from '../UIComboBox';

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

/**
 * Method returns callback function to 'onLayerDidMount' property of dropdown 'callout'.
 *
 * @param dropdown Instance of dropdown.
 * @returns Returns callback function to 'onLayerDidMount' property of dropdown 'callout'.
 */
function getOnLayerDidMount(dropdown: UIDropdown | UIComboBox): () => void {
    return () => {
        const { layerProps } =
            getCalloutCollisionTransformationProps(
                dropdown.calloutCollisionTransform,
                dropdown.props.multiSelect,
                dropdown.props.calloutCollisionTransformation
            ) ?? {};
        if (dropdown.props.calloutProps?.layerProps?.onLayerDidMount) {
            dropdown.props.calloutProps?.layerProps?.onLayerDidMount();
        }
        if (layerProps?.onLayerDidMount) {
            layerProps.onLayerDidMount();
        }
    };
}

/**
 * Method returns callback function to 'onLayerWillUnmount' property of dropdown 'callout'.
 *
 * @param dropdown Instance of dropdown.
 * @returns Returns callback function to 'onLayerWillUnmount' property of dropdown 'callout'.
 */
function getOnLayerWillUnmount(dropdown: UIDropdown | UIComboBox): () => void {
    return () => {
        const { layerProps } =
            getCalloutCollisionTransformationProps(
                dropdown.calloutCollisionTransform,
                dropdown.props.multiSelect,
                dropdown.props.calloutCollisionTransformation
            ) ?? {};
        if (dropdown.props.calloutProps?.layerProps?.onLayerWillUnmount) {
            dropdown.props.calloutProps?.layerProps?.onLayerWillUnmount();
        }
        if (layerProps?.onLayerWillUnmount) {
            layerProps.onLayerWillUnmount();
        }
    };
}

/**
 * Method returns callback function to 'preventDismissOnEvent' property of dropdown 'callout', which prevents callout dismiss/close if focus/click on target elements.
 *
 * @param dropdown Instance of dropdown.
 * @returns Returns callback function to 'preventDismissOnEvent' property of dropdown 'callout'.
 */
function getPreventDismissOnEvent(
    dropdown: UIDropdown | UIComboBox
): (
    event: Event | React.FocusEvent<Element> | React.KeyboardEvent<Element> | React.MouseEvent<Element, MouseEvent>
) => boolean {
    return (event) => {
        let preventDismiss = false;
        if (dropdown.props.calloutProps?.preventDismissOnEvent) {
            preventDismiss = dropdown.props.calloutProps.preventDismissOnEvent(event);
        }
        if (!preventDismiss) {
            const { preventDismissOnEvent } =
                getCalloutCollisionTransformationProps(
                    dropdown.calloutCollisionTransform,
                    dropdown.props.multiSelect,
                    dropdown.props.calloutCollisionTransformation
                ) ?? {};
            if (preventDismissOnEvent) {
                return preventDismissOnEvent(event);
            }
        }
        return preventDismiss;
    };
}

/**
 * Method returns additional callout props for callout collision transformation if feature is enabled.
 * Callout collision transformation checks if dropdown menu overlaps with dialog action/submit buttons
 *  and if overlap happens, then additional offset is applied to make action buttons visible.
 *
 * @param dropdown Instance of dropdown.
 * @returns Callout props to enable callout collision transformation.
 */
export function getCalloutCollisionTransformationPropsForDropdown(
    dropdown: UIDropdown | UIComboBox
): ICalloutProps | undefined {
    if (dropdown.props.multiSelect && dropdown.props.calloutCollisionTransformation) {
        return {
            preventDismissOnEvent: getPreventDismissOnEvent(dropdown),
            layerProps: {
                onLayerDidMount: getOnLayerDidMount(dropdown),
                onLayerWillUnmount: getOnLayerWillUnmount(dropdown)
            }
        };
    }
    return undefined;
}
