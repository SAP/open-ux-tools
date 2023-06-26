import React from 'react';
import type { ButtonProps } from '../UIButton';
import { UIIconButton } from '../UIButton';
import { UILoader } from '../UILoader';
import type { UILoadButtonBusyProps } from './UITranslationButton.types';

import './UILoadButton.scss';

export interface UILoadButtonState {
    busy?: boolean;
}

type UILoadButtonProps = ButtonProps & UILoadButtonBusyProps;

/**
 * Component to render load button with spin indicator.
 */
export class UILoadButton extends React.Component<UILoadButtonProps, UILoadButtonState> {
    private minLoaderTimer: number | undefined = undefined;
    /**
     * Constructor method for load button.
     *
     * @param props Component properties.
     */
    constructor(props: UILoadButtonProps) {
        super(props);
        this.state = this.getBusyState(props, {}) || {};
    }

    /**
     * Method handles component update to refresh busy state.
     *
     * @param prevProps Component previous properties.
     */
    componentDidUpdate(prevProps: UILoadButtonProps): void {
        if (prevProps.busy === this.props.busy) {
            return;
        }
        const state = this.getBusyState(this.props, this.state);
        if (state) {
            this.setState(state);
        }
    }

    componentWillUnmount(): void {
        if (this.minLoaderTimer) {
            window.clearTimeout(this.minLoaderTimer);
        }
    }

    /**
     * Method handles end of minimal waiting time.
     */
    private handleMinWaitingTime(): void {
        this.minLoaderTimer = undefined;
        if (!this.props.busy) {
            // External busy flag is false, but we were waiting for minimal timeout
            this.setState({
                busy: false
            });
        }
    }

    /**
     * Method returns latest busy state by checking current state and props.
     *
     * @param props Current props.
     * @param state Current state.
     * @returns Busy state.
     */
    private getBusyState(props: UILoadButtonProps, state: UILoadButtonState): UILoadButtonState | undefined {
        let newState: UILoadButtonState | undefined;
        if (props.busy !== state.busy) {
            if (!props.busy && !this.minLoaderTimer) {
                newState = {
                    busy: false
                };
            } else if (props.busy) {
                newState = {
                    busy: true
                };
                window.clearTimeout(this.minLoaderTimer);
                if (props.useMinWaitingTime) {
                    this.minLoaderTimer = window.setTimeout(
                        this.handleMinWaitingTime.bind(this),
                        this.getMinimalWaitingTime()
                    );
                }
            }
        }
        return newState;
    }

    /**
     * Method returns minimal waiting time for loader depending on passed 'useMinWaitingTime' property.
     *
     * @returns Minimal waiting time for busy loader.
     */
    private getMinimalWaitingTime(): number {
        const { useMinWaitingTime } = this.props;
        return !useMinWaitingTime || typeof useMinWaitingTime === 'boolean' ? 500 : useMinWaitingTime;
    }

    /**
     * Method to render load button component.
     *
     * @returns Load button component.
     */
    render(): React.ReactElement {
        const { children } = this.props;
        const { busy } = this.state;
        let { className = '' } = this.props;

        const content = busy ? <UILoader className={'uiLoaderXSmall'} labelPosition={'right'} /> : children;
        if (busy) {
            const busyClassName = 'loading-button';
            className = className ? `${className} ${busyClassName}` : busyClassName;
        }
        return (
            <UIIconButton {...this.props} onClick={busy ? undefined : this.props.onClick} className={className}>
                {content}
            </UIIconButton>
        );
    }
}
