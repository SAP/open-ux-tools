import React from 'react';
import type { IStackTokens } from '@fluentui/react';
import { Text, Stack, Separator } from '@fluentui/react';

import { UITextInput } from '../src/components/UIInput';
import { UICheckbox } from '../src/components/UICheckbox';

export default { title: 'Basic Inputs/Input' };

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

export const accessibilityStates = () => {
    const [multiline, setMultiline] = React.useState(false);
    const [value, setValue] = React.useState('Content');
    const testProps = {
        multiline,
        onChange: (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) => {
            setValue(newValue || '');
        }
    };
    return (
        <div>
            <Stack horizontal tokens={stackTokens}>
                <UICheckbox
                    label="Multi Line"
                    checked={multiline}
                    onChange={(event: any, value: any) => {
                        setMultiline(value);
                    }}
                />
            </Stack>
            <Stack horizontal tokens={stackTokens}>
                <table
                    style={{
                        borderSpacing: 20,
                        width: '100%',
                        maxWidth: 750
                    }}>
                    <tr>
                        <td
                            style={{
                                minWidth: 100,
                                width: 150
                            }}></td>
                        <td
                            style={{
                                width: '50%'
                            }}>
                            Placeholder Text
                        </td>
                        <td
                            style={{
                                width: '50%'
                            }}>
                            Input Text
                        </td>
                    </tr>
                    <tr>
                        <td>Regular</td>
                        <td>
                            <UITextInput {...testProps} placeholder="Placeholder"></UITextInput>
                        </td>
                        <td>
                            <UITextInput {...testProps} value={value}></UITextInput>
                        </td>
                    </tr>
                    <tr>
                        <td>Error</td>
                        <td>
                            <UITextInput
                                {...testProps}
                                placeholder="Placeholder"
                                errorMessage="Dummy error"></UITextInput>
                        </td>
                        <td>
                            <UITextInput {...testProps} errorMessage="Dummy error" value={value}></UITextInput>
                        </td>
                    </tr>
                    <tr>
                        <td>Disabled</td>
                        <td>
                            <UITextInput {...testProps} placeholder="Placeholder" disabled></UITextInput>
                        </td>
                        <td>
                            <UITextInput {...testProps} value={value} disabled></UITextInput>
                        </td>
                    </tr>
                    <tr>
                        <td>Read Only</td>
                        <td>
                            <UITextInput {...testProps} placeholder="Placeholder" readOnly></UITextInput>
                        </td>
                        <td>
                            <UITextInput {...testProps} value={value} readOnly></UITextInput>
                        </td>
                    </tr>
                </table>
            </Stack>
        </div>
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
