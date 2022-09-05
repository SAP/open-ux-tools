import React from 'react';
import { Text, Stack, IStackTokens } from '@fluentui/react';
import { useState } from 'react';

import { UISearchBox } from '../src/components/UISearchBox';
import { initIcons } from '../src/components/Icons';

export default { title: 'Basic Inputs/Search' };
const stackTokens: IStackTokens = { childrenGap: 40 };

initIcons();

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
                <UISearchBox value={query} onChange={onSearch} onClear={onSearchClear} />
            </Stack>
        </Stack>
    );
};
