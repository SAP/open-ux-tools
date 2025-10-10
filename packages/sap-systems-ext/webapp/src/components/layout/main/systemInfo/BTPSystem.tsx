import React from 'react';
import type { BackendSystem } from '@sap-ux/store';
import type { ReactElement } from 'react';
import { UITextInput } from '@sap-ux/ui-components';
import { useTranslation } from 'react-i18next';

import '../../../../styles/SystemMain.scss';

interface BTPSystemProps {
    systemInfo?: BackendSystem;
    setUrl: (url: string | undefined) => void;
    setIsDetailsUpdated: (isUpdated: boolean) => void;
}

export function BTPSystem({ systemInfo, setUrl, setIsDetailsUpdated }: BTPSystemProps): ReactElement {
    const { t } = useTranslation();

    return (
        <div>
            <div className="store-text-field">
                <label className="store-detail-label">{t('labels.authenticationType')}</label>
                <UITextInput tabIndex={-1} id="authTypeReadOnly" readOnly value={t('labels.reentranceTicket')} />
            </div>
            <div className="store-text-field">
                <label className="store-detail-label">
                    {t('labels.url')} <span className="mandatory-asterik">*</span>
                </label>
                <UITextInput
                    name="reentranceTicketUrl"
                    id="reentranceTicketUrl"
                    defaultValue={systemInfo?.url}
                    onChange={(e) => {
                        if (setUrl) {
                            setUrl((e.target as HTMLInputElement).value);
                        }
                        setIsDetailsUpdated(true);
                    }}
                />
            </div>
        </div>
    );
}
