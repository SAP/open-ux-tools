import { MessageBarType, showInfoCenterMessage } from '@sap-ux-private/control-property-editor-common';
import { CommunicationService } from '../cpe/communication-service';
import { getTextBundle } from '../i18n';

/**
 * Localization key interface for defining message keys and optional parameters.
 */
interface LocalizationKey {
    key: string;
    params?: string[];
}

/**
 * InfoCenterMessage interface for defining the structure of an Info center message.
 * It includes title, description, optional details, and type.
 */
interface InfoCenterMessage {
    title: LocalizationKey | string;
    description: LocalizationKey | string;
    details?: LocalizationKey | string;
    type: MessageBarType;
}

/**
 * Shows a localized/plain string message in the Info center.
 * 
 * @param {InfoCenterMessage} message - The message object containing title, description,
 * details and type for the message. Each text in the message can be localized or
 * left as a plain string.
 */
export async function sendInfoCenterMessage({ title, description, details, type }: InfoCenterMessage): Promise<void> {
    title = isString(title) ? title : await getTranslation(title);
    description = isString(description) ? description : await getTranslation(description);
    details = isString(details) || !details ? details : await getTranslation(details);

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