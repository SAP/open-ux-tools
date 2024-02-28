import React from 'react';
import type { IStackTokens } from '@fluentui/react';
import { Text, Stack } from '@fluentui/react';
import { UISeparator } from '../src/components/UISeparator';

export default { title: 'Utilities/Separator' };
const stackTokens: IStackTokens = { childrenGap: 40 };

export const defaultUsage = (): JSX.Element => {
    return (
        <Stack tokens={stackTokens}>
            <Stack tokens={stackTokens}>
                <Text variant={'large'} className="textColor" block>
                    Vertical Separator
                </Text>
                <Stack horizontal tokens={stackTokens}>
                    <span>Hello</span>
                    <UISeparator vertical />
                    <span>World</span>
                </Stack>
            </Stack>

            <Stack tokens={stackTokens}>
                <Text variant={'large'} className="textColor" block>
                    Horizontal Separator
                </Text>
                <Stack horizontal tokens={stackTokens}>
                    <span>Hello</span>
                    <UISeparator />
                    <span>World</span>
                </Stack>
            </Stack>
        </Stack>
    );
};
