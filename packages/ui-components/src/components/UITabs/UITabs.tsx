import React from 'react';

import type { IPivotProps, IPivotStyles } from '@fluentui/react';
import { Pivot, PivotItem } from '@fluentui/react';

export { PivotItem as UITabsItem };

export interface UITabsProps extends IPivotProps {
    items: string[];
}
/**
 * UITabs component.
 * based on https://developer.microsoft.com/en-us/fluentui#/controls/web/pivot
 *
 * @exports
 * @class UITabs
 * @extends {React.Component<IPivotProps, {}>}
 */
export class UITabs extends React.Component<UITabsProps, {}> {
    /**
     * Initializes component properties.
     *
     * @param {UITabsProps} props
     */
    public constructor(props: UITabsProps) {
        super(props);
    }

    protected setTabsStyle = (): Partial<IPivotStyles> => {
        return {
            root: {
                color: 'var(--vscode-tab-activeForeground)',
                borderBottom: '1px solid var(--vscode-dropdown-border)'
            },
            link: {
                color: 'var(--vscode-tab-inactiveForeground)',
                selectors: {
                    '&:active, &:hover': {
                        backgroundColor: 'transparent',
                        color: 'var(--vscode-tab-activeForeground)'
                    }
                }
            },
            linkIsSelected: {
                color: 'var(--vscode-tab-activeForeground)',
                selectors: {
                    '&:before': {
                        height: 1,
                        transition: 'none',
                        left: 0,
                        right: 0,
                        backgroundColor: 'var(--vscode-inputOption-activeForeground)'
                    }
                }
            },
            linkContent: {},
            text: {
                fontFamily: 'var(--vscode-font-family)',
                fontSize: 13
            }
        };
    };

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        return (
            <Pivot {...this.props} styles={this.setTabsStyle()}>
                {this.props.items.map((itemValue: string) => {
                    return <PivotItem headerText={itemValue} key={itemValue} itemKey={itemValue}></PivotItem>;
                })}
            </Pivot>
        );
    }
}
