import { MessageBarType, showInfoCenterMessage } from '@sap-ux-private/control-property-editor-common';
import MessageToast from 'sap/m/MessageToast';
import { CommunicationService } from '../cpe/communication-service';
import { getTextBundle } from '../i18n';

const DEFAULT_TOAST_DURATION_IN_MS = 5000;

/**
 * Localization key interface for defining message keys and optional parameters.
 */
interface LocalizationKey {
    key: string;
    params?: string[];
}

/**
 * InfoCenterMessage interface for defining the structure of an Info center message.
 * It includes title, description, optional details, type, and options for toast display.
 */
interface InfoCenterMessage {
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
 * @param {InfoCenterMessage} message - The message object containing title, description, type, and whether to show a toast.
 */
export async function sendInfoCenterMessage({ title, description, details, type, showToast = true, toastDuration }: InfoCenterMessage): Promise<void> {
    title = isString(title) ? title : await getTranslation(title);
    description = isString(description) ? description : await getTranslation(description);
    details = isString(details) || !details ? details : await getTranslation(details);

    if (showToast) {
        MessageToast.show(description, {
            duration: toastDuration ?? DEFAULT_TOAST_DURATION_IN_MS,
        });
    }

    CommunicationService.sendAction(showInfoCenterMessage({
        title,
        description,
        details,
        type
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
 * @param {LocalizationKey} localizationKey - The localization key to retrieve the translation for.
 * @returns {Promise<string>} A promise that resolves to the translated string.
 */
async function getTranslation({ key, params }: LocalizationKey): Promise<string> {
    const bundle = await getTextBundle();
    return bundle.getText(key, params);
}