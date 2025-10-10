import React, { useState } from 'react';
import type { ReactElement } from 'react';
import type { ConnectionStatus } from '@sap-ux/sap-systems-ext-types';
import type { BackendSystem } from '@sap-ux/store';
import { UIDefaultButton, UIDialog } from '@sap-ux/ui-components';
import { useTranslation } from 'react-i18next';
import { actions } from '../../../../state';

import '../../../../styles/Buttons.scss';

interface SystemActionBtnsProps {
    systemInfo?: BackendSystem;
    systemUnSaved?: boolean;
    testConnectionBtnDisabled?: boolean;
    saveButtonDisabled?: boolean;
    isDetailsUpdated: boolean;
    connectionStatus?: ConnectionStatus;
    resetStatus: () => void;
}

export function SystemActionBtns({
    systemInfo,
    testConnectionBtnDisabled,
    saveButtonDisabled,
    isDetailsUpdated,
    connectionStatus,
    resetStatus
}: SystemActionBtnsProps): ReactElement {
    const { t } = useTranslation();
    const [showDialog, setShowDialog] = useState(false);
    const [sapSystemDetails, setSapSystemDetails] = useState({});

    const onDismissModal = () => {
        setShowDialog(false);
    };

    const onAcceptModal = () => {
        actions.updateSystem(sapSystemDetails as BackendSystem);
        setShowDialog(false);
    };

    const saveSystem = (system: BackendSystem, isDetailsUpdated: boolean): void => {
        setSapSystemDetails(system);
        if (connectionStatus?.connected && !isDetailsUpdated) {
            actions.updateSystem(system);
        } else {
            setShowDialog(true);
        }
    };

    return (
        <>
            {systemInfo?.systemType && (
                <div className="btns">
                    {showDialog && (
                        <UIDialog
                            hidden={!showDialog}
                            modalProps={{
                                isBlocking: true
                            }}
                            acceptButtonId={'save-dialog-confirm'}
                            cancelButtonId={'save-dialog-cancel'}
                            onAccept={onAcceptModal}
                            onCancel={onDismissModal}
                            onDismiss={onDismissModal}
                            acceptButtonText={t('dialog.yes')}
                            cancelButtonText={t('dialog.no')}
                            title={t('dialog.titleConfirmSave')}
                            dialogContentProps={{
                                subText: t('dialog.subtextConfirmSave')
                            }}></UIDialog>
                    )}

                    <div>
                        <UIDefaultButton
                            className="system-btn"
                            id="testConBtn"
                            disabled={testConnectionBtnDisabled}
                            onClick={(): void => {
                                resetStatus();
                                systemInfo && actions.testConnection(systemInfo);
                            }}>
                            {t('buttons.testConnection')}
                        </UIDefaultButton>
                        <UIDefaultButton
                            className="save-system-btn"
                            id="saveBtn"
                            primary
                            disabled={saveButtonDisabled}
                            onClick={(): void => {
                                systemInfo && saveSystem(systemInfo, isDetailsUpdated);
                            }}>
                            {t('buttons.save')}
                        </UIDefaultButton>
                    </div>
                </div>
            )}
        </>
    );
}
