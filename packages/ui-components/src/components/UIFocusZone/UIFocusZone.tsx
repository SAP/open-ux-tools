import React from 'react';

import { FocusZone, FocusZoneDirection, FocusZoneTabbableElements, IFocusZone, IFocusZoneProps } from '@fluentui/react';
export {
    FocusZoneDirection as UIFocusZoneDirection,
    IFocusZoneProps as UIFocusZoneProps,
    IFocusZone,
    FocusZoneTabbableElements as UIFocusZoneTabbableElements
};

/**
 * UIFocusZone component
 * based on https://developer.microsoft.com/en-us/fluentui#/controls/web/focuszone
 *
 * @exports
 * @class UIFocusZone
 * @extends {React.Component<IFocusZoneProps, {}>}
 */
export class UIFocusZone extends React.Component<IFocusZoneProps, {}> {
    /**
     * Initializes component properties.
     *
     * @param {IFocusZoneProps} props
     */
    public constructor(props: IFocusZoneProps) {
        super(props);
    }

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        return <FocusZone {...this.props}>{this.props.children}</FocusZone>;
    }
}
