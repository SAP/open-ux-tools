import React from 'react';
import type { ReactElement } from 'react';
import { UITextInput } from '@sap-ux/ui-components';
import { useTranslation } from 'react-i18next';

import '../../../../styles/SystemMain.scss';

interface ConnectionNameProps {
    connectionName?: string;
    setName: (name: string | undefined) => void;
    setIsDetailsUpdated: (isUpdated: boolean) => void;
}

/**
 * Renders the connection name input field.
 *
 * @param props - connection name props
 * @param props.connectionName - the connection name value
 * @param props.setName - function to set the connection name
 * @param props.setIsDetailsUpdated - function to set the details updated flag
 * @returns - the connection name JSX element
 */
export function ConnectionName({
    connectionName,
    setName,
    setIsDetailsUpdated
}: Readonly<ConnectionNameProps>): ReactElement {
    const { t } = useTranslation();

    return (
        <div className="store-text-field">
            <label className="store-detail-label">
                {t('labels.name')} <span className="mandatory-asterisk">*</span>
            </label>
            <UITextInput
                name="connectionName"
                id="connName"
                value={connectionName}
                onChange={(e) => {
                    setName((e.target as HTMLInputElement).value);
                    setIsDetailsUpdated(true);
                }}
            />
        </div>
    );
}
