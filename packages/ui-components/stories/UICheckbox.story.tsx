import React from 'react';
import type { IStackTokens } from '@fluentui/react';
import { Text, Stack } from '@fluentui/react';

import { UICheckbox } from '../src/components/UICheckbox';

import { initIcons } from '../src/components/Icons';

initIcons();

export default { title: 'Basic Inputs/Checkbox' };
const stackTokens: IStackTokens = { childrenGap: 40 };

export const defaultUsage = (): JSX.Element => {
    const message = 'Dummy message';
    const styles = { width: '300px', marginBottom: '25px' };

    return (
        <Stack
            tokens={stackTokens}
            style={{
                width: 300
            }}>
            <Stack tokens={{ childrenGap: 16 }}>
                <Text variant="large" className="textColor">
                    UICheckbox
                </Text>
                <UICheckbox label="check" />
            </Stack>

            <Stack tokens={{ childrenGap: 16 }}>
                <Text variant="large" className="textColor">
                    UICheckbox with error message
                </Text>
                <UICheckbox label="Error" errorMessage={message} />
            </Stack>

            <Stack tokens={{ childrenGap: 16 }}>
                <Text variant="large" className="textColor">
                    UICheckbox with warning message
                </Text>
                <UICheckbox label="Warning" warningMessage={message} />
            </Stack>

            <Stack tokens={{ childrenGap: 16 }}>
                <Text variant="large" className="textColor">
                    UICheckbox with info message
                </Text>
                <UICheckbox label="Info" infoMessage={message} />
            </Stack>
        </Stack>
    );
};
