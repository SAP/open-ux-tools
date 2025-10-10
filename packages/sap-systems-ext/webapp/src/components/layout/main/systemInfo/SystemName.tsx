import React from 'react';
import type { ReactElement } from 'react';
import { UITextInput } from '@sap-ux/ui-components';
import { useTranslation } from 'react-i18next';

import '../../../../styles/SystemMain.scss';

interface SystemNameProps {
    systemName?: string;
    setName: (name: string | undefined) => void;
    setIsDetailsUpdated: (isUpdated: boolean) => void;
}

export function SystemName({ systemName, setName, setIsDetailsUpdated }: SystemNameProps): ReactElement {
    const { t } = useTranslation();

    return (
        <div className="store-text-field">
            <label className="store-detail-label">
                {t('labels.name')} <span className="mandatory-asterik">*</span>
            </label>
            <UITextInput
                name="systemName"
                id="sysName"
                defaultValue={systemName}
                onChange={(e) => {
                    setName((e.target as HTMLInputElement).value);
                    setIsDetailsUpdated(true);
                }}
            />
        </div>
    );
}
