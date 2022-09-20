import React, { useState } from 'react';
import type { IStackTokens } from '@fluentui/react';
import { Text, Stack } from '@fluentui/react';
import { UIToggleGroup } from '../src/components/UIToggleGroup';
import { initIcons } from '../src/components/Icons';

initIcons();

export default { title: 'Basic Inputs/Toggle/Group' };
const stackTokens: IStackTokens = { childrenGap: 40 };

export const defaultUsage = (): JSX.Element => {
    const [selection, setSelection] = useState<string>('');
    const options = [
        {
            key: 'high',
            text: 'H',
            ariaLabel: 'High',
            title: 'High'
        },
        {
            key: 'medium',
            text: 'M',
            ariaLabel: 'Medium',
            title: 'Medium'
        },
        {
            key: 'low',
            text: 'L',
            ariaLabel: 'Low',
            title: 'Low'
        }
    ];
    const options_with_disabled = [
        {
            key: 'high',
            text: 'H'
        },
        {
            key: 'medium',
            text: 'M',
            disabled: true
        },
        {
            key: 'low',
            text: 'L'
        }
    ];
    const options_with_icons = [
        {
            key: 'chart',
            icon: 'Chart'
        },
        {
            key: 'star',
            icon: 'Star'
        },
        {
            key: 'settings',
            icon: 'Settings'
        }
    ];
    const onChange = (key: string, selected: boolean) => {
        if (selected) {
            setSelection(key);
        } else {
            setSelection('');
        }
    };

    return (
        <Stack
            tokens={stackTokens}
            style={{
                width: 300
            }}>
            <Text variant="large" className="textColor">
                UIToggleGroup
            </Text>

            <Stack tokens={{ childrenGap: 16 }}>
                <Text variant="medium" className="textColor">
                    UIToggleGroup, default usage
                </Text>
                <UIToggleGroup options={options} label="Test" ariaLabel="test" onChange={onChange.bind(this)} />
                <span>selection: {selection}</span>
            </Stack>

            <Stack tokens={{ childrenGap: 16 }}>
                <Text variant="medium" className="textColor">
                    UIToggleGroup, required value
                </Text>
                <UIToggleGroup options={options} label="Test" required={true} />
            </Stack>

            <Stack tokens={{ childrenGap: 16 }}>
                <Text variant="medium" className="textColor">
                    UIToggleGroup, with default selected value
                </Text>
                <UIToggleGroup options={options} label="Test" selectedKey="medium" />
            </Stack>

            <Stack tokens={{ childrenGap: 16 }}>
                <Text variant="medium" className="textColor">
                    UIToggleGroup, with a disabled option
                </Text>
                <UIToggleGroup options={options_with_disabled} label="Test" />
            </Stack>

            <Stack tokens={{ childrenGap: 16 }}>
                <Text variant="medium" className="textColor">
                    UIToggleGroup, with icons option
                </Text>
                <UIToggleGroup options={options_with_icons} label="Test" />
            </Stack>
        </Stack>
    );
};
