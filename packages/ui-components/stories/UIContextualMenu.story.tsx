import React from 'react';
import { Text, Stack } from '@fluentui/react';
import type { IStackTokens } from '@fluentui/react';

import { UIContextualMenu } from '../src/components/UIContextualMenu';
import { UIDefaultButton, UIIconButton } from '../src/components/UIButton';
import { initIcons, UiIcons } from '../src/components/Icons';

initIcons();

export default { title: 'Dropdowns/ContextualMenu' };
const stackTokens: IStackTokens = { childrenGap: 40 };

const items = [
    {
        key: 'item1',
        text: 'menu item 1',
        onClick: () => console.log('New clicked')
    },
    {
        key: 'item2',
        text: 'menu item 2',
        subMenuProps: {
            items: [
                { key: 'submenuitem1', text: 'submenu item 1' },
                {
                    key: 'submenuitem2',
                    text: 'submenu item 2',
                    split: true,
                    subMenuProps: {
                        items: [
                            { key: 'submenuitem21', text: 'submenu item 21', canCheck: true, checked: true },
                            { key: 'submenuitem22', text: 'submenu item 22', canCheck: true }
                        ]
                    }
                },
                { key: 'submenuitem3', text: 'submenu item 3' },
                { key: 'submenuitem4', text: 'submenu item 1' },
                { key: 'submenuitem5', text: 'submenu item 2' },
                { key: 'submenuitem6', text: 'submenu item 3' }
            ]
        }
    }
];

export const ContextualMenu = (): JSX.Element => {
    const menuAnchorRef = React.useRef(null);
    const [showContextualMenu, setShowContextualMenu] = React.useState(false);
    const onShowContextualMenu = React.useCallback(() => {
        setShowContextualMenu(true);
    }, []);
    const onHideContextualMenu = React.useCallback(() => setShowContextualMenu(false), []);

    return (
        <Stack tokens={stackTokens}>
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
                    items={items}
                    onDismiss={onHideContextualMenu}
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
                        <UIDefaultButton primary text="Toggle Contextual menu" menuProps={{ items }} />
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
                        <UIIconButton iconProps={{ iconName: UiIcons.Undo }} menuProps={{ items }} />
                    </Stack>
                </Stack>
            </Stack>
        </Stack>
    );
};
