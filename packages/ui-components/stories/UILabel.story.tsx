import React from 'react';
import type { IStackTokens } from '@fluentui/react';
import { Text, Stack } from '@fluentui/react';
import { UILabel } from '../src/components/UILabel';
import { initIcons } from '../src/components/Icons';

initIcons();

export default { title: 'Basic Inputs/Label' };
const stackTokens: IStackTokens = { childrenGap: 40 };

export const defaultUsage = (): JSX.Element => {
    return (
        <Stack
            tokens={stackTokens}
            style={{
                width: 300
            }}>
            <Stack tokens={{ childrenGap: 16 }}>
                <Text variant="large" className="textColor">
                    UILabel
                </Text>
                <UILabel>Just a label</UILabel>
            </Stack>

            <Stack tokens={{ childrenGap: 16 }}>
                <Text variant="large" className="textColor">
                    UILabel with required on
                </Text>
                <UILabel required={true}>Just a label</UILabel>
            </Stack>
        </Stack>
    );
};
