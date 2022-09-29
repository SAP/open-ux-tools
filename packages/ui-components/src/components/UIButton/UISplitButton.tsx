import * as React from 'react';

import { UIDefaultButton } from './UIDefaultButton';
import { UIContextualMenu } from '../UIContextualMenu';
import { UiIcons } from '../Icons';
import type { UIContextualMenuProps, UIContextualMenuItem } from '../UIContextualMenu';

import { getUIId } from '../../utilities';

export interface UISplitButtonProps {
    button: UIContextualMenuItem;
    menuItems: UIContextualMenuItem[];
    callback: (key: string) => void;
    id?: string;
    ariaLabel?: string;
    ariaDescription?: string;
    disabled?: boolean;
}

export interface UISplitButtonState {
    menu: UIContextualMenuProps;
}

/**
 * UISplitButton component
 *
 * @exports
 * @class UISplitButton
 * @extends {React.Component<UISplitButtonProps, UISplitButtonState>}
 */
export class UISplitButton extends React.Component<UISplitButtonProps, UISplitButtonState> {
    id = this.props.id ? this.props.id : getUIId('ui-split-button-');
    /**
     * Initializes component properties.
     *
     * @param {UISplitButtonProps} props
     */
    public constructor(props: UISplitButtonProps) {
        super(props);

        this.state = {
            menu: {
                items: props.menuItems,
                onItemClick: this.onMenuItemClick
            }
        };

        this.onClick = this.onClick.bind(this);
    }

    public onClick = (): void => {
        this.props.callback(this.props.button.key);
    };

    public onMenuItemClick = (
        ev?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>,
        item?: UIContextualMenuItem
    ): void => {
        if (item && item.key) {
            this.props.callback(item.key);
        }
    };

    /**
     * @returns {JSX.Element}
     */
    render(): JSX.Element {
        return (
            <UIDefaultButton
                ariaLabel={this.props.ariaLabel}
                ariaDescription={this.props.ariaDescription}
                id={this.id}
                className="ui-split-button"
                primary
                split
                onClick={this.onClick.bind(this)}
                menuProps={this.state.menu}
                menuIconProps={{ iconName: UiIcons.ArrowDown }}
                menuAs={UIContextualMenu}
                disabled={this.props.disabled}>
                {this.props.button.text}
            </UIDefaultButton>
        );
    }
}
