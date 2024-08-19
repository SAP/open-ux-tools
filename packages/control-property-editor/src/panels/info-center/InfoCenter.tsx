import type { ReactElement } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Label, MessageBarType } from '@fluentui/react';
import { useDispatch, useSelector } from 'react-redux';

import type { InfoCenterMessage } from '@sap-ux-private/control-property-editor-common';
import { clearInfoCenterMessage } from '@sap-ux-private/control-property-editor-common';
import { UIMessageBar, UIIcon, UIIconButton } from '@sap-ux/ui-components';

import type { RootState } from '../../store';
import { sectionHeaderFontSize } from '../properties/constants';

import './InfoCenter.scss';

/**
 * React element for all properties including id & type and property editors.
 *
 * @returns ReactElement
 */
export function InfoCenter(): ReactElement {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const infoCenter = useSelector<RootState, InfoCenterMessage[]>((state) => state.infoCenter);
    console.log(infoCenter);

    return (
        <>
            <div className={`property-content app-panel-scroller`}>
                <Label
                    data-aria-label={t('INFO_CENTER')}
                    style={{
                        color: 'var(--vscode-foreground)',
                        fontSize: sectionHeaderFontSize,
                        fontWeight: 'bold',
                        padding: 0,
                        marginBottom: '10px'
                    }}>
                    {t('INFO_CENTER')}
                </Label>
                <div className={`info-center-items`}>
                    {infoCenter.map((info, index)=> (
                        <UIMessageBar key={index} messageBarType={info.type as unknown as MessageBarType} className="message-bar">
                            <div>{info.message}</div>
                            <div className="icon-button-container">
                                <UIIconButton onClick={() => dispatch(clearInfoCenterMessage(index))}>
                                    <UIIcon iconName='Clear' />
                                </UIIconButton>
                            </div>
                        </UIMessageBar>
                    ))}
                </div>
            </div>
        </>
    );
}
