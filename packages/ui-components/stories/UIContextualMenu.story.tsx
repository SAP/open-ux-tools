import React from 'react';
import { Text, Stack } from '@fluentui/react';
import type { IDropdownOption, IStackTokens } from '@fluentui/react';

import {
    UIContextualMenu,
    UIContextualMenuItem,
    UIContextualMenuItemType,
    UIContextualMenuLayoutType
} from '../src/components/UIContextualMenu';
import { UIDefaultButton, UIIconButton } from '../src/components/UIButton';
import { UIDirectionalHint } from '../src/components/UITreeDropdown';
import { initIcons, UiIcons } from '../src/components/Icons';
import { UIDropdown } from '../src/components/UIDropdown';

initIcons();

export default { title: 'Dropdowns/ContextualMenu' };
const stackTokens: IStackTokens = { childrenGap: 40 };
function getItems(iconsToLeft = false): UIContextualMenuItem[] {
    return [
        {
            key: 'item1',
            text: 'menu item 1',
            title: 'menu item 1',
            onClick: () => console.log('New clicked')
        },
        {
            key: 'item2',
            text: 'menu item 2',
            title: 'menu item 2',
            subMenuProps: {
                ...(iconsToLeft && { directionalHint: UIDirectionalHint.leftTopEdge }),
                items: [
                    { key: 'submenuitem1', text: 'submenu item 1' },
                    {
                        key: 'submenuitem2',
                        text: 'submenu item 2',
                        title: 'submenu item 2',
                        // split: true,
                        subMenuProps: {
                            ...(iconsToLeft && { directionalHint: UIDirectionalHint.leftTopEdge }),
                            items: [
                                {
                                    key: 'submenuitem21',
                                    text: 'submenu item 21',
                                    title: 'submenu item 21',
                                    canCheck: true,
                                    checked: true
                                },
                                {
                                    key: 'submenuitem22',
                                    text: 'submenu item 22',
                                    title: 'submenu item 22',
                                    canCheck: true
                                }
                            ]
                        }
                    },
                    { key: 'submenuitem3', text: 'submenu item 3', title: 'submenu item 3' },
                    { key: 'submenuitem4', text: 'submenu item 1', title: 'submenu item 1' },
                    { key: 'submenuitem5', text: 'submenu item 2', title: 'submenu item 2' },
                    { key: 'submenuitem6', text: 'submenu item 3', title: 'submenu item 3' }
                ]
            }
        }
    ];
}

const layoutOptions: IDropdownOption[] = [
    UIContextualMenuLayoutType.ContextualMenu,
    UIContextualMenuLayoutType.DropdownMenu
].map((type) => ({
    key: type.toString(),
    text: type.toString()
}));

export const ContextualMenu = (): JSX.Element => {
    const menuAnchorRef = React.useRef(null);
    const [layoutType, setLayoutType] = React.useState<UIContextualMenuLayoutType>(
        UIContextualMenuLayoutType.ContextualMenu
    );
    const [showContextualMenu, setShowContextualMenu] = React.useState(false);
    const onShowContextualMenu = React.useCallback(() => {
        setShowContextualMenu(true);
    }, []);
    const onHideContextualMenu = React.useCallback(() => setShowContextualMenu(false), []);

    return (
        <Stack tokens={stackTokens}>
            <UIDropdown
                label="Layout"
                options={layoutOptions}
                selectedKey={layoutType.toString()}
                onChange={(ev, option) => {
                    if (option) {
                        setLayoutType(UIContextualMenuLayoutType[option.key]);
                    }
                }}
            />
            <Stack tokens={{ childrenGap: 16 }}>
                <Text variant={'large'} block>
                    {'Default UIContextualMenu rendering'}
                </Text>
                <span ref={menuAnchorRef} onClick={onShowContextualMenu}>
                    Click for ContextualMenu
                </span>
                <UIContextualMenu
                    hidden={!showContextualMenu}
                    target={menuAnchorRef}
                    items={getItems()}
                    onDismiss={onHideContextualMenu}
                    layoutType={layoutType}
                />
            </Stack>

            <Stack tokens={{ childrenGap: 16 }}>
                <Text variant={'large'} block>
                    As menuProps of a UIButton elements
                </Text>
                <Stack horizontal tokens={stackTokens}>
                    <Stack tokens={{ childrenGap: 8 }}>
                        <Text variant={'small'} block>
                            UIDefaultButton
                        </Text>
                        <UIDefaultButton
                            primary
                            text="Toggle Contextual menu"
                            menuProps={{ items: getItems(), layoutType }}
                        />
                    </Stack>
                </Stack>
            </Stack>

            <Stack tokens={{ childrenGap: 16 }}>
                <Text variant={'large'} block>
                    As menuProps of a UIIconButton
                </Text>
                <Stack horizontal tokens={stackTokens}>
                    <Stack tokens={{ childrenGap: 8 }}>
                        <Text variant={'small'} block>
                            UIIconButton
                        </Text>
                        <UIIconButton
                            iconProps={{ iconName: UiIcons.Undo }}
                            menuProps={{ items: getItems(), layoutType }}
                        />
                    </Stack>
                </Stack>
            </Stack>
            <Stack tokens={{ childrenGap: 16 }}>
                <Text variant={'large'} block>
                    As menuProps with beak and showSubmenuBeneath - iconToLeft and open the menu towards left
                </Text>
                <Stack horizontal tokens={stackTokens} horizontalAlign="center">
                    <Stack tokens={{ childrenGap: 8 }}>
                        <Text variant={'small'} block>
                            UIIconButton
                        </Text>
                        <UIIconButton
                            iconProps={{ iconName: UiIcons.ArrowLeft }}
                            menuProps={{
                                items: getItems(true),
                                isBeakVisible: true,
                                iconToLeft: true,
                                layoutType,
                                showSubmenuBeneath: true
                            }}
                        />
                    </Stack>
                </Stack>
            </Stack>
        </Stack>
    );
};
