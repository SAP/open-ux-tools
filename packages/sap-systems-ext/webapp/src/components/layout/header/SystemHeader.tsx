import React from 'react';
import type { ReactElement } from 'react';
import type { SystemState } from '../../../types';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import '../../../styles/SystemHeader.scss';

export function SystemHeader(): ReactElement {
    const systemInfo = useSelector((state: SystemState) => state.systemInfo);
    const addNewSapSystem = useSelector((state: SystemState) => state.addNewSapSystem);

    const { t } = useTranslation();

    if (!systemInfo?.systemType && !addNewSapSystem) {
        return <div className="store-header"></div>;
    }

    return (
        <div className="store-header">
            <div className="store-header-title">{t('titles.sapSystemDetails')}</div>
            {addNewSapSystem ? (
                <div className="store-header-sub-heading">{t('titles.newSapSystem')}</div>
            ) : (
                <>
                    {systemInfo?.systemType === 'OnPrem' && (
                        <div className="store-header-sub-heading">{t('titles.onPremSystem')}</div>
                    )}
                    {systemInfo?.systemType === 'AbapCloud' && (
                        <div className="store-header-sub-heading">{t('titles.btpSystem')}</div>
                    )}
                </>
            )}
        </div>
    );
}
