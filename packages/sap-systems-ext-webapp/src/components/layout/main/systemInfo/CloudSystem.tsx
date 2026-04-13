import React from 'react';
import type { SystemInfo } from '../../../../types';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { UITextInput, UITooltip, UITooltipUtils } from '@sap-ux/ui-components';
import { ServicePath } from './ServicePath';
import { ServiceKey } from './ServiceKey';
import { getUrlErrorMessage, useTextInputOverflow } from './utils';

import '../../../../styles/SystemMain.scss';

interface CloudSystemProps {
    systemInfo?: SystemInfo;
    setUrl: (url: string | undefined) => void;
    setServicePath: (servicePath: string | undefined) => void;
    setIsDetailsUpdated: (isUpdated: boolean) => void;
    setIsDetailsValid: (isValid: boolean) => void;
}

/**
 * Renders the cloud system details input fields.
 *
 * @param props - cloud system props
 * @param props.systemInfo - the system information
 * @param props.setUrl - function to set the URL
 * @param props.setServicePath - function to set the service path (only for generic host connection type)
 * @param props.setIsDetailsUpdated - function to set the details updated flag
 * @param props.setIsDetailsValid - function to set the details valid flag
 * @returns - the cloud system JSX element
 */
export function CloudSystem({
    systemInfo,
    setUrl,
    setServicePath,
    setIsDetailsUpdated,
    setIsDetailsValid
}: Readonly<CloudSystemProps>): ReactElement {
    const { t } = useTranslation();
    const reentranceUrlId = 'reentranceUrl';
    const { isEditing, isOverflowing, onEditStart, onEditEnd } = useTextInputOverflow(reentranceUrlId, systemInfo?.url);
    const tooltipContent = <div className="url-tooltip">{systemInfo?.url}</div>;

    let cloudComponent = <div></div>;

    if (systemInfo?.authenticationType === 'reentranceTicket') {
        cloudComponent = (
            <div>
                <div className="store-text-field">
                    <label className="store-detail-label">
                        {t('labels.url')} <span className="mandatory-asterisk">*</span>
                    </label>
                    <UITooltip
                        tooltipProps={UITooltipUtils.renderContent(tooltipContent)}
                        delay={0}
                        calloutProps={{ hidden: isEditing || !systemInfo?.url || !isOverflowing }}>
                        <UITextInput
                            name="reentranceTicketUrl"
                            id={reentranceUrlId}
                            key={`reentranceTicketUrl-${systemInfo?.connectionType}`}
                            value={systemInfo?.url}
                            onChange={(e) => {
                                onEditStart();
                                setUrl((e.target as HTMLInputElement).value);
                                setIsDetailsUpdated(true);
                            }}
                            onBlur={() => onEditEnd()}
                            onGetErrorMessage={(value) => {
                                const errorMsg = getUrlErrorMessage(value, t, systemInfo?.connectionType);
                                setIsDetailsValid(!errorMsg);
                                return errorMsg;
                            }}
                        />
                    </UITooltip>
                </div>
                {systemInfo?.connectionType === 'generic_host' && (
                    <ServicePath setServicePath={setServicePath} setIsDetailsUpdated={setIsDetailsUpdated} />
                )}
            </div>
        );
    } else if (systemInfo?.serviceKeys) {
        cloudComponent = (
            <div>
                <div className="store-text-field">
                    <label className="store-detail-label">{t('labels.url')}</label>
                    <UITextInput tabIndex={-1} name="systemUrl" readOnly={true} value={systemInfo?.url} />
                </div>
                <div className="store-text-field">
                    <label className="store-detail-label">{t('labels.client')}</label>
                    <UITextInput tabIndex={-1} name="systemClient" readOnly={true} value={systemInfo?.client} />
                </div>
                <ServiceKey serviceKey={JSON.stringify(systemInfo?.serviceKeys)} />
            </div>
        );
    }
    return cloudComponent;
}
