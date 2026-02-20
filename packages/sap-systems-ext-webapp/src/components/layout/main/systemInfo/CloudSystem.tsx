import React from 'react';
import type { BackendSystem } from '@sap-ux/store';
import type { ReactElement } from 'react';
import { UITextInput, UITooltip, UITooltipUtils } from '@sap-ux/ui-components';
import { useTranslation } from 'react-i18next';

import '../../../../styles/SystemMain.scss';
import { ServiceKey } from './ServiceKey';
import { getUrlErrorMessage, useTextInputOverflow } from './utils';

interface CloudSystemProps {
    systemInfo?: BackendSystem;
    setUrl: (url: string | undefined) => void;
    setIsDetailsUpdated: (isUpdated: boolean) => void;
    setIsDetailsValid: (isValid: boolean) => void;
}

/**
 * Renders the cloud system details input fields.
 *
 * @param props - cloud system props
 * @param props.systemInfo - the system information
 * @param props.setUrl - function to set the URL
 * @param props.setIsDetailsUpdated - function to set the details updated flag
 * @param props.setIsDetailsValid - function to set the details valid flag
 * @returns - the cloud system JSX element
 */
export function CloudSystem({
    systemInfo,
    setUrl,
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
                        tooltipProps={{
                            ...UITooltipUtils.renderContent(tooltipContent),
                            delay: 0
                        }}
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
