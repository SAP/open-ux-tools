import React from 'react';
import type { ReactElement } from 'react';
import type { ConnectionType } from '@sap-ux/store';
import type { UIDropdownOption } from '@sap-ux/ui-components';
import { UIDropdown } from '@sap-ux/ui-components';
import { useTranslation } from 'react-i18next';

interface ConnectionTypeProps {
    readonly connectionType?: ConnectionType;
    readonly setConnectionType: (connType: ConnectionType) => void;
}

/**
 * Renders the connection types dropdown.
 *
 * @param props - system types props
 * @param props.connectionType - the current connection type
 * @param props.setConnectionType - function to set the connection type
 * @returns - the system types JSX element
 */
export function ConnectionTypes({ connectionType, setConnectionType }: Readonly<ConnectionTypeProps>): ReactElement {
    const { t } = useTranslation();

    const connectionTypeOptions: UIDropdownOption[] = [
        { key: 'abap_catalog', text: t('options.abapCatalog') },
        { key: 'odata_service', text: t('options.serviceUrlEndpoint') },
        { key: 'generic_host', text: t('options.genericHost') }
    ];

    return (
        <div className="store-text-field">
            <label className="store-detail-label">
                {t('labels.connectionType')} <span className="mandatory-asterisk">*</span>
            </label>
            <UIDropdown
                id="connType"
                options={connectionTypeOptions}
                selectedKey={connectionType ?? 'abap_catalog'}
                onChange={(event, option) => {
                    setConnectionType(option?.key as ConnectionType);
                }}
            />
        </div>
    );
}
