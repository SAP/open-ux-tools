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

/**
 * Renders the main layout for the SAP System details.
 *
 * @returns - the SAP System main layout JSX element
 */
export function SystemMain(): ReactElement {
    const { t } = useTranslation();

    const {
        systemInfo,
        systemUnSaved,
        showConnectionStatus,
        showUpdateSystemStatus,
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
        setAuthenticationType,
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
                    {addNewSapSystem && <SystemTypes setType={setType} setAuthenticationType={setAuthenticationType} />}

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
                        showUpdateSystemStatus={showUpdateSystemStatus}
                        guidedAnswerLink={guidedAnswerLink}
                    />

                    <ExternalActionBtns systemInfo={systemInfo} systemUnSaved={systemUnSaved} />
                </div>
            )}
        </div>
    );
}
