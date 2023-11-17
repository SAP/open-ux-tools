import React from 'react';
import type {
    ICalloutProps,
    ICalloutContentStyles,
    IRawStyle,
    IStyleFunctionOrObject,
    ICalloutContentStyleProps
} from '@fluentui/react';
import { Callout, getDocument } from '@fluentui/react';
import { isHTMLElement, redirectFocusToSibling } from '../../utilities';

export interface UICalloutProps extends ICalloutProps {
    calloutMinWidth?: number;
    contentPadding?: UICalloutContentPadding;
    focusTargetSiblingOnTabPress?: boolean;
}

export const CALLOUT_STYLES = {
    background: 'var(--vscode-editorSuggestWidget-background)',
    boxShadow:
        '0 2px 6px rgb(0 0 0 / 20%), 0 0 0 1px var(--vscode-contrastBorder, var(--vscode-editorSuggestWidget-border))',
    text: 'var(--vscode-editorSuggestWidget-foreground)',
    font: 'var(--vscode-font-family)',
    borderRadius: 4
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
            backgroundColor: 'transparent',
            borderRadius: CALLOUT_STYLES.borderRadius,
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
            backgroundColor: CALLOUT_STYLES.background,
            color: CALLOUT_STYLES.text,
            fontFamily: CALLOUT_STYLES.font,
            borderRadius: CALLOUT_STYLES.borderRadius,
            minWidth: props.calloutMinWidth ?? 300,
            boxSizing: 'border-box',
            padding: CALLOUT_CONTENT_PADDING.get(props.contentPadding || UICalloutContentPadding.None),
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
     * If "focusTargetSiblingOnTabPress" property is set and 'Tab' key is pressed, then method tries to focus next/previous sibling based on target.
     *
     * @param event Keydown event
     */
    private onKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
        const { onKeyDown, focusTargetSiblingOnTabPress, target } = this.props;
        if (focusTargetSiblingOnTabPress && event.key === 'Tab' && target) {
            let targetRef: HTMLElement | null = null;
            if (typeof target === 'string') {
                const currentDoc: Document = getDocument()!;
                targetRef = currentDoc ? currentDoc.querySelector(target) : null;
            } else if ('getBoundingClientRect' in target && isHTMLElement(target)) {
                targetRef = target;
            }
            if (targetRef) {
                if (redirectFocusToSibling(targetRef, !event.shiftKey)) {
                    // Stop event bubbling to avoid default browser behavior
                    event.stopPropagation();
                    event.preventDefault();
                }
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
