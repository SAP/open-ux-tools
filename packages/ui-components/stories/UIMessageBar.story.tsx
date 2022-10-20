import React from 'react';
import type { IStackTokens } from '@fluentui/react';
import { Stack, MessageBarType } from '@fluentui/react';
import { UIMessageBar } from '../src/components/UIMessageBar';

export default { title: 'Utilities/MessageBar' };
const stackTokens: IStackTokens = { childrenGap: 40 };

export const defaultUsage = (): JSX.Element => {
    return (
        <Stack tokens={stackTokens}>
            <UIMessageBar messageBarType={MessageBarType.success}>
                <div>Success message bar</div>
            </UIMessageBar>

            <UIMessageBar messageBarType={MessageBarType.error}>
                <div>Error message bar</div>
            </UIMessageBar>
        </Stack>
    );
};
