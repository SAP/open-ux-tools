import { MessageBarType, showInfoCenterMessage } from '@sap-ux-private/control-property-editor-common';
import MessageToast from 'sap/m/MessageToast';
import { CommunicationService } from '../cpe/communication-service';
import { getTextBundle } from '../i18n';

const FIVE_SEC_IN_MS = 5000;

/**
 * Localization key interface for defining message keys and optional parameters.
 */
interface LocalizationKey {
    key: string;
    params?: string[];
}

/**
 * LocalizedMessage interface for defining the structure of a localized message.
 * It includes title, description, optional details, type, and options for toast display.
 */
interface LocalizedMessage {
    title: LocalizationKey | string;
    description: LocalizationKey | string;
    details?: LocalizationKey | string;
    type: MessageBarType;
    showToast?: boolean;
    toastDuration?: number;
}

/**
 * Shows a localized/plain string message: displays a toast and sends an info center message. The
 * toast message is optional, and the info center message is always sent. By default, the toast
 * message is shown for five seconds, but this can be customized.
 * 
 * @param {LocalizedMessage} message - The message object containing title, description, type, and whether to show a toast.
 */
export async function showLocalizedMessage(message: LocalizedMessage): Promise<void> {
    const title = isString(message.title) ? message.title : await getTranslation(message.title);
    const description = isString(message.description) ? message.description : await getTranslation(message.description);
    const details = isString(message.details) || !message.details ? message.details : await getTranslation(message.details);
    const showToast = message.showToast ?? true;

    if (showToast) {
        MessageToast.show(description, {
            duration: message.toastDuration ?? FIVE_SEC_IN_MS,
        });
    }

    CommunicationService.sendAction(showInfoCenterMessage({
        ...message,
        title,
        description,
        details
    }));
}

/**
 * Type guard for a string values.
 *
 * @param {unknown} value - The value being checked.
 * @returns {boolean} True if the value is of type string.
 */
function isString(value: unknown): value is string {
    return typeof value === 'string';
}

/**
 * 
 * @param key - The localization key to retrieve the translation for.
 * @returns {Promise<string>} A promise that resolves to the translated string.
 */
async function getTranslation(key: LocalizationKey): Promise<string> {
    const bundle = await getTextBundle();
    return bundle.getText(key.key, key.params);
}