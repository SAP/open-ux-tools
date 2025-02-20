import type { ReactElement } from 'react';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Label, Stack } from '@fluentui/react';
import { useDispatch, useSelector } from 'react-redux';
import type { InfoCenterItem } from '../../slice';
import { clearAllInfoCenterMessages, expandableMessage } from '../../slice';
import { UIIconButton, UiIcons } from '@sap-ux/ui-components';
import type { RootState } from '../../store';
import { InfoMessageItem } from './InfoMessageItem';
import './InfoCenter.scss';

/**
 * React element for info center messages.
 *
 * @returns ReactElement
 */
export function InfoCenter(): ReactElement {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const messages = useSelector<RootState, InfoCenterItem[]>((state) => state.infoCenterMessages);

    /**
     * This effect selects all elements with the class "message-description" (which represent message descriptions)
     * and checks if their content is clamped (i.e. truncated) by comparing each element's scrollHeight with its clientHeight.
     * If an element's content is clamped and it is not already marked as expandable, the effect dispatches an action
     * to mark the corresponding message as expandable.
     *
     * @returns {void} This effect does not return a value.
     */
    useEffect(() => {
        document.querySelectorAll('.message-description').forEach((element) => {
            const htmlElement = element as HTMLElement;
            const isExpandable = htmlElement.classList.contains('expandable');
            const { scrollHeight, clientHeight } = htmlElement;
            const id = String(htmlElement.dataset.index);

            if (scrollHeight > clientHeight && !isExpandable) {
                dispatch(expandableMessage(id));
            }
        });
    }, [messages, dispatch]);

    return (
        <Stack>
            <div className="info-center-header">
                <Stack.Item>
                    <Label data-aria-label={t('INFO_CENTER')}>{t('INFO_CENTER')}</Label>
                </Stack.Item>
                <Stack.Item>
                    <UIIconButton
                        aria-label="clear-all"
                        onClick={() => dispatch(clearAllInfoCenterMessages())}
                        iconProps={{ iconName: UiIcons.TextGrammarDismiss }}
                    />
                </Stack.Item>
            </div>
            <div className="info-center-items auto-element-scroller">
                {messages.map((messageItem) => {
                    return <InfoMessageItem key={messageItem.id} {...messageItem} />;
                })}
            </div>
        </Stack>
    );
}
