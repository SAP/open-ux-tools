import ResourceBundle from 'sap/base/i18n/ResourceBundle';
import ResourceModel from 'sap/ui/model/resource/ResourceModel';
import type UI5Element from 'sap/ui/core/Element';
import { getTextBundle } from '../../i18n';

/**
 * Function to validate if a given value is a valid binding model.
 *
 * @param modifiedControl control to be modified.
 * @param value value to be checked.
 */
export async function validateBindingModel(modifiedControl: UI5Element, value: string): Promise<void> {
    const textBundle = await getTextBundle();
    const bindingValue = value.replace(/[{}]/gi, '').trim();
    const bindingParts = bindingValue.split('>').filter((el) => el !== '');

    if (!bindingParts.length) {
        throw new SyntaxError(textBundle.getText('INVALID_BINDING_STRING'));
    }

    if (bindingParts.length === 2) {
        const bindingModel = bindingParts[0];
        const resourceKey = bindingParts[1].trim();
        const resourceModel = (modifiedControl.getModel(bindingModel) as ResourceModel);
        if(!resourceModel) {
            throw new SyntaxError(textBundle.getText('INVALID_BINDING_MODEL'));
        }
        const resourceBundle = resourceModel.getResourceBundle() as ResourceBundle;
        if (!resourceBundle.getText(resourceKey, undefined, true)) {
            throw new SyntaxError(textBundle.getText('INVALID_BINDING_MODEL_KEY'));
        }
    } else {
        throw new SyntaxError(textBundle.getText('INVALID_BINDING_STRING_FORMAT'));
    }
}
