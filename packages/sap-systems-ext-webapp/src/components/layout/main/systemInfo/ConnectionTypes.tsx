import React from 'react';
import type { ReactElement } from 'react';
import type { ConnectionType } from '@sap-ux/store';
import { UIChoiceGroup } from '@sap-ux/ui-components';
import { useTranslation } from 'react-i18next';

interface ConnectionTypeProps {
    readonly setConnectionType?: (connType: ConnectionType) => void;
}

/**
 * Renders the connection types radio buttons.
 *
 * @param props - system types props
 * @param props.setConnectionType - function to set the connection type
 * @returns - the system types JSX element
 */
export function ConnectionTypes({ setConnectionType }: Readonly<ConnectionTypeProps>): ReactElement {
    const { t } = useTranslation();

    const connectionTypeOptions: { key: ConnectionType; text: string }[] = [
        { key: 'abap_catalog', text: t('options.abapCatalog') },
        { key: 'odata_service', text: t('options.serviceUrlEndpoint') }
    ];

    return (
        <div className="store-text-field">
            <label className="store-detail-label">{'Connection Type'}</label>
            <UIChoiceGroup
                name="connectionType"
                id="connType"
                options={connectionTypeOptions}
                defaultSelectedKey={'abap_catalog'}
                inline={true}
                onChange={(e, option) => {
                    setConnectionType?.(option?.key as ConnectionType);
                }}
            />
        </div>
    );
}
