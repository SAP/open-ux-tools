import React from 'react';
import type {
    ICalloutProps,
    ICalloutContentStyles,
    IRawStyle,
    IStyleFunctionOrObject,
    ICalloutContentStyleProps
} from '@fluentui/react';
import { Callout, getDocument } from '@fluentui/react';
import { isHTMLElement, focusToSibling } from '../../utilities';

export interface UICalloutProps extends ICalloutProps {
    calloutMinWidth?: number;
    contentPadding?: UICalloutContentPadding;
    focusTargetSiblingOnTabPress?: boolean;
}

import '../../styles/_shadows.scss';

export const CALLOUT_STYLES = {
    background: 'var(--vscode-editorWidget-background)',
    boxShadow: 'var(--ui-box-shadow-small)',
    borderColor: 'var(--vscode-editorWidget-border)',
    text: 'var(--vscode-editorWidget-foreground)',
    font: 'var(--vscode-font-family)',
    borderRadius: 2
};

export enum UICalloutContentPadding {
    None = 'None',
    Standard = 'Standard'
}

// Control content padding with different states to avoid different hardcoded values across extensions
const CALLOUT_CONTENT_PADDING = new Map<UICalloutContentPadding, number>([[UICalloutContentPadding.Standard, 8]]);

/**
 * Method receives callout style and extracts into raw styles object.
 *
 * @param {IStyleFunctionOrObject<ICalloutContentStyleProps, ICalloutContentStyles> | undefined} styles Callout styles.
 * @param {keyof ICalloutContentStyles} name Callout style type.
 * @returns {IRawStyle} Raw style object.
 */
const extractRawStyles = (
    styles: IStyleFunctionOrObject<ICalloutContentStyleProps, ICalloutContentStyles> | undefined,
    name: keyof ICalloutContentStyles
): IRawStyle => {
    if (typeof styles === 'object' && typeof styles[name] === 'object') {
        return styles[name] as IRawStyle;
    }
    return {};
};

export const getCalloutStyle = (props: UICalloutProps): ICalloutContentStyles => {
    return {
        root: {
            boxShadow: CALLOUT_STYLES.boxShadow,
            backgroundColor: CALLOUT_STYLES.background,
            borderRadius: CALLOUT_STYLES.borderRadius,
            border: `1px solid ${CALLOUT_STYLES.borderColor}`,
            ...extractRawStyles(props.styles, 'root')
        },
        beak: {
            backgroundColor: CALLOUT_STYLES.background,
            boxShadow: CALLOUT_STYLES.boxShadow,
            ...extractRawStyles(props.styles, 'beak')
        },
        beakCurtain: {
            backgroundColor: CALLOUT_STYLES.background,
            borderRadius: CALLOUT_STYLES.borderRadius,
            ...extractRawStyles(props.styles, 'beakCurtain')
        },
        calloutMain: {
            backgroundColor: 'transparent',
            color: CALLOUT_STYLES.text,
            fontFamily: CALLOUT_STYLES.font,
            borderRadius: CALLOUT_STYLES.borderRadius,
            minWidth: props.calloutMinWidth ?? 300,
            boxSizing: 'border-box',
            padding: CALLOUT_CONTENT_PADDING.get(props.contentPadding ?? UICalloutContentPadding.None),
            ...extractRawStyles(props.styles, 'calloutMain')
        },
        container: extractRawStyles(props.styles, 'container')
    };
};

/**
 * UICallout component.
 * based on https://developer.microsoft.com/en-us/fluentui#/controls/web/callout
 *
 * @exports
 * @class UICallout
 * @extends {React.Component<ICalloutProps, {}>}
 */
export class UICallout extends React.Component<UICalloutProps, {}> {
    /**
     * Initializes component properties.
     *
     * @param {UICalloutProps} props
     */
    public constructor(props: UICalloutProps) {
        super(props);
        this.onKeyDown = this.onKeyDown.bind(this);
    }

    /**
     * Method handles keydown event.
     * If "focusTargetSiblingOnTabPress" property is set and 'Tab' key is pressed,
     *  then method tries to focus next/previous sibling based on target.
     *
     * @param event Keydown event
     */
    private onKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
        const { onKeyDown, focusTargetSiblingOnTabPress, target } = this.props;
        if (focusTargetSiblingOnTabPress && event.key === 'Tab' && target) {
            let targetRef: HTMLElement | null | undefined = null;
            if (typeof target === 'string') {
                const currentDoc = getDocument();
                targetRef = currentDoc?.querySelector(target);
            } else if ('getBoundingClientRect' in target && isHTMLElement(target)) {
                targetRef = target;
            }
            if (targetRef && focusToSibling(targetRef, !event.shiftKey)) {
                // Stop event bubbling to avoid default browser behavior
                event.stopPropagation();
                event.preventDefault();
            }
        }
        // Call external subscriber
        onKeyDown?.(event);
    }

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        return (
            <Callout {...this.props} onKeyDown={this.onKeyDown} styles={getCalloutStyle(this.props)}>
                {this.props.children}
            </Callout>
        );
    }
}
