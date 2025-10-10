import React from 'react';
import type { ReactElement } from 'react';
import type { BackendSystem, SystemType } from '@sap-ux/store';
import { BTPSystem } from './BTPSystem';
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

export function SystemInfo({
    systemInfo,
    setName,
    setUrl,
    setClient,
    setUsername,
    setPassword,
    setIsDetailsUpdated,
    setIsDetailsValid
}: SystemInfoProps): ReactElement {
    const systemType = systemInfo?.systemType as SystemType;
    const showSystemName = systemType === 'OnPrem' || systemType === 'BTP' || systemType === 'S4HC';
    return (
        <div>
            {(() => {
                return (
                    <>
                        {showSystemName && (
                            <SystemName
                                systemName={systemInfo?.name}
                                setName={setName}
                                setIsDetailsUpdated={setIsDetailsUpdated}
                            />
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
                        {(systemType === 'BTP' || systemType === 'S4HC') && (
                            <BTPSystem
                                systemInfo={systemInfo}
                                setUrl={setUrl}
                                setIsDetailsUpdated={setIsDetailsUpdated}
                            />
                        )}
                    </>
                );
            })()}
        </div>
    );
}
