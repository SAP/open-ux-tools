import React from 'react';
import type { ReactElement } from 'react';
import type { BackendSystem } from '@sap-ux/store';
import { UITextInput } from '@sap-ux/ui-components';
import { BasicAuthCreds } from './BasicAuthCreds';
import { useTranslation } from 'react-i18next';

import '../../../../styles/SystemMain.scss';

interface OnPremSystemProps {
    systemInfo?: BackendSystem;
    setUrl: (url: string | undefined) => void;
    setClient?: (client: string | undefined) => void;
    setUsername: (username: string) => void;
    setPassword: (password: string) => void;
    setIsDetailsUpdated: (isUpdated: boolean) => void;
    setIsDetailsValid: (isValid: boolean) => void;
}

/**
 * Renders the on-premise system details input fields.
 *
 * @param props - on-premise system props
 * @param props.systemInfo - the system information
 * @param props.setUrl - function to set the URL
 * @param props.setClient - function to set the client
 * @param props.setUsername - function to set the username
 * @param props.setPassword - function to set the password
 * @param props.setIsDetailsUpdated - function to set the details updated flag
 * @param props.setIsDetailsValid - function to set the details valid flag
 * @returns - the on-premise system JSX element
 */
export function OnPremSystem({
    systemInfo,
    setUrl,
    setClient,
    setUsername,
    setPassword,
    setIsDetailsUpdated,
    setIsDetailsValid
}: Readonly<OnPremSystemProps>): ReactElement {
    const { t } = useTranslation();

    const getUrlErrorMessage = (value: string): string | undefined => {
        let urlMessage: string | undefined;
        try {
            const url = new URL(value);
            if (url.pathname && url.pathname !== '/') {
                setIsDetailsValid(false);
                urlMessage = t('validations.urlPathWarning');
            }
            setIsDetailsValid(true);
        } catch {
            // ignore
        }
        return urlMessage;
    };

    return (
        <div>
            <div className="store-text-field">
                <label className="store-detail-label">
                    {t('labels.url')} <span className="mandatory-asterisk">*</span>
                </label>
                <UITextInput
                    name="systemUrl"
                    id="sysUrl"
                    defaultValue={systemInfo?.url}
                    onChange={(e) => {
                        setUrl((e.target as HTMLInputElement).value);
                        setIsDetailsUpdated(true);
                    }}
                    onGetErrorMessage={(value) => getUrlErrorMessage(value)}
                />
            </div>
            <div className="store-text-field">
                <label className="store-detail-label">{t('labels.client')}</label>
                <UITextInput
                    name="systemClient"
                    id="sysClient"
                    defaultValue={systemInfo?.client}
                    onChange={(e) => {
                        if (setClient) {
                            setClient((e.target as HTMLInputElement).value);
                        }
                        setIsDetailsUpdated(true);
                    }}
                />
            </div>
            <BasicAuthCreds
                username={systemInfo?.username}
                password={systemInfo?.password}
                setUsername={setUsername}
                setPassword={setPassword}
                setIsDetailsUpdated={setIsDetailsUpdated}
            />
        </div>
    );
}
