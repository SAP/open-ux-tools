import React from 'react';
import type { ReactElement } from 'react';
import type { ConnectionStatus, UpdateSystemStatus } from '@sap-ux/sap-systems-ext-types';
import { UIActionCallout, UIIcon, UILink, UILoader, UiIcons, type IActionCalloutDetail } from '@sap-ux/ui-components';
import { useTranslation } from 'react-i18next';
import { actions } from '../../../../state';
import { LoadingState } from '../../../../types';

import '../../../../styles/SystemStatus.scss';

interface SystemStatusProps {
    testConnectionState?: LoadingState;
    connectionStatus?: ConnectionStatus;
    showConnectionStatus?: boolean;
    updateSystemStatus?: UpdateSystemStatus['payload'];
    showUpdateSystemStatus?: boolean;
    guidedAnswerLink?: IActionCalloutDetail;
}

/**
 * Renders the system status component.
 *
 * @param props - system status props
 * @param props.testConnectionState - the loading state of the test connection
 * @param props.connectionStatus - the connection status object
 * @param props.showConnectionStatus - flag indicating if the connection status should be shown
 * @param props.updateSystemStatus - the update system status object
 * @param props.showUpdateSystemStatus - flag indicating if the update system status should be shown
 * @param props.guidedAnswerLink - the guided answer link details
 * @returns - the system status JSX element
 */
export function SystemStatus({
    testConnectionState,
    connectionStatus,
    showConnectionStatus,
    updateSystemStatus,
    showUpdateSystemStatus,
    guidedAnswerLink
}: Readonly<SystemStatusProps>): ReactElement {
    const { t } = useTranslation();

    const outputTabLogMsg = (isError?: boolean): JSX.Element => {
        return (
            <>
                <span>
                    {t('systemStatus.openOutputChannel.check')}{' '}
                    <UILink
                        onClick={actions.openOutputChannel}
                        id="outputLink"
                        className={isError ? 'output-link-error' : 'output-link-warn'}>
                        {t('systemStatus.openOutputChannel.outputTab')}
                    </UILink>{' '}
                    {t('systemStatus.openOutputChannel.moreDetails')}{' '}
                </span>
                <span dangerouslySetInnerHTML={{ __html: t('systemStatus.increaseLogLevel') }} />
            </>
        );
    };

    const getCatalogMsgJsx = (version: string, count?: number): JSX.Element => {
        if (count && count > 0) {
            return (
                <div className="status-item">
                    <UIIcon className="status-icon" iconName={UiIcons.Info} />
                    <label className="system-status-info status-msg">
                        {t('systemStatus.catalogCount', { version, count })}
                    </label>
                </div>
            );
        } else {
            return (
                <div className="status-item">
                    <UIIcon className="status-icon" iconName={UiIcons.Warning} />
                    <label className="system-status-warn status-msg">
                        <span>{t('systemStatus.catalogUnavailable', { version })} </span>
                        {outputTabLogMsg(false)}
                    </label>
                </div>
            );
        }
    };

    if (testConnectionState === LoadingState.Loading) {
        return (
            <div className="store-text-field loader-icon">
                <UILoader className="uiLoaderXLarge" />
            </div>
        );
    } else {
        return (
            <div>
                <div id="systemStatusInfo" className="system-status">
                    {connectionStatus && showConnectionStatus && connectionStatus.connected !== true && (
                        <div className="status-item">
                            <UIIcon className="status-icon" iconName={UiIcons.Error} />
                            <label className="system-status-error status-msg">
                                {connectionStatus.message}
                                <br />
                                {outputTabLogMsg(true)}
                            </label>
                        </div>
                    )}
                    {connectionStatus && showConnectionStatus && connectionStatus.catalogResults && (
                        <div className="catalog-messages">
                            {getCatalogMsgJsx('V2', connectionStatus.catalogResults.v2Request.count)}
                            {getCatalogMsgJsx('V4', connectionStatus.catalogResults.v4Request.count)}
                        </div>
                    )}
                    {updateSystemStatus && showUpdateSystemStatus && updateSystemStatus.updateSuccess && (
                        <div className="status-item">
                            <UIIcon className="status-icon" iconName={UiIcons.Info} />
                            <label className="system-status-info status-msg">{updateSystemStatus.message}</label>{' '}
                        </div>
                    )}
                    {updateSystemStatus && showUpdateSystemStatus && !updateSystemStatus.updateSuccess && (
                        <div className="status-item">
                            <UIIcon className="status-icon" iconName={UiIcons.Error} />
                            <label className="system-status-error status-msg">{updateSystemStatus.message}</label>
                        </div>
                    )}
                </div>
                {guidedAnswerLink && showConnectionStatus && (
                    <UIActionCallout
                        onClick={actions.fireGALinkTelemetry}
                        commandAction={actions.openGuidedAnswers}
                        targetElementId={'systemStatusInfo'}
                        actionDetail={guidedAnswerLink}
                        isError={true}></UIActionCallout>
                )}
            </div>
        );
    }
}
