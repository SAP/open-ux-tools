import React from 'react';
import type { IStackTokens } from '@fluentui/react';
import { Text, Stack } from '@fluentui/react';

import { UILink } from '../src/components/UILink';

export default { title: 'Basic Inputs/Link' };
const stackTokens: IStackTokens = { childrenGap: 40 };

export const defaultUsage = (): JSX.Element => {
    return (
        <Stack tokens={stackTokens}>
            <Stack tokens={stackTokens}>
                <Text variant={'large'} className="textColor" block>
                    Primary UILink
                </Text>
                <Stack horizontal tokens={stackTokens}>
                    <UILink href="JavaScript:void(0)">I am a link</UILink>
                </Stack>
            </Stack>

            <Stack tokens={stackTokens}>
                <Text variant={'large'} className="textColor" block>
                    Secondary UILink
                </Text>
                <Stack horizontal tokens={stackTokens}>
                    <UILink secondary href="JavaScript:void(0)">I am a secondary link</UILink>
                </Stack>
            </Stack>
        </Stack>
    );
};
