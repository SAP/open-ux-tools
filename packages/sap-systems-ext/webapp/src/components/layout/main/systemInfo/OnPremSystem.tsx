import React from 'react';
import type { ReactElement } from 'react';
import type { BackendSystem } from '@sap-ux/store';
import { UITextInput } from '@sap-ux/ui-components';
import { BasicAuthCreds } from './BasicAuthCreds';
import { useTranslation } from 'react-i18next';

import '../../../../styles/StoreMain.scss';

interface OnPremSystemProps {
    systemInfo?: BackendSystem;
    setUrl: (url: string | undefined) => void;
    setClient?: (client: string | undefined) => void;
    setUsername: (username: string) => void;
    setPassword: (password: string) => void;
    setIsDetailsUpdated: (isUpdated: boolean) => void;
    setIsDetailsValid: (isValid: boolean) => void;
}

export function OnPremSystem({
    systemInfo,
    setUrl,
    setClient,
    setUsername,
    setPassword,
    setIsDetailsUpdated,
    setIsDetailsValid
}: OnPremSystemProps): ReactElement {
    const { t } = useTranslation();

    const getUrlErrorMessage = (value: string) => {
        try {
            const url = new URL(value);
            if (url.pathname && url.pathname !== '/') {
                setIsDetailsValid(false);
                return t('validations.urlPathWarning');
            }
            setIsDetailsValid(true);
        } catch {
            return undefined;
        }
    };

    return (
        <div>
            <div className="store-text-field">
                <label className="store-detail-label">
                    {t('labels.url')} <span className="mandatory-asterik">*</span>
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
