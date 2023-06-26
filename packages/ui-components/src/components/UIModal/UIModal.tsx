import React from 'react';
import type { IModalProps, IModalStyles } from '@fluentui/react';
import { Modal } from '@fluentui/react';

/**
 * UIModal component
 * based on https://developer.microsoft.com/en-us/fluentui#/controls/web/Modal
 *
 * @exports
 * @class UIModal
 * @extends {React.Component<IModalProps, {}>}
 */
export class UIModal extends React.Component<IModalProps, {}> {
    /**
     * Initializes component properties.
     *
     * @param {IModalProps} props
     */
    public constructor(props: IModalProps) {
        super(props);
    }

    protected setStyle = (): IModalStyles => {
        return {
            root: {},
            keyboardMoveIcon: {},
            keyboardMoveIconContainer: {},
            layer: {},
            main: {},
            scrollableContent: {}
        };
    };

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        return <Modal {...this.props} styles={this.setStyle()} />;
    }
}
