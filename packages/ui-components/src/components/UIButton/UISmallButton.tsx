import React from 'react';
import type { IButtonProps, IButtonStyles } from '@fluentui/react';
import { DefaultButton } from '@fluentui/react';

/**
 *
 */
export class UISmallButton extends React.Component<IButtonProps, {}> {
    private buttonSecondaryForeground = '--vscode-button-secondaryForeground';

    /**
     * Initializes component properties.
     *
     * @param {IButtonProps} props The props of the component.
     */
    public constructor(props: IButtonProps) {
        super(props);
    }

    /**
     * Method which returns the correct css color.
     *
     * @param {string} color First choise color.
     * @returns {string} CSS value for background color with fallback.
     */
    private getColor(color: string): string {
        return `var(${color})`;
    }

    /**
     * Method which returns the correct css color with a fallback value.
     *
     * @param {string} color First choise color.
     * @param {string} fallbackColor fallback choise color.
     * @returns {string} CSS value for background color with fallback.
     */
    private getColorwithFallback(color: string, fallbackColor: string): string {
        return `var(${color}, ${fallbackColor})`;
    }

    protected setStyle = (props: IButtonProps): IButtonStyles => {
        return {
            root: {
                minWidth: 'initial',
                height: 16,
                fontSize: '11px',
                fontWeight: 400,
                borderRadius: 20,
                paddingLeft: 13,
                paddingRight: 13,
                backgroundColor: 'var(--vscode-button-secondaryBackground, #5f6a79)',
                borderColor: 'var(--vscode-contrastBorder, var(--vscode-button-secondaryBackground, #5f6a79))',
                color: this.getColorwithFallback(this.buttonSecondaryForeground, '#ffffff'),

                ...(props.primary && {
                    backgroundColor: this.getColor('--vscode-button-background'),
                    borderColor: 'var(--vscode-contrastBorder, var(--vscode-button-background))',
                    color: this.getColor('--vscode-button-foreground')
                }),

                selectors: {
                    '.ms-Fabric--isFocusVisible &:focus:after': {
                        outlineColor: 'var(--vscode-focusBorder)',
                        inset: -3
                    }
                }
            },
            label: {
                marginLeft: 0,
                marginRight: 0,
                fontWeight: 400,
                lineHeight: 11,
                whiteSpace: 'nowrap'
            },
            rootDisabled: {
                opacity: '0.5 !important',
                backgroundColor: 'var(--vscode-button-secondaryBackground,#5f6a79)',
                borderColor: 'var(--vscode-button-secondaryBackground, #5f6a79)',
                color: this.getColorwithFallback(this.buttonSecondaryForeground, '#ffffff'),
                ...(props.primary && {
                    opacity: '0.5 !important',
                    color: this.getColor('--vscode-button-foreground'),
                    backgroundColor: 'var(--vscode-button-background)',
                    borderColor: 'var(--vscode-button-background)'
                })
            },
            rootHovered: {
                color: this.getColorwithFallback(this.buttonSecondaryForeground, '#ffffff'),
                backgroundColor: 'var(--vscode-button-secondaryHoverBackground, #4c5561)',
                borderColor:
                    'var(--vscode-contrastActiveBorder, var(--vscode-button-secondaryHoverBackground, #4c5561))',
                selectors: {
                    'svg > path, svg > rect': {
                        fill: this.getColorwithFallback(this.buttonSecondaryForeground, '#ffffff')
                    }
                },
                ...(props.primary && {
                    color: 'var(--vscode-button-foreground)',
                    backgroundColor: 'var(--vscode-button-hoverBackground)',
                    borderColor: 'var(--vscode-contrastActiveBorder, var(--vscode-button-hoverBackground))',
                    selectors: {
                        'svg > path, svg > rect': {
                            fill: 'var(--vscode-button-foreground)'
                        }
                    }
                })
            }
        };
    };

    /**
     * @returns {JSX.Element} the rendered component.
     */
    render(): JSX.Element {
        return <DefaultButton {...this.props} styles={this.setStyle(this.props)} />;
    }
}
