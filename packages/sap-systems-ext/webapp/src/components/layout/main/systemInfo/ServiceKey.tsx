import type { ReactElement } from 'react';
import React from 'react';
import { UITextInput } from '@sap-ux/ui-components';
import { useTranslation } from 'react-i18next';

import '../../../../styles/ServiceKey.scss';
export interface ServiceKeyProps {
    serviceKey: string;
}

export function ServiceKey({ serviceKey }: ServiceKeyProps): ReactElement {
    const { t } = useTranslation();

    return (
        <div className="store-text-field ">
            <label className="store-detail-label">
                {t('labels.serviceKeys')} <span className="mandatory-asterik">*</span>
            </label>
            <UITextInput
                id="serviceKeyField"
                name="systemServiceKey"
                defaultValue={serviceKey}
                multiline={true}
                readOnly={true}
            />
        </div>
    );
}
