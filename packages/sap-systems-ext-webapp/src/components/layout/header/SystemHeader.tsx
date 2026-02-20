import React from 'react';
import type { ReactElement } from 'react';
import type { ConnectionType, SystemType } from '@sap-ux/store';
import type { SystemState } from '../../../types';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import '../../../styles/SystemHeader.scss';

/**
 * Renders the header.
 *
 * @returns - the header JSX element
 */
export function SystemHeader(): ReactElement {
    const systemInfo = useSelector((state: SystemState) => state.systemInfo);
    const addNewSapSystem = useSelector((state: SystemState) => state.addNewSapSystem);

    const { t } = useTranslation();

    if (!systemInfo?.systemType && !addNewSapSystem) {
        return <div className="store-header"></div>;
    }

    const systemTypeTitles: Record<SystemType, string> = {
        OnPrem: t('titles.onPremSystem'),
        AbapCloud: t('titles.btpSystem'),
        Generic: t('titles.genericHost')
    };

    const connectionTypeTitles: Record<ConnectionType, string | undefined> = {
        ['abap_catalog']: t('titles.catalog'),
        ['odata_service']: t('titles.serviceUrl'),
        ['generic_host']: undefined
    };

    const systemTypeTitle = systemInfo?.systemType ? systemTypeTitles[systemInfo.systemType] : undefined;
    const connectionTypeTitle = systemInfo?.connectionType
        ? connectionTypeTitles[systemInfo.connectionType]
        : undefined;

    return (
        <div className="store-header">
            <div className="store-header-title">{t('titles.sapSystemDetails')}</div>
            {addNewSapSystem ? (
                <div className="store-header-sub-heading">{t('titles.newSapSystem')}</div>
            ) : (
                systemTypeTitle && (
                    <div className="store-header-sub-heading">
                        {systemTypeTitle}
                        {connectionTypeTitle && ` - ${connectionTypeTitle}`}
                    </div>
                )
            )}
        </div>
    );
}
