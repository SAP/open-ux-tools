import type { ReactElement } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { UISearchBox } from '@sap-ux/ui-components';
import { FilterName, filterNodes } from '../../slice.js';
import './OutlinePanel.scss';

import { Tree } from './Tree.js';
import { Funnel } from './Funnel.js';

const OutlinePanel = (): ReactElement => {
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const onFilterChange = (
        event?: React.ChangeEvent<HTMLInputElement> | undefined,
        newValue?: string | undefined
    ): void => {
        const action = filterNodes([{ name: FilterName.query, value: newValue ?? '' }]);
        dispatch(action);
    };
    return (
        <>
            <div className="filter-outline">
                <UISearchBox
                    autoFocus={false}
                    disableAnimation={false}
                    placeholder={t('SEARCH_OUTLINE')}
                    onChange={onFilterChange}
                />
                <Funnel />
            </div>
            <Tree />
        </>
    );
};

export { OutlinePanel };
