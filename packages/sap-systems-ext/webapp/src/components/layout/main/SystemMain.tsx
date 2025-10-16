import React from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { SystemActionBtns, ExternalActionBtns } from './buttons';
import { SystemStatus } from './status';
import { SystemTypes } from './systemTypes';
import { SystemInfo } from './systemInfo';
import { LoadingState } from '../../../types';
import { useSystemMain } from '../../../hooks';

import '../../../styles/SystemMain.scss';

export function SystemMain(): ReactElement {
    const { t } = useTranslation();

    const {
        systemInfo,
        systemUnSaved,
        showConnectionStatus,
        showEditSystemStatus,
        testConnectionBtnDisabled,
        saveButtonDisabled,
        isDetailsUpdated,
        systemState,
        testConnectionState,
        connectionStatus,
        updateSystemStatus,
        addNewSapSystem,
        guidedAnswerLink,
        setName,
        setType,
        setUrl,
        setClient,
        setUsername,
        setPassword,
        setIsDetailsUpdated,
        setIsDetailsValid,
        resetStatus
    } = useSystemMain();

    return (
        <div className="store-main">
            {systemState === LoadingState.Error ? (
                <div className="system-info-status">{t('systemStatus.infoError')}</div>
            ) : (
                <div>
                    {addNewSapSystem && <SystemTypes setType={setType} />}

                    <SystemInfo
                        systemInfo={systemInfo}
                        setName={setName}
                        setUrl={setUrl}
                        setClient={setClient}
                        setUsername={setUsername}
                        setPassword={setPassword}
                        setIsDetailsUpdated={setIsDetailsUpdated}
                        setIsDetailsValid={setIsDetailsValid}
                    />

                    <SystemActionBtns
                        systemInfo={systemInfo}
                        testConnectionBtnDisabled={testConnectionBtnDisabled}
                        saveButtonDisabled={saveButtonDisabled}
                        isDetailsUpdated={isDetailsUpdated}
                        connectionStatus={connectionStatus}
                        resetStatus={resetStatus}
                    />

                    <SystemStatus
                        testConnectionState={testConnectionState}
                        connectionStatus={connectionStatus}
                        showConnectionStatus={showConnectionStatus}
                        updateSystemStatus={updateSystemStatus}
                        showEditSystemStatus={showEditSystemStatus}
                        guidedAnswerLink={guidedAnswerLink}
                    />

                    <ExternalActionBtns systemInfo={systemInfo} systemUnSaved={systemUnSaved} />
                </div>
            )}
        </div>
    );
}
