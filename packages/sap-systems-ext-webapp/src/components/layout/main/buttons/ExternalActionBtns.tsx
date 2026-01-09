import React from 'react';
import type { BackendSystem, SystemType } from '@sap-ux/store';
import type { ReactElement } from 'react';
import { UIDefaultButton, UiIcons } from '@sap-ux/ui-components';
import { useTranslation } from 'react-i18next';
import { actions } from '../../../../state';

import '../../../../styles/Buttons.scss';

interface ExternalActionBtnsProps {
    systemInfo?: BackendSystem;
    systemUnSaved?: boolean;
}

/**
 * Renders the jsx for external action buttons.
 *
 * @param props - external action buttons props
 * @param props.systemInfo - the system information
 * @param props.systemUnSaved - flag indicating if the system has unsaved changes
 * @returns - the external action buttons JSX element
 */
export function ExternalActionBtns({ systemInfo, systemUnSaved }: Readonly<ExternalActionBtnsProps>): ReactElement {
    const { t } = useTranslation();
    // show export button only if the system is on-prem
    const showExport = (systemInfo?.systemType as SystemType) === 'OnPrem';
    return (
        <div>
            {!systemUnSaved && (
                <div className="action-btns">
                    {showExport && (
                        <div>
                            <UIDefaultButton
                                className="action-btn"
                                id="exportBtn"
                                iconProps={{ iconName: UiIcons.Export }}
                                onClick={(): void => {
                                    if (systemInfo) {
                                        actions.exportSystem(systemInfo);
                                    }
                                }}>
                                {t('buttons.exportSystem')}
                            </UIDefaultButton>
                        </div>
                    )}
                    <div>
                        <UIDefaultButton
                            className="action-btn"
                            id="fioriProjectBtn"
                            iconProps={{ iconName: UiIcons.Lightning }}
                            onClick={(): void => {
                                if (systemInfo?.name) {
                                    actions.createFioriProject(systemInfo);
                                }
                            }}>
                            {t('buttons.createFioriApp')}
                        </UIDefaultButton>
                    </div>
                </div>
            )}
        </div>
    );
}
