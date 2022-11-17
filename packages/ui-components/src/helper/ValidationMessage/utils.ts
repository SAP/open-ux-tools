import type { IRawStyle } from '@fluentui/react';

export const enum ErrorMessageType {
    Error = 'Error',
    Warning = 'Warning',
    Info = 'Info'
}

export interface UIMessagesExtendedProps {
    warningMessage?: string;
    infoMessage?: string;
}

export interface UIComponentMessagesProps extends UIMessagesExtendedProps {
    errorMessage?: string;
}

export interface InputErrorMessageStyles {
    error: IRawStyle;
    warning: IRawStyle;
    info: IRawStyle;
}

export interface InputValidationMessageInfo {
    style: IRawStyle;
    type: ErrorMessageType;
    message?: string;
}

/**
 * Private method to get common styling for coloring by applying incoming colors.
 *
 * @param {string} bgColor Background color.
 * @param {string} borderColor Border color.
 * @returns {IRawStyle} Object with styles for message.
 */
const getMessageColorStylings = (bgColor: string, borderColor: string): IRawStyle => {
    const border = `1px solid ${borderColor}`;
    return {
        backgroundColor: bgColor,
        borderLeft: border,
        borderRight: border,
        borderBottom: border,
        borderColor: borderColor
    };
};

const messagesStyles: InputErrorMessageStyles = {
    error: {
        color: 'var(--vscode-input-foreground)',
        ...getMessageColorStylings(
            'var(--vscode-inputValidation-errorBackground)',
            'var(--vscode-inputValidation-errorBorder)'
        ),
        paddingTop: 4,
        paddingBottom: 5,
        paddingLeft: 8,
        margin: 0
    },
    warning: {},
    info: {}
};

messagesStyles.warning = {
    ...messagesStyles.error,
    ...getMessageColorStylings(
        'var(--vscode-inputValidation-warningBackground)',
        'var(--vscode-inputValidation-warningBorder)'
    )
};

messagesStyles.info = {
    ...messagesStyles.error,
    ...getMessageColorStylings(
        'var(--vscode-inputValidation-infoBackground)',
        'var(--vscode-inputValidation-infoBorder)'
    )
};

export const MESSAGE_TYPES_CLASSNAME_MAP = new Map<ErrorMessageType | undefined, string>([
    [undefined, 'error'],
    [ErrorMessageType.Error, 'error'],
    [ErrorMessageType.Warning, 'warning'],
    [ErrorMessageType.Info, 'info']
]);

/**
 * Method returns input message styles for passed message type.
 * Default style is for Error message.
 *
 * @param {ErrorMessageType} [type] Message type.
 * @returns {IRawStyle} Object with styles for message.
 */
const getMessageStyle = (type?: ErrorMessageType): IRawStyle => {
    let style: IRawStyle;
    switch (type) {
        case ErrorMessageType.Warning: {
            style = messagesStyles.warning;
            break;
        }
        case ErrorMessageType.Info: {
            style = messagesStyles.info;
            break;
        }
        default: {
            style = messagesStyles.error;
            break;
        }
    }
    return style;
};

/**
 * Method returns error message type depends on properties of UIComponentMessagesProps.
 *
 * @param {UIComponentMessagesProps} [props] Component props.
 * @returns {ErrorMessageType} Message type.
 */
const getMessageType = (props?: UIComponentMessagesProps): ErrorMessageType => {
    if (props) {
        if (props.errorMessage) {
            return ErrorMessageType.Error;
        } else if (props.warningMessage) {
            return ErrorMessageType.Warning;
        } else if (props.infoMessage) {
            return ErrorMessageType.Info;
        }
    }
    return ErrorMessageType.Error;
};

/**
 * Method returns error message string by handling property of all messages like Error Warning and Info.
 *
 *  @param {UIComponentMessagesProps} [props] Component props.
 * @returns {string | undefined} Message string.
 */
const getErrorMessage = (props?: UIComponentMessagesProps): string | undefined => {
    return props?.errorMessage || props?.warningMessage || props?.infoMessage;
};

/**
 * Method returns object containing data to display message for component.
 *
 * @param {UIMessagesExtendedProps} [props] Component props.
 * @returns {InputValidationMessageInfo} Message info.
 */
export const getMessageInfo = (props?: UIMessagesExtendedProps): InputValidationMessageInfo => {
    const errorType = getMessageType(props);
    return {
        type: errorType,
        style: getMessageStyle(errorType),
        message: getErrorMessage(props)
    };
};
