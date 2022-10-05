import React from 'react';

import type { IFocusTrapZoneProps } from '@fluentui/react';
import { FocusTrapZone } from '@fluentui/react';

/**
 * UIFocusTrapZone component
 * based on https://developer.microsoft.com/en-us/fluentui/#/controls/web/focustrapzone
 *
 * @exports
 * @class UIFocusTrapZone
 * @extends {React.Component<IFocusTrapZoneProps, {}>}
 */
export class UIFocusTrapZone extends React.Component<IFocusTrapZoneProps, {}> {
    /**
     * Initializes component properties.
     *
     * @param {IFocusTrapZoneProps} props
     */
    public constructor(props: IFocusTrapZoneProps) {
        super(props);
    }

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        return <FocusTrapZone {...this.props}>{this.props.children}</FocusTrapZone>;
    }
}
