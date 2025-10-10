import React from 'react';
import type { SystemState } from '../../types';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { SystemHeader } from './header';
import { SystemMain } from './main';
import { LoadingState } from '../../types';

export function SapSystem() {
    const { t } = useTranslation();
    const systemState = useSelector((state: SystemState) => {
        return state.loadingState;
    });
    const addNewSapSystem = useSelector((state: SystemState) => {
        return state.addNewSapSystem;
    });

    return (
        <div>
            {systemState === LoadingState.Loading && !addNewSapSystem ? (
                <div className="system-info-status">{t('status.infoLoading')}</div>
            ) : (
                <div>
                    <header>
                        <SystemHeader />
                    </header>
                    <div>
                        <SystemMain />
                    </div>
                </div>
            )}
        </div>
    );
}
