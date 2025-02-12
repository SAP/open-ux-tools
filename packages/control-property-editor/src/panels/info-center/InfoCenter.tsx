import type { ReactElement } from 'react';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Label, Stack, Text } from '@fluentui/react';
import { useDispatch, useSelector } from 'react-redux';
import type { InfoCenterMessage } from '@sap-ux-private/control-property-editor-common';
import {
    clearInfoCenterMessage,
    clearAllInfoCenterMessages,
    MessageBarType,
    toggleExpandMessage,
    readMessage,
    expandableMessage,
    toggleModalMessage
} from '@sap-ux-private/control-property-editor-common';
import { UIMessageBar, UIIconButton, UiIcons, UIDialog, UITextInput } from '@sap-ux/ui-components';
import type { RootState } from '../../store';
import { sectionHeaderFontSize } from '../properties/constants';
import './InfoCenter.scss';

/**
 * React element for info center messages.
 *
 * @returns ReactElement
 */
export function InfoCenter(): ReactElement {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const messages = useSelector<RootState, InfoCenterMessage[]>((state) => state.infoCenterMessages);

    /**
     * Returns the corresponding string representation of the message type.
     *
     * @param {MessageBarType} type - The type of the message.
     * @returns {'error' | 'warning' | 'info'} The string representation of the message type.
     */
    function getMessageType(type: MessageBarType) {
        switch (type) {
            case MessageBarType.error:
                return 'error';
            case MessageBarType.warning:
                return 'warning';
            default:
                return 'info';
        }
    }

    useEffect(() => {
        document.querySelectorAll('.message-description').forEach((element) => {
            const { scrollHeight, clientHeight, accessKey } = element as HTMLElement;
            if (scrollHeight > clientHeight) {
                dispatch(expandableMessage(Number(accessKey)));
            }
        });
    }, [messages, dispatch]);

    return (
        <Stack>
            <div className="info-center-header">
                <Stack.Item>
                    <Label
                        data-aria-label={t('INFO CENTER')}
                        style={{
                            color: 'var(--vscode-foreground)',
                            fontSize: sectionHeaderFontSize,
                            fontWeight: 'bold',
                            padding: 0
                        }}>
                        {t('INFO CENTER')}
                    </Label>
                </Stack.Item>
                <Stack.Item>
                    <UIIconButton
                        aria-label="clear-all"
                        onClick={() => dispatch(clearAllInfoCenterMessages())}
                        iconProps={{ iconName: UiIcons.TextGrammarDismiss }}
                    />
                </Stack.Item>
            </div>
            <Stack className="info-center-items">
                {messages.map((info, index) => {
                    const {
                        expandable: isExpandable,
                        expanded: isExpanded,
                        read: isRead,
                        modal: isOpenedModal,
                        message,
                        type
                    } = info;
                    return (
                        <Stack.Item
                            key={index}
                            className={`message-bar ${getMessageType(type)} ${isRead && 'message-read'}`}
                            onMouseOver={() => dispatch(readMessage(index))}>
                            <UIMessageBar messageBarType={type as MessageBarType}>
                                <Text block={true} className="message-title">
                                    {message.title}
                                </Text>
                                {type !== MessageBarType.error && (
                                    <UIIconButton
                                        className="remove-message"
                                        onClick={() => dispatch(clearInfoCenterMessage(index))}
                                        iconProps={{ iconName: UiIcons.TrashCan }}
                                    />
                                )}
                            </UIMessageBar>
                            <Text
                                accessKey={index.toString()}
                                block={true}
                                className={`message-description ${isExpanded && 'expanded'} ${
                                    isExpandable && 'expandable'
                                }`}>
                                {message.description}
                            </Text>
                            {isExpandable && (
                                <Text className="more-less" onClick={() => dispatch(toggleExpandMessage(index))}>
                                    {isExpanded ? 'Less' : 'More'}
                                </Text>
                            )}
                            {message.details && (
                                <Text
                                    className="message-details"
                                    onClick={() => dispatch(toggleModalMessage(index))}>
                                    {'View Details'}
                                </Text>
                            )}
                            <UIDialog
                                hidden={!isOpenedModal}
                                dialogContentProps={{
                                    title: 'Error Details'
                                }}
                                acceptButtonText="Close"
                                onAccept={() => dispatch(toggleModalMessage(index))}>
                                <UITextInput
                                    className="modal-text-area"
                                    value={message.details}
                                    readOnly={true}
                                    multiline={true}
                                />
                            </UIDialog>
                        </Stack.Item>
                    );
                })}
            </Stack>
        </Stack>
    );
}
