import React from 'react';
import type { IStackTokens } from '@fluentui/react';
import { Text, Stack } from '@fluentui/react';

import { UIDatePicker } from '../src/components/UIDatePicker';

import { initIcons } from '../src/components/Icons';

initIcons();

export default { title: 'Basic Inputs/DatePicker' };
const stackTokens: IStackTokens = { childrenGap: 40 };

export const defaultUsage = (): JSX.Element => {
    return (
        <Stack tokens={stackTokens} style={{ width: 300 }}>
            <Stack tokens={{ childrenGap: 16 }}>
                <Text variant="large" className="textColor">
                    UIDatePicker
                </Text>
                <UIDatePicker defaultValue="2018-06-12T19:30" />
            </Stack>

            <Stack tokens={{ childrenGap: 16 }}>
                <Text variant="large" className="textColor">
                    UIDatePicker with only date
                </Text>
                <UIDatePicker defaultValue="2020-07-21" dateOnly={true} />
            </Stack>
        </Stack>
    );
};
