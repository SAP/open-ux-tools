import ResourceBundle from 'sap/base/i18n/ResourceBundle';
import ResourceModel from 'sap/ui/model/resource/ResourceModel';
import type UI5Element from 'sap/ui/core/Element';

/**
 * Function to validate if a given value is a valid binding model.
 *
 * @param modifiedControl control to be modified.
 * @param value value to be checked.
 */
export function validateBindingModel(modifiedControl: UI5Element, value: string): void {
    const bindingValue = value.replace(/[{}]/gi, '').trim();
    const bindingParts = bindingValue.split('>').filter((el) => el !== '');

    if (!bindingParts.length) {
        throw new SyntaxError('Invalid binding string.');
    }

    if (bindingParts[0].trim() === 'i18n') {
        if (bindingParts.length === 2) {
            const resourceKey = bindingParts[1].trim();
            const resourceBundle = (modifiedControl.getModel('i18n') as ResourceModel).getResourceBundle() as ResourceBundle;
            if (!resourceBundle.getText(resourceKey, undefined, true)) {
                throw new SyntaxError(
                    'Invalid key in the binding string. Supported value pattern is {i18n>YOUR_KEY}. Check if the key already exists in i18n.properties.' +
                        'If not, add the key in the i18n.properties file and reload the editor for the new key to take effect.'
                );
            }
        } else {
            throw new SyntaxError('Invalid binding string. Supported value pattern is {i18n>YOUR_KEY}');
        }
    }
}
