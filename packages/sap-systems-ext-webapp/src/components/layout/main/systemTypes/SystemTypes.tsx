import React from 'react';
import type { ReactElement } from 'react';
import type { UIDropdownOption } from '@sap-ux/ui-components';
import type { SystemType } from '@sap-ux/store';
import { UIDropdown } from '@sap-ux/ui-components';
import { useTranslation } from 'react-i18next';

interface SystemTypesProps {
    readonly setType: (type: SystemType) => void;
    readonly setAuthenticationType: (authType: string) => void;
}

/**
 * Renders the system types dropdown.
 *
 * @param props - system types props
 * @param props.setType - function to set the system type
 * @param props.setAuthenticationType - function to set the authentication type
 * @returns - the system types JSX element
 */
export function SystemTypes({ setType, setAuthenticationType }: Readonly<SystemTypesProps>): ReactElement {
    const { t } = useTranslation();

    const setTypes = (type: SystemType): void => {
        setType(type);
        if (type === 'AbapCloud') {
            setAuthenticationType('reentranceTicket');
        } else if (type === 'OnPrem') {
            setAuthenticationType('basic');
        }
    };

    const systemTypeOptions: UIDropdownOption[] = [
        {
            key: 'OnPrem',
            text: t('titles.onPremSystem')
        },
        {
            key: 'AbapCloud',
            text: t('titles.btpSystem')
        }
    ];

    return (
        <div className="store-text-field ">
            <label className="store-detail-label">
                {t('labels.type')} <span className="mandatory-asterisk">*</span>
            </label>
            <UIDropdown
                id="sysType"
                options={systemTypeOptions}
                placeholder={t('placeholders.typeOptions')}
                onChange={(event, option) => {
                    setTypes(option?.key as SystemType);
                }}
            />
        </div>
    );
}
