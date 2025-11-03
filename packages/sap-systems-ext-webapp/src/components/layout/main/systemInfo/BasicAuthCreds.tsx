import React from 'react';
import type { ReactElement } from 'react';
import { UITextInput } from '@sap-ux/ui-components';
import { useTranslation } from 'react-i18next';
import { AlertOutlineIcon } from '../AlertOutlineIcon';

import '../../../../styles/SystemMain.scss';

interface BasicAuthCredsProps {
    username?: string;
    password?: string;
    setUsername: (username: string) => void;
    setPassword: (password: string) => void;
    setIsDetailsUpdated: (isUpdated: boolean) => void;
}

const helpURL =
    'https://help.sap.com/docs/SAP_FIORI_tools/17d50220bcd848aa854c9c182d65b699/78a82b6852ce4061ba0825afdb79cda6.html?locale=en-US';

/**
 * Renders the basic authentication credentials input fields.
 *
 * @param props - basic authentication credentials props
 * @param props.username - the username value
 * @param props.password - the password value
 * @param props.setUsername - function to set the username
 * @param props.setPassword - function to set the password
 * @param props.setIsDetailsUpdated - function to set the details updated flag
 * @returns - the basic authentication credentials JSX element
 */
export function BasicAuthCreds({
    username,
    password,
    setUsername,
    setPassword,
    setIsDetailsUpdated
}: Readonly<BasicAuthCredsProps>): ReactElement {
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
                <div className="store-warning-text">
                    <AlertOutlineIcon />
                    {t('warnings.passwordStoreWarning')}
                    <a href={helpURL} rel="noopener noreferrer" className="store-warning-link">
                        {t('buttons.learnMore')}
                    </a>
                </div>
            </div>
        </div>
    );
}
