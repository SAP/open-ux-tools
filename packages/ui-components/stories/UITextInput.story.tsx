import React from 'react';
import type { IStackTokens } from '@fluentui/react';
import { Text, Stack, Separator } from '@fluentui/react';

import { UITextInput } from '../src/components/UIInput';
import { initIcons } from '../src/components/Icons';

export default { title: 'Basic Inputs/Input' };

initIcons();

const stackTokens: IStackTokens = { childrenGap: 40 };
const iconFolderProps = { iconName: 'FolderOpened' };

export const defaultUsage = () => {
    return (
        <Stack
            tokens={stackTokens}
            style={{
                width: 300
            }}>
            <Stack tokens={{ childrenGap: 16 }}>
                <Text variant="large" className="textColor">
                    UIInput
                </Text>
                <UITextInput label="Enter your name"></UITextInput>
            </Stack>

            <Stack tokens={{ childrenGap: 16 }}>
                <Text variant="large" className="textColor">
                    UIInput with icon
                </Text>
                <UITextInput label="Select your folder" iconProps={iconFolderProps}></UITextInput>
            </Stack>

            <Stack tokens={{ childrenGap: 16 }}>
                <Text variant="large" className="textColor">
                    UIInput disabled
                </Text>
                <UITextInput label="Enter your name" disabled></UITextInput>
            </Stack>
        </Stack>
    );
};

export const withMessages = () => {
    const message = 'Dummy message';

    return (
        <Stack
            tokens={stackTokens}
            style={{
                width: '100%'
            }}>
            <Stack
                tokens={{ childrenGap: 16 }}
                style={{
                    width: 300
                }}>
                <Text variant="large" className="textColor">
                    UIInput with error message
                </Text>
                <UITextInput label="input field label" errorMessage={message}></UITextInput>
            </Stack>
            <Separator />

            <Stack
                tokens={{ childrenGap: 16 }}
                style={{
                    width: 300
                }}>
                <Text variant="large" className="textColor">
                    UIInput with warning message
                </Text>
                <UITextInput label="input field label" warningMessage={message}></UITextInput>
            </Stack>
            <Separator />

            <Stack
                tokens={{ childrenGap: 16 }}
                style={{
                    width: 300
                }}>
                <Text variant="large" className="textColor">
                    UIInput with info message
                </Text>
                <UITextInput label="input field label" infoMessage={message}></UITextInput>
            </Stack>
        </Stack>
    );
};
