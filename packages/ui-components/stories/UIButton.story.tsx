import React, { useState } from 'react';
import type { IStackTokens } from '@fluentui/react';
import { Text, Stack } from '@fluentui/react';

import {
    UIDefaultButton,
    UIIconButton,
    UIActionButton,
    UIIconButtonSizes,
    UISplitButton
} from '../src/components/UIButton';
import type { UIContextualMenuItem } from '../src/components/UIContextualMenu';
import { initIcons, UiIcons } from '../src/components/Icons';

initIcons();

export default { title: 'Basic Inputs/Buttons' };
const stackTokens: IStackTokens = { childrenGap: 40 };

export const defaultUsage = (): JSX.Element => {
    const [selection, setSelection] = useState<string>('');

    const onCallback = (key?: string) => {
        setSelection(key);
    };

    const buttonItem: UIContextualMenuItem = {
        key: 'option1',
        text: 'option 1'
    };

    const menuItems: UIContextualMenuItem[] = [
        {
            key: 'option2',
            text: 'option 2'
        },
        {
            key: 'option3',
            text: 'option 3'
        }
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
                            iconName: UiIcons.Bulb
                        }}>
                        Action
                    </UIActionButton>
                    <UIActionButton
                        disabled={true}
                        iconProps={{
                            iconName: UiIcons.Bulb
                        }}>
                        Action
                    </UIActionButton>
                </Stack>
            </Stack>
        </Stack>
    );
};
