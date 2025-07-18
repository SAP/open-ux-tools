import React, { useState } from 'react';
import type { ISearchBoxProps, IStackTokens } from '@fluentui/react';
import { Text, Stack } from '@fluentui/react';

import { UISearchBox } from '../src/components/UISearchBox';
import { UICheckbox } from '../src/components';

export default { title: 'Basic Inputs/Search' };
const stackTokens: IStackTokens = { childrenGap: 40 };

export const SearchBox = () => {
    const [query, setQuery] = useState('');

    const onSearch = (event?: React.ChangeEvent<HTMLInputElement>, query?: string): void => {
        if (query !== undefined) {
            setQuery(query);
        }
    };

    const onSearchClear = (): void => {
        setQuery('');
    };

    const updateProps = (name: keyof ISearchBoxProps, value: unknown): void => {
        setProps({
            ...props,
            [name]: value
        });
    };

    const [props, setProps] = useState<Omit<ISearchBoxProps, 'ref'>>({
        value: query,
        onChange: onSearch,
        onClear: onSearchClear
    });

    return (
        <Stack
            tokens={stackTokens}
            style={{
                width: 300
            }}>
            <Stack tokens={{ childrenGap: 16 }}>
                <Text variant="large" className="textColor">
                    UISearchBox
                </Text>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: '20px',
                        maxWidth: '1200px'
                    }}>
                    <UICheckbox
                        label={'Disabled'}
                        checked={props.disabled}
                        onChange={(event, value) => {
                            updateProps('disabled', value);
                        }}
                    />
                </div>
                <UISearchBox {...props} />
            </Stack>
        </Stack>
    );
};
