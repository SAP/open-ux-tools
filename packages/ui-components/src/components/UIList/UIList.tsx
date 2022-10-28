import React from 'react';
import type {
    IGroup,
    IGroupedListStyles,
    IGroupRenderProps,
    IGroupHeaderProps,
    IGroupHeaderStyles,
    IListProps
} from '@fluentui/react';
import { GroupedList } from '@fluentui/react';

import { UiIcons } from '../Icons';

import './UIList.scss';
export interface ListProps {
    groups: IGroup[];
    groupProps?: IGroupRenderProps;
    items: never[];
    onSelect: (value: IGroup) => void;
    onRenderCell: (nestingDepth?: number, item?: never, index?: number) => React.ReactNode;
}

/**
 * UIList component
 * based on https://developer.microsoft.com/en-us/fluentui#/controls/web/groupedlist
 *
 * @exports
 * @class UIList
 * @extends {React.Component<ListProps, {}>}
 */
export class UIList extends React.Component<ListProps, {}> {
    /**
     * Initializes component properties.
     *
     * @param {ListProps} props
     */
    public constructor(props: ListProps) {
        super(props);
    }

    private onGroupHeaderClick = (group: IGroup): void => {
        this.props.onSelect(group);
    };

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        const HeaderStyles = (): Partial<IGroupHeaderStyles> => ({
            ...{
                root: [
                    {
                        cursor: 'pointer',
                        padding: '0 10px 0 10px',
                        selectors: {
                            '&:hover': {
                                backgroundColor: 'var(--vscode-dropdown-background)',
                                color: 'var(--vscode-dropdown-foreground)'
                            }
                        }
                    }
                ],
                groupHeaderContainer: {
                    height: 20
                },
                expandIsCollapsed: {
                    height: 16
                },
                expand: [
                    {
                        height: 20,
                        width: 30,
                        selectors: {
                            '&:hover': {
                                backgroundColor: 'var(--vscode-dropdown-background)',
                                color: 'var(--vscode-dropdown-foreground)'
                            },
                            '&:active': {
                                backgroundColor: 'var(--vscode-dropdown-background)',
                                color: 'var(--vscode-dropdown-foreground)'
                            }
                        }
                    }
                ],
                title: {
                    fontSize: 13,
                    fontWeight: 'normal',
                    paddingLeft: 0,
                    height: 20,
                    color: 'var(--vscode-settings-textInputForeground)'
                }
            }
        });

        const HeaderProps: IGroupHeaderProps = {
            ...{
                root: {},
                expandButtonIcon: UiIcons.ArrowRight,
                expandButtonProps: {
                    style: {
                        width: 20,
                        paddingRight: 5
                    }
                },
                indentWidth: 10,
                styles: HeaderStyles,
                onGroupHeaderClick: this.onGroupHeaderClick
            }
        };

        const GroupeListStyles = (): Partial<IGroupedListStyles> => ({
            ...{
                root: [
                    {
                        color: 'var(--vscode-dropdown-foreground)',
                        paddingTop: 10,
                        paddingBottom: 10,
                        selectors: {
                            '.ms-List-cell': {
                                minHeight: 20
                            }
                        }
                    }
                ]
            }
        });

        const GroupProps: IGroupRenderProps = {
            headerProps: HeaderProps,
            isAllGroupsCollapsed: true,
            ...this.props.groupProps
        };

        const ListProps: IListProps = {};

        return (
            <GroupedList
                {...this.props}
                className="uiList"
                selectionMode={0}
                compact={true}
                styles={GroupeListStyles}
                groupProps={GroupProps}
                listProps={ListProps}
            />
        );
    }
}
