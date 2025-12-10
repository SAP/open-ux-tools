export enum ApiErrorCode {
    General = 1,
    CompileError = 2,
    ComplexityViolation = 3,
    LocalAnnotationFileNotFound = 4
}

/**
 *
 */
export class ApiError extends Error {
    errorCode: ApiErrorCode;
    messageMap: Map<string, string[]>;

    /**
     *
     * @param message - Error message text.
     * @param errorCode - Error Code.
     * @param messageMap - Detailed message map.
     */
    constructor(message: string, errorCode?: ApiErrorCode, messageMap?: Map<string, string[]>) {
        super(message);
        this.messageMap = messageMap ?? new Map();
        this.errorCode = errorCode ?? ApiErrorCode.General;
    }

    /**
     * Converts the error object to its string representation.
     *
     * @param extendedInfo - Flag indicating that additional error information should be added.
     * @returns A string representing the specified `Error` object.
     */
    toString(extendedInfo = false): string {
        const baseMessage = super.toString();
        if (extendedInfo) {
            const otherMessageText = this.messageMap.size > 0 ? this.convertMessages() : '';
            return [baseMessage, `Error code: ${this.errorCode}`, otherMessageText].join('. ');
        }
        return baseMessage;
    }

    /**
     * Returns detailed error message.
     *
     * @returns A detailed error message.
     */
    getExtendedMessage(): string {
        const baseMessage = this.message;
        if (this.messageMap.size > 0) {
            return [baseMessage, this.convertMessages()].join('. ');
        }
        return baseMessage;
    }

    private convertMessages(): string {
        let text = 'Other messages:';
        for (const [key, messages] of this.messageMap.entries()) {
            text += `\n[${key}]:`;
            for (const message of messages) {
                text += `\n- ${message}`;
            }
        }
        return text;
    }
}
