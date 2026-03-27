import React from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { UITextInput, UIIcon, UiIcons, UITooltip, UITooltipUtils } from '@sap-ux/ui-components';

import '../../../../styles/SystemMain.scss';

interface ServicePathProps {
    setServicePath: (servicePath: string | undefined) => void;
    setIsDetailsUpdated: (isUpdated: boolean) => void;
}

/**
 * Renders the service path input field.
 *
 * @param props - service path props
 * @param props.setServicePath - function to set the service path
 * @param props.setIsDetailsUpdated - function to set the details updated flag
 * @returns - the service path JSX element
 */
export function ServicePath({ setServicePath, setIsDetailsUpdated }: Readonly<ServicePathProps>): ReactElement {
    const { t } = useTranslation();

    const servicePathTooltipContent = (
        <div className="url-tooltip">
            {t('tooltips.servicePathDescription')}
            <br />
            {t('tooltips.contentNotSaved')}
        </div>
    );

    return (
        <div className="store-text-field">
            <UITooltip tooltipProps={UITooltipUtils.renderContent(servicePathTooltipContent)} delay={0}>
                <label className="store-detail-label">{t('labels.servicePath')}</label>{' '}
                <UIIcon className="service-path-info-icon" iconName={UiIcons.Info} />
            </UITooltip>
            <UITextInput
                name="systemServicePath"
                id="sysServicePath"
                onChange={(e) => {
                    setServicePath((e.target as HTMLInputElement).value);
                    setIsDetailsUpdated(true);
                }}
            />
        </div>
    );
}
