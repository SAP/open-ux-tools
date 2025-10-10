import React from 'react';
import type { ReactElement } from 'react';
import { UITextInput } from '@sap-ux/ui-components';
import { useTranslation } from 'react-i18next';

import '../../../../styles/StoreMain.scss';

interface BasicAuthCredsProps {
    username?: string;
    password?: string;
    setUsername: (username: string) => void;
    setPassword: (password: string) => void;
    setIsDetailsUpdated: (isUpdated: boolean) => void;
}

export function BasicAuthCreds({
    username,
    password,
    setUsername,
    setPassword,
    setIsDetailsUpdated
}: BasicAuthCredsProps): ReactElement {
    const { t } = useTranslation();

    return (
        <div>
            <div className="store-text-field">
                <label className="store-detail-label">{t('labels.username')}</label>
                <UITextInput
                    name="systemUsername"
                    id="sysUser"
                    defaultValue={username}
                    onChange={(e) => {
                        setUsername((e.target as HTMLInputElement).value);
                        setIsDetailsUpdated(true);
                    }}
                />
            </div>
            <div className="store-text-field">
                <label className="store-detail-label">{t('labels.password')}</label>
                <UITextInput
                    name="systemPassword"
                    id="sysPass"
                    defaultValue={password}
                    type={`password`}
                    canRevealPassword={false}
                    onChange={(e) => {
                        setPassword((e.target as HTMLInputElement).value);
                        setIsDetailsUpdated(true);
                    }}
                />
            </div>
        </div>
    );
}
