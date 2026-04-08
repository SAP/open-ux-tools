import React from 'react';

import type { IFocusZoneProps, IFocusZone } from '@fluentui/react';
import { FocusZone, FocusZoneDirection, FocusZoneTabbableElements } from '@fluentui/react';
export {
    FocusZoneDirection as UIFocusZoneDirection,
    FocusZoneTabbableElements as UIFocusZoneTabbableElements,
    type IFocusZoneProps as UIFocusZoneProps,
    type IFocusZone
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
