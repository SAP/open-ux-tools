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
    testConnectionBtnDisabled?: boolean;
    saveButtonDisabled?: boolean;
    isDetailsUpdated: boolean;
    connectionStatus?: ConnectionStatus;
    readonly resetStatus: () => void;
}

/**
 * Renders the jsx for external action buttons.
 *
 * @param props - external action buttons props
 * @param props.systemInfo - the system information
 * @param props.testConnectionBtnDisabled - flag indicating if the test connection button is disabled
 * @param props.saveButtonDisabled - flag indicating if the save button is disabled
 * @param props.isDetailsUpdated - flag indicating if the system details have been updated
 * @param props.connectionStatus - the connection status object
 * @param props.resetStatus - function to reset status messages
 * @returns - the external action buttons JSX element
 */
export function SystemActionBtns({
    systemInfo,
    testConnectionBtnDisabled,
    saveButtonDisabled,
    isDetailsUpdated,
    connectionStatus,
    resetStatus
}: Readonly<SystemActionBtnsProps>): ReactElement {
    const { t } = useTranslation();
    const [showDialog, setShowDialog] = useState(false);
    const [sapSystemDetails, setSapSystemDetails] = useState({});

    const onDismissModal = (): void => {
        setShowDialog(false);
    };

    const onAcceptModal = (): void => {
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
                                if (systemInfo) {
                                    actions.testConnection(systemInfo);
                                }
                            }}>
                            {t('buttons.testConnection')}
                        </UIDefaultButton>
                        <UIDefaultButton
                            className="save-system-btn"
                            id="saveBtn"
                            primary
                            disabled={saveButtonDisabled}
                            onClick={(): void => {
                                if (systemInfo) {
                                    saveSystem(systemInfo, isDetailsUpdated);
                                }
                            }}>
                            {t('buttons.save')}
                        </UIDefaultButton>
                    </div>
                </div>
            )}
        </>
    );
}
