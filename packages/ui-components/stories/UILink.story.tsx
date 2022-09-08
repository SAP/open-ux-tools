import React from 'react';
import type { IStackTokens } from '@fluentui/react';
import { Text, Stack } from '@fluentui/react';

import { UILink } from '../src/components/UILink';

export default { title: 'Basic Inputs/Link' };
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
                    UILink
                </Text>
                <UILink href="JavaScript:void(0)">I am a link</UILink>
            </Stack>
        </Stack>
    );
};
