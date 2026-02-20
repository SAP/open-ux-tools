import React from 'react';
import type { ReactElement } from 'react';
import type { BackendSystem } from '@sap-ux/store';
import { UITextInput, UITooltip, UITooltipUtils } from '@sap-ux/ui-components';
import { BasicAuthCreds } from './BasicAuthCreds';
import { useTranslation } from 'react-i18next';

import '../../../../styles/SystemMain.scss';
import { getUrlErrorMessage, useTextInputOverflow } from './utils';

interface OnPremSystemProps {
    systemInfo?: BackendSystem;
    setUrl: (url: string | undefined) => void;
    setClient: (client: string | undefined) => void;
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
    const sysUrlId = 'sysUrl';
    const { isEditing, isOverflowing, onEditStart, onEditEnd } = useTextInputOverflow(sysUrlId, systemInfo?.url);
    const tooltipContent = <div className="url-tooltip">{systemInfo?.url}</div>;

    return (
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
                        name="systemUrl"
                        id={sysUrlId}
                        key={`systemUrl-${systemInfo?.connectionType}`} // force re-render so validation is ran if connection type changes
                        value={systemInfo?.url}
                        onChange={(e) => {
                            onEditStart();
                            setUrl((e.target as HTMLInputElement).value);
                            setIsDetailsUpdated(true);
                        }}
                        onBlur={() => onEditEnd()}
                        onGetErrorMessage={(value) => {
                            const urlMessage = getUrlErrorMessage(value, t, systemInfo?.connectionType);
                            setIsDetailsValid(!urlMessage);
                            return urlMessage;
                        }}
                    />
                </UITooltip>
            </div>
            <div className="store-text-field">
                <label className="store-detail-label">{t('labels.client')}</label>
                <UITextInput
                    name="systemClient"
                    id="sysClient"
                    value={systemInfo?.client}
                    onChange={(e) => {
                        setClient((e.target as HTMLInputElement).value);
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
