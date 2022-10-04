import React from 'react';
import type { ISpinnerProps, ISpinnerStyles, IOverlayStyles } from '@fluentui/react';
import { Spinner, Overlay } from '@fluentui/react';

import './UILoader.scss';

export interface UILoaderProps extends ISpinnerProps {
    blockDOM?: boolean;
    delayed?: boolean;
}

/**
 * UILoader component
 * based on https://developer.microsoft.com/en-us/fluentui#/controls/web/spinner
 *
 * @exports
 * @class UILoader
 * @extends {React.Component<ISpinnerProps, {}>}
 */
export class UILoader extends React.Component<UILoaderProps, {}> {
    /**
     * Initializes component properties.
     *
     * @param {UILoaderProps} props
     */
    public constructor(props: UILoaderProps) {
        super(props);
    }

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        const { blockDOM, delayed } = this.props;
        const loaderStyles = (): Partial<ISpinnerStyles> => ({
            ...{
                root: {
                    ...(blockDOM && { height: '100%' })
                },
                circle: [
                    {
                        borderColor:
                            'var(--vscode-progressBar-background) var(--vscode-terminal-ansiBrightWhite) var(--vscode-terminal-ansiBrightWhite)',
                        borderWidth: 2,
                        zIndex: 1
                    }
                ],
                label: {
                    color: 'var(--vscode-foreground)',
                    fontSize: 14,
                    fontWeight: 'bold',
                    zIndex: 1
                }
            }
        });
        const spinner = <Spinner {...this.props} styles={loaderStyles} />;
        if (!blockDOM) {
            return spinner;
        } else {
            const overlayStyles = (): Partial<IOverlayStyles> => ({
                ...{
                    root: {
                        backgroundColor: 'transparent',
                        selectors: {
                            '&:before': {
                                content: '""',
                                position: 'absolute',
                                inset: 0,
                                backgroundColor: 'var(--vscode-editor-background)',
                                opacity: 0.6,
                                zIndex: 1
                            }
                        }
                    }
                }
            });

            return (
                <Overlay className={`ui-loader-blocker${delayed ? ' ui-loader--delayed' : ''}`} styles={overlayStyles}>
                    {spinner}
                </Overlay>
            );
        }
    }
}
