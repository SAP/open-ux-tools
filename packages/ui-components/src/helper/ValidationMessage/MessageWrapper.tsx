import React from 'react';
import type { InputValidationMessageInfo } from './utils';
import { ErrorMessageType, MESSAGE_TYPES_CLASSNAME_MAP } from './utils';
import { UiIcons } from '../../components/Icons';
import { UIIcon } from '../../components/UIIcon';

import './MessageWrapper.scss';

export interface MessageWrapperProps {
    children?: React.ReactNode;
    message: InputValidationMessageInfo;
}

export const MESSAGE_ICONS_MAP = new Map<ErrorMessageType | undefined, UiIcons>([
    [undefined, UiIcons.Error],
    [ErrorMessageType.Error, UiIcons.Error],
    [ErrorMessageType.Warning, UiIcons.Warning],
    [ErrorMessageType.Info, UiIcons.Info]
]);

/**
 * Method return MessageWrapper react element.
 *
 * @param props
 * @returns {React.ReactElement}
 */
export function MessageWrapper(props: MessageWrapperProps): React.ReactElement {
    const { children, message } = props;
    const errorSuffix = message.message ? MESSAGE_TYPES_CLASSNAME_MAP.get(message.type) : undefined;
    const icon = MESSAGE_ICONS_MAP.get(message.type);
    return (
        <div className={`ts-message-wrapper ts-message-wrapper--${errorSuffix}`}>
            <div className="ts-message-target">{children}</div>
            <div className="ts-message-body">
                <UIIcon iconName={icon} />
                <span>{message.message}</span>
            </div>
        </div>
    );
}
