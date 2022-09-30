import React from 'react';
import type { IOverlayProps, IOverlayStyles } from '@fluentui/react';
import { Overlay } from '@fluentui/react';

/**
 * UILoader component
 * based on https://developer.microsoft.com/en-us/fluentui#/controls/web/overlay
 *
 * @exports
 * @class UIOverlay
 * @extends {React.Component<IOverlayProps, {}>}
 */
export class UIOverlay extends React.Component<IOverlayProps, {}> {
    /**
     * Initializes component properties.
     *
     * @param {IOverlayProps} props
     */
    public constructor(props: IOverlayProps) {
        super(props);
    }

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        const overlayStyles = (): Partial<IOverlayStyles> => ({
            ...{
                root: {}
            }
        });

        return (
            <Overlay {...this.props} styles={overlayStyles}>
                {this.props.children}
            </Overlay>
        );
    }
}
