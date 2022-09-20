import React from 'react';
import { Text, Stack } from '@fluentui/react';

import type { ChoiceGroupOption } from '../src/components/UIChoiceGroup';
import { UIChoiceGroup } from '../src/components/UIChoiceGroup';

import { initIcons } from '../src/components/Icons';

initIcons();

export default { title: 'Basic Inputs/ChoiceGroup' };

const props: any = {
    options: [
        { key: 'key1', text: 'Option 1' },
        { key: 'key2', text: 'Option 2' },
        { key: 'key3', text: 'Option 3', disabled: true }
    ],
    defaultSelectedKey: 'key2',
    label: 'Title',
    onChange: (ev: React.FormEvent<HTMLElement | HTMLInputElement>, option: ChoiceGroupOption) => {
        console.log(option.text);
    }
};

export const ChoiceGroup = () => (
    <Stack>
        <Stack>
            <Text variant={'large'} block>
                ChoiceGroup
            </Text>
            <Stack>
                <UIChoiceGroup {...props} />
            </Stack>
            <Stack>
                <UIChoiceGroup {...props} title="Disabled" disabled={true} />
            </Stack>
            <Stack>
                <UIChoiceGroup {...props} title="Required" required={true} />
            </Stack>
            <Stack>
                <UIChoiceGroup {...props} title="Inline" inline={true} />
            </Stack>
        </Stack>
    </Stack>
);
