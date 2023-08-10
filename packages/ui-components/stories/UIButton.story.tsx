import React, { useState } from 'react';
import { ContextualMenuItemType, IStackTokens, Icon } from '@fluentui/react';
import { Text, Stack } from '@fluentui/react';

import {
    UIDefaultButton,
    UIIconButton,
    UIActionButton,
    UIIconButtonSizes,
    UISplitButton,
    UISmallButton
} from '../src/components/UIButton';
import type { UIContextualMenuItem } from '../src/components/UIContextualMenu';
import { initIcons, UiIcons } from '../src/components/Icons';
import { UIDirectionalHint } from '../src/components/UITreeDropdown';

initIcons();

export default { title: 'Basic Inputs/Buttons' };
const stackTokens: IStackTokens = { childrenGap: 40 };

export const defaultUsage = (): JSX.Element => {
    const [selection, setSelection] = useState<string>('');

    const onCallback = (key?: string) => {
        setSelection(key);
    };

    const getMenuItem = (key: string, text: string, icon?: UiIcons): UIContextualMenuItem => {
        const item: UIContextualMenuItem = {
            key,
            text
        };
        if (icon) {
            item.iconProps = {
                iconName: UiIcons.GuidedDevelopment
            };
        }
        return item;
    };

    const buttonItem: UIContextualMenuItem = getMenuItem('option1', 'option 1');

    const menuItems: UIContextualMenuItem[] = [getMenuItem('option2', 'option 2'), getMenuItem('option3', 'option 3')];

    const menuItemsWithIcon = menuItems.map((source) => ({
        ...source,
        iconProps: {
            iconName: UiIcons.GuidedDevelopment
        }
    }));

    const menuItemsWithSeparators: UIContextualMenuItem[] = [
        getMenuItem('option1', 'option 1'),
        getMenuItem('option2', 'option 2'),
        {
            key: '',
            itemType: ContextualMenuItemType.Divider
        },
        getMenuItem('option3', 'option 3'),
        getMenuItem('option4', 'option 4'),
        getMenuItem('option5', 'option 5'),
        {
            key: '',
            itemType: ContextualMenuItemType.Header,
            text: 'Dummy header'
        },
        getMenuItem('option6', 'option 6'),
        getMenuItem('option7', 'option 7'),
        getMenuItem('option8', 'option 8'),
        //getMenuItem('option9', 'option 9', UiIcons.Beginner),
        getMenuItem('option10', 'option 10'),
        getMenuItem('option11', 'option 11'),
        getMenuItem('option12', 'option 12')
    ];

    return (
        <Stack tokens={stackTokens}>
            <Stack tokens={stackTokens}>
                <Text variant={'large'} className="textColor" block>
                    Primary Button
                </Text>
                <Stack horizontal tokens={stackTokens}>
                    <UIDefaultButton primary>Primary button</UIDefaultButton>
                    <UIDefaultButton primary disabled>
                        Primary disabled button
                    </UIDefaultButton>
                    <UIDefaultButton primary iconProps={{ iconName: 'ArrowLeft13x13' }}>
                        Primary button with icon
                    </UIDefaultButton>
                </Stack>
            </Stack>
            <Stack tokens={stackTokens}>
                <Text variant={'large'} className="textColor" block>
                    Secondary Button
                </Text>
                <Stack horizontal tokens={stackTokens}>
                    <UIDefaultButton>Secondary button</UIDefaultButton>
                    <UIDefaultButton disabled>Secondary disabled button</UIDefaultButton>
                    <UIDefaultButton iconProps={{ iconName: 'ArrowLRight13x13' }}>
                        Secondary button with icon
                    </UIDefaultButton>
                </Stack>
            </Stack>
            <Stack tokens={stackTokens}>
                <Text variant={'large'} className="textColor" block>
                    Split Button
                </Text>
                <Stack horizontal tokens={stackTokens}>
                    <UISplitButton
                        id="test"
                        callback={onCallback.bind(this)}
                        menuItems={menuItems}
                        button={buttonItem}
                    />
                    <UISplitButton
                        id="test2"
                        callback={onCallback.bind(this)}
                        menuItems={menuItemsWithIcon}
                        button={buttonItem}
                    />
                    <UISplitButton
                        id="test3"
                        callback={onCallback.bind(this)}
                        menuItems={menuItemsWithSeparators}
                        button={buttonItem}
                    />
                    <span>selection: {selection}</span>
                </Stack>
            </Stack>
            <Stack tokens={stackTokens}>
                <Text variant={'large'} className="textColor" block>
                    Icon Button
                </Text>
                <Stack horizontal tokens={stackTokens}>
                    <UIIconButton
                        id="undo-button-action"
                        iconProps={{ iconName: UiIcons.Undo }}
                        title="Undo"></UIIconButton>
                    <UIIconButton
                        id="add-button-action"
                        iconProps={{ iconName: UiIcons.Add }}
                        title="Undo"></UIIconButton>
                    <UIIconButton
                        id="wide-button-action"
                        sizeType={UIIconButtonSizes.Wide}
                        iconProps={{ iconName: UiIcons.QuestionMarkWithChevron }}
                        title="QuestionMarkWithChevron"></UIIconButton>
                    <UIIconButton
                        id="undo-disabled-button-action"
                        iconProps={{ iconName: UiIcons.Source }}
                        disabled={true}
                        title="Undo"></UIIconButton>
                </Stack>
            </Stack>
            <Stack tokens={stackTokens}>
                <Text variant={'large'} className="textColor" block>
                    Action Button
                </Text>
                <Stack horizontal tokens={stackTokens}>
                    <UIActionButton
                        iconProps={{
                            iconName: UiIcons.Calendar
                        }}>
                        Standard Action
                    </UIActionButton>
                    <UIActionButton
                        disabled={true}
                        iconProps={{
                            iconName: UiIcons.Calendar
                        }}>
                        Standard Action - disabled
                    </UIActionButton>
                    <UIActionButton
                        iconProps={{
                            iconName: UiIcons.Bulb
                        }}>
                        Icon with color
                    </UIActionButton>
                    <UIActionButton
                        disabled={true}
                        iconProps={{
                            iconName: UiIcons.Bulb
                        }}>
                        Icon with color - disabled
                    </UIActionButton>
                    <UIActionButton
                        iconProps={{
                            iconName: UiIcons.Bulb
                        }}
                        menuProps={{
                            directionalHint: UIDirectionalHint.bottomRightEdge,
                            directionalHintFixed: false,
                            items: menuItemsWithIcon
                        }}>
                        Button with menu
                    </UIActionButton>
                </Stack>
            </Stack>

            <Stack tokens={stackTokens}>
                <Text variant={'large'} className="textColor" block>
                    Small Button
                </Text>
                <Stack horizontal tokens={stackTokens}>
                    <UISmallButton primary>Clear All</UISmallButton>
                </Stack>
            </Stack>

            <Stack tokens={stackTokens}>
                <Text variant={'large'} className="textColor" block>
                    Dropdown Button
                </Text>
                <Stack horizontal tokens={stackTokens}>
                    <UIIconButton
                        iconProps={{ iconName: UiIcons.Add }}
                        menuProps={{
                            directionalHint: UIDirectionalHint.bottomRightEdge,
                            directionalHintFixed: false,
                            items: menuItems
                        }}
                    />

                    <UIIconButton
                        iconProps={{ iconName: UiIcons.Add }}
                        menuProps={{
                            directionalHint: UIDirectionalHint.bottomRightEdge,
                            directionalHintFixed: false,
                            items: menuItemsWithIcon
                        }}
                    />

                    <UIIconButton
                        iconProps={{ iconName: UiIcons.Add }}
                        menuProps={{
                            directionalHint: UIDirectionalHint.bottomRightEdge,
                            directionalHintFixed: false,
                            items: menuItemsWithSeparators
                        }}
                    />
                </Stack>
            </Stack>
        </Stack>
    );
};
