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

/**
 * Renders the system name input field.
 *
 * @param props - system name props
 * @param props.systemName - the system name value
 * @param props.setName - function to set the system name
 * @param props.setIsDetailsUpdated - function to set the details updated flag
 * @returns - the system name JSX element
 */
export function SystemName({ systemName, setName, setIsDetailsUpdated }: Readonly<SystemNameProps>): ReactElement {
    const { t } = useTranslation();

    return (
        <div className="store-text-field">
            <label className="store-detail-label">
                {t('labels.name')} <span className="mandatory-asterisk">*</span>
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
