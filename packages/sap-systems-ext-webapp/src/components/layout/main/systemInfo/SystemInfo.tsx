import React from 'react';
import type { ReactElement } from 'react';
import type { BackendSystem, SystemType } from '@sap-ux/store';
import { CloudSystem } from './CloudSystem';
import { OnPremSystem } from './OnPremSystem';
import { SystemName } from './SystemName';

import '../../../../styles/SystemMain.scss';

interface SystemInfoProps {
    systemInfo?: BackendSystem;
    setName: (name: string | undefined) => void;
    setUrl: (url: string | undefined) => void;
    setClient: (client: string | undefined) => void;
    setUsername: (username: string) => void;
    setPassword: (password: string) => void;
    setIsDetailsUpdated: (isUpdated: boolean) => void;
    setIsDetailsValid: (isValid: boolean) => void;
}

/**
 * Renders the system information input fields based on the system type.
 *
 * @param props - system information props
 * @param props.systemInfo - the system information
 * @param props.setName - function to set the system name
 * @param props.setUrl - function to set the URL
 * @param props.setClient - function to set the client
 * @param props.setUsername - function to set the username
 * @param props.setPassword - function to set the password
 * @param props.setIsDetailsUpdated - function to set the details updated flag
 * @param props.setIsDetailsValid - function to set the details valid flag
 * @returns - the system information JSX element
 */
export function SystemInfo({
    systemInfo,
    setName,
    setUrl,
    setClient,
    setUsername,
    setPassword,
    setIsDetailsUpdated,
    setIsDetailsValid
}: Readonly<SystemInfoProps>): ReactElement {
    const systemType = systemInfo?.systemType as SystemType;
    const showSystemName = systemType === 'OnPrem' || systemType === 'AbapCloud';

    return (
        <div>
            {showSystemName && (
                <SystemName systemName={systemInfo?.name} setName={setName} setIsDetailsUpdated={setIsDetailsUpdated} />
            )}
            {systemType === 'OnPrem' && (
                <OnPremSystem
                    systemInfo={systemInfo}
                    setUrl={setUrl}
                    setClient={setClient}
                    setUsername={setUsername}
                    setPassword={setPassword}
                    setIsDetailsUpdated={setIsDetailsUpdated}
                    setIsDetailsValid={setIsDetailsValid}
                />
            )}
            {systemType === 'AbapCloud' && (
                <CloudSystem systemInfo={systemInfo} setUrl={setUrl} setIsDetailsUpdated={setIsDetailsUpdated} />
            )}
        </div>
    );
}
