import React from 'react';
import type { ReactElement } from 'react';
import type { UIDropdownOption } from '@sap-ux/ui-components';
import type { SystemType } from '@sap-ux/store';
import { UIDropdown } from '@sap-ux/ui-components';
import { useTranslation } from 'react-i18next';

interface SystemTypesProps {
    setType: (type: SystemType) => void;
}

export function SystemTypes({ setType }: SystemTypesProps): ReactElement {
    const { t } = useTranslation();

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
                {t('labels.type')} <span className="mandatory-asterik">*</span>
            </label>
            <UIDropdown
                id="sysType"
                options={systemTypeOptions}
                placeholder={t('placeholders.typeOptions')}
                onChange={(event, option) => {
                    setType(option?.key as SystemType);
                }}
            />
        </div>
    );
}
