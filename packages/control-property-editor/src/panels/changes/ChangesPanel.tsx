import type { ReactElement } from 'react';
import React from 'react';

import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import { Text } from '@fluentui/react';
import { UISearchBox } from '@sap-ux/ui-components';

import type { ChangesSlice } from '../../slice';
import { FilterName, filterNodes } from '../../slice';
import type { RootState } from '../../store';

import { Separator } from '../../components';
import { ChangeStack } from './ChangeStack';
import { ChangeStackHeader } from './ChangeStackHeader';

import styles from './ChangesPanel.module.scss';

export interface ChangeProps {
    controlId: string;
    controlName: string;
    changeIndex: number;
    changeType: string;
    propertyName: string;
    value: string | number | boolean;
    isActive: boolean;
    timestamp?: number;
    fileName?: string;
    /**
     * Class used for showing and hiding actions
     */
    actionClassName: string;
}

/**
 * React element for ChangePanel.
 *
 * @returns ReactElement
 */
export function ChangesPanel(): ReactElement {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const { pending, saved } = useSelector<RootState, ChangesSlice>((state) => state.changes);
    const onFilterChange = (
        event?: React.ChangeEvent<HTMLInputElement> | undefined,
        filterValue?: string | undefined
    ): void => {
        const action = filterNodes([{ name: FilterName.changeSummaryFilterQuery, value: filterValue ?? '' }]);
        dispatch(action);
    };

    /**
     * Method renders the ReactElement for ChangePanel.
     *
     * @returns ReactElement
     */
    function renderChanges(): ReactElement {
        if (pending.length === 0 && saved.length === 0) {
            return <Text className={styles.noData}>{t('NO_CONTROL_CHANGES_FOUND')}</Text>;
        }
        return (
            <>
                {pending.length > 0 && (
                    <>
                        <Separator />
                        <ChangeStackHeader
                            backgroundColor="var(--vscode-sideBar-background);"
                            color="var(--vscode-editor-foreground)"
                            text={t('CHANGE_SUMMARY_UNSAVED_CHANGES')}
                        />
                        <Separator />
                        <ChangeStack key="pending-changes" changes={pending} />
                    </>
                )}
                {saved.length > 0 && (
                    <>
                        <Separator />
                        <ChangeStackHeader
                            backgroundColor="var(--vscode-sideBar-background);"
                            color="var(--vscode-terminal-ansiGreen)"
                            text={t('CHANGE_SUMMARY_SAVED_CHANGES')}
                        />
                        <Separator />
                        <ChangeStack key="saved-changes" changes={saved} />
                    </>
                )}
                <Separator />
            </>
        );
    }

    return (
        <>
            <div className={styles.filter}>
                <UISearchBox
                    autoFocus={false}
                    disableAnimation={false}
                    placeholder={t('FILTER')}
                    onChange={onFilterChange}
                />
            </div>
            {renderChanges()}
        </>
    );
}
