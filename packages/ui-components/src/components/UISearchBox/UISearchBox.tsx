import React from 'react';

import type { ISearchBoxProps, ISearchBoxStyleProps, ISearchBoxStyles } from '@fluentui/react';
import { SearchBox } from '@fluentui/react';

import { UiIcons } from '../Icons';

const searchIcon = { iconName: UiIcons.Search };

/**
 * UISearchBox component
 * based on https://developer.microsoft.com/en-us/fluentui#/controls/web/searchbox
 *
 * @exports
 * @class UISearchBox
 * @extends {React.Component<ISearchBoxProps, {}>}
 */
export class UISearchBox extends React.Component<ISearchBoxProps, {}> {
    /**
     * Initializes component properties.
     *
     * @param {ISearchBoxProps} props
     */
    public constructor(props: ISearchBoxProps) {
        super(props);
    }

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        const searchBoxStyles = (props: ISearchBoxStyleProps): Partial<ISearchBoxStyles> => ({
            ...{
                root: [
                    {
                        fontFamily: 'var(--vscode-font-family)',
                        fontSize: 13,
                        backgroundColor: 'var(--vscode-input-background)',
                        border: '1px solid var(--vscode-editorWidget-border)',
                        borderRadius: 0,
                        height: 22,
                        width: '100%',
                        boxSizing: 'initial',
                        selectors: {
                            '&:hover': {
                                border: '1px solid var(--vscode-focusBorder)'
                            }
                        }
                    },
                    props.hasFocus && {
                        selectors: {
                            ':after': {
                                border: `1px solid var(--vscode-focusBorder)`,
                                inset: -1,
                                borderRadius: 0
                            }
                        }
                    },
                    props.disabled && {
                        color: 'var(--vscode-input-foreground)',
                        opacity: 0.2,
                        backgroundColor: 'var(--vscode-input-background)',
                        borderColor: 'var(--vscode-input-background)',
                        borderRadius: 0,
                        height: 22,
                        maxHeight: 22,
                        minHeight: 22,
                        boxSizing: 'initial'
                    }
                ],
                field: [
                    {
                        backgroundColor: 'var(--vscode-input-background)',
                        color: 'var(--vscode-input-foreground)',
                        lineHeight: 22,
                        height: 22,
                        maxHeight: 22,
                        minHeight: 22,
                        fontSize: 13,
                        fontWeight: 'normal',
                        boxSizing: 'border-box',
                        selectors: {
                            '::placeholder': {
                                color: 'var(--vscode-input-placeholderForeground)'
                            }
                        }
                    },
                    {
                        [':focus']: {
                            outline: 0
                        }
                    },
                    props.hasFocus && {
                        selectors: {
                            ':after': {
                                border: `1px solid var(--vscode-focusBorder')`
                            }
                        }
                    }
                ],
                iconContainer: [
                    {
                        alignItems: 'flex-start',
                        marginLeft: 5,
                        height: 16,
                        width: 23,
                        cursor: 'text',
                        paddingTop: 5,
                        transition: 'width 0.167s ease 0s',
                        selectors: {
                            svg: {
                                width: 16
                            },
                            'svg > g': {
                                fill: 'var(--vscode-foreground)'
                            }
                        }
                    },
                    props.hasFocus && {
                        width: 4,
                        marginLeft: 0
                    }
                ],
                clearButton: [
                    {
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'stretch',
                        cursor: 'pointer',
                        flexBasis: '16px',
                        flexShrink: 0,
                        padding: 0,
                        margin: '-1px 0px',
                        selectors: {
                            '&:hover .ms-Button': {
                                backgroundColor: 'var(--vscode-input-background)'
                            },
                            '&:hover .ms-Button-icon': {
                                color: 'var(--vscode-input-foreground)'
                            },
                            '.ms-Button': {
                                borderRadius: 0
                            },
                            '.ms-Button-icon': {
                                color: 'var(--vscode-input-foreground)'
                            }
                        }
                    }
                ]
            }
        });

        return <SearchBox {...this.props} styles={searchBoxStyles} iconProps={searchIcon} />;
    }
}
