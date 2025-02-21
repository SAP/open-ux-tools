import React from 'react';
import type { ReactElement } from 'react';
import { Stack, Text } from '@fluentui/react';
import { UIMessageBar, UIDialog, UITextInput, UIIconButton, UiIcons } from '@sap-ux/ui-components';
import { useDispatch } from 'react-redux';
import type { InfoCenterItem } from '../../slice';
import { MessageBarType } from '@sap-ux-private/control-property-editor-common';
import { toggleExpandMessage, readMessage, clearInfoCenterMessage, toggleModalMessage } from '../../slice';
import { useTranslation } from 'react-i18next';

/**
 * Returns the corresponding string representation of the message type.
 *
 * @param {MessageBarType} type - The type of the message.
 * @returns {'error' | 'warning' | 'info'} The string representation of the message type.
 */
const getMessageType = (type: MessageBarType) => {
    switch (type) {
        case MessageBarType.error:
            return 'error';
        case MessageBarType.warning:
            return 'warning';
        default:
            return 'info';
    }
};

/**
 * React element for info center item.
 *
 * @param item
 * @returns ReactElement
 */
export function InfoMessageItem(item: Readonly<InfoCenterItem>): ReactElement {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const { expandable: isExpandable, expanded: isExpanded, read: isRead, modal: isOpenedModal, message, id } = item;

    return (
        <Stack.Item
            className={`message-bar ${getMessageType(message.type)} ${isRead && 'message-read'}`}
            onMouseOver={() => !isRead && dispatch(readMessage(id))}>
            <UIMessageBar messageBarType={message.type as MessageBarType}>
                <Text block={true} className="message-title">
                    {message.title}
                </Text>
                {message.type !== MessageBarType.error && (
                    <UIIconButton
                        aria-label="remove-message"
                        className="remove-message"
                        onClick={() => dispatch(clearInfoCenterMessage(id))}
                        iconProps={{ iconName: UiIcons.TrashCan }}
                    />
                )}
            </UIMessageBar>
            <Text
                data-index={id}
                block={true}
                className={`message-description ${isExpanded && 'expanded'} ${isExpandable && 'expandable'}`}>
                {message.description}
            </Text>
            {isExpandable && (
                <Text className="more-less" onClick={() => dispatch(toggleExpandMessage(id))}>
                    {t(isExpanded ? 'LESS' : 'MORE')}
                </Text>
            )}
            {message.details && (
                <Text className="message-details" onClick={() => dispatch(toggleModalMessage(id))}>
                    {t('VIEW_DETAILS')}
                </Text>
            )}
            <UIDialog
                hidden={!isOpenedModal}
                dialogContentProps={{
                    title: t('ERROR_DETAILS')
                }}
                acceptButtonText={t('CLOSE')}
                onAccept={() => dispatch(toggleModalMessage(id))}>
                <UITextInput className="modal-text-area" value={message.details} readOnly={true} multiline={true} />
            </UIDialog>
        </Stack.Item>
    );
}
