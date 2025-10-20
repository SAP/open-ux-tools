import React from 'react';
import type { AuthenticationType, BackendSystem } from '@sap-ux/store';
import type { ReactElement } from 'react';
import { UITextInput } from '@sap-ux/ui-components';
import { useTranslation } from 'react-i18next';

import '../../../../styles/SystemMain.scss';
import { ServiceKey } from './ServiceKey';

interface CloudSystemProps {
    systemInfo?: BackendSystem;
    setUrl: (url: string | undefined) => void;
    setIsDetailsUpdated: (isUpdated: boolean) => void;
}

/**
 * Renders the cloud system details input fields.
 *
 * @param props - cloud system props
 * @param props.systemInfo - the system information
 * @param props.setUrl - function to set the URL
 * @param props.setIsDetailsUpdated - function to set the details updated flag
 * @returns - the cloud system JSX element
 */
export function CloudSystem({ systemInfo, setUrl, setIsDetailsUpdated }: Readonly<CloudSystemProps>): ReactElement {
    const { t } = useTranslation();

    const authType = systemInfo?.authenticationType as AuthenticationType;

    return (
        <div>
            {authType === 'reentranceTicket' && systemInfo?.url && (
                <div className="store-text-field">
                    <label className="store-detail-label">
                        {t('labels.url')} <span className="mandatory-asterik">*</span>
                    </label>
                    <UITextInput
                        name="s4HanaUrl"
                        id="s4HUrl"
                        defaultValue={systemInfo.url}
                        onChange={(e) => {
                            if (setUrl) {
                                setUrl((e.target as HTMLInputElement).value);
                            }
                            setIsDetailsUpdated(true);
                        }}
                    />
                </div>
            )}

            {systemInfo?.serviceKeys && (
                <div>
                    <div className="store-text-field">
                        <label className="store-detail-label">{t('labels.url')}</label>
                        <UITextInput tabIndex={-1} name="systemUrl" readOnly={true} value={systemInfo.url} />
                    </div>
                    <div className="store-text-field">
                        <label className="store-detail-label">{t('labels.client')}</label>
                        <UITextInput tabIndex={-1} name="systemClient" readOnly={true} value={systemInfo.client} />
                    </div>
                    <ServiceKey serviceKey={JSON.stringify(systemInfo.serviceKeys)} />
                </div>
            )}
        </div>
    );
}
