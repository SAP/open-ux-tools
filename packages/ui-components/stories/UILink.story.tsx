import React, { useState } from 'react';
import type { IStackTokens } from '@fluentui/react';
import { Text, Stack } from '@fluentui/react';

import { UILink } from '../src/components/UILink';
import { UICheckbox } from '../src/components/UICheckbox';

export default { title: 'Basic Inputs/Link' };
const stackTokens: IStackTokens = { childrenGap: 40 };

export const defaultUsage = (): JSX.Element => {
    const [disabled, setDisabled] = useState(false);
    return (
        <Stack tokens={stackTokens}>
            <Stack tokens={stackTokens}>
                <Stack horizontal tokens={stackTokens}>
                    <UICheckbox
                        label="Disabled"
                        checked={disabled}
                        onChange={(ev?: React.FormEvent<HTMLElement | HTMLInputElement>, checked?: boolean) => {
                            setDisabled(!!checked);
                        }}
                    />
                </Stack>
            </Stack>

            <Stack tokens={stackTokens}>
                <Text variant={'large'} className="textColor" block>
                    Primary UILink
                </Text>
                <Stack horizontal tokens={stackTokens}>
                    <UILink href="JavaScript:void(0)" disabled={disabled}>
                        I am a link
                    </UILink>
                </Stack>
            </Stack>

            <Stack tokens={stackTokens}>
                <Text variant={'large'} className="textColor" block>
                    Primary UILink with no underline
                </Text>
                <Stack horizontal tokens={stackTokens}>
                    <UILink underline={false} href="JavaScript:void(0)" disabled={disabled}>
                        I am a link
                    </UILink>
                </Stack>
            </Stack>

            <Stack tokens={stackTokens}>
                <Text variant={'large'} className="textColor" block>
                    Secondary UILink
                </Text>
                <Stack horizontal tokens={stackTokens}>
                    <UILink secondary href="JavaScript:void(0)" disabled={disabled}>
                        I am a secondary link
                    </UILink>
                </Stack>
            </Stack>
        </Stack>
    );
};
