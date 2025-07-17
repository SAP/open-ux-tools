import * as React from 'react';
import { render } from '@testing-library/react';
import type { ICheckboxStyles, IRawStyle } from '@fluentui/react';
import { UICheckbox } from '../../../src/components/UICheckbox';
import type { UICheckboxProps } from '../../../src/components/UICheckbox';
import { ErrorMessageType } from '../../../src/helper/ValidationMessage/utils';
import type { InputValidationMessageInfo } from '../../../src/helper/ValidationMessage/utils';

// Test helper class to access protected methods
class UICheckboxTestHelper extends UICheckbox {
    public testSetStyle(messageInfo: InputValidationMessageInfo, props: any): ICheckboxStyles {
        return this.setStyle(messageInfo, props);
    }
}

describe('<UICheckbox />', () => {
    const globalClassNames = {
        root: 'ms-Checkbox',
        checkmark: 'ms-Checkbox-checkmark',
        checkbox: 'ms-Checkbox-checkbox',
        text: 'ms-Checkbox-text',
        error: 'ts-message-wrapper--error'
    };

    it('Should render a UICheckbox component', () => {
        render(<UICheckbox />);
        expect(document.querySelector(`.${globalClassNames.root}`)).toBeTruthy();
    });

    describe('Styles - validation message', () => {
        it('No message', () => {
            const { container } = render(<UICheckbox />);

            // Create a test instance to access the styles method
            const testInstance = new UICheckboxTestHelper({});
            const messageInfo: InputValidationMessageInfo = {
                message: undefined,
                type: ErrorMessageType.Info,
                style: {}
            };
            const styles = testInstance.testSetStyle(messageInfo, {}) as ICheckboxStyles;
            const rootStyles = styles.root as IRawStyle;
            expect(rootStyles[2]).toEqual(undefined);
            expect(container.querySelector(`.${globalClassNames.error}`)).toBeFalsy();
        });

        it('Error', () => {
            const { container } = render(<UICheckbox errorMessage="dummy" />);

            // Create a test instance to access the styles method
            const testInstance = new UICheckboxTestHelper({ errorMessage: 'dummy' });
            const messageInfo: InputValidationMessageInfo = {
                message: 'dummy',
                type: ErrorMessageType.Error,
                style: {}
            };
            const styles = testInstance.testSetStyle(messageInfo, {}) as ICheckboxStyles;
            const rootStyles = styles.root as IRawStyle;
            expect(rootStyles[2].marginBottom).toEqual(2);
            expect(container.querySelector(`.${globalClassNames.error}`)).toBeTruthy();
        });
    });

    describe('Styles', () => {
        it('Unchecked', () => {
            render(<UICheckbox />);

            // Create a test instance to access the styles method
            const testInstance = new UICheckboxTestHelper({});
            const messageInfo: InputValidationMessageInfo = {
                message: undefined,
                type: ErrorMessageType.Info,
                style: {}
            };
            const styles = testInstance.testSetStyle(messageInfo, {}) as ICheckboxStyles;
            const rootStyles = styles.root as IRawStyle;
            // Check hover opacity
            expect(rootStyles[0][0][`:hover .${globalClassNames.checkmark}`].opacity).toEqual(0);
        });

        it('Checked', () => {
            render(<UICheckbox checked />);

            // Create a test instance to access the styles method
            const testInstance = new UICheckboxTestHelper({ checked: true });
            const messageInfo: InputValidationMessageInfo = {
                message: undefined,
                type: ErrorMessageType.Info,
                style: {}
            };
            const styles = testInstance.testSetStyle(messageInfo, { checked: true }) as ICheckboxStyles;
            const rootStyles = styles.root as IRawStyle;
            // Check hover opacity
            expect(rootStyles[0][0][`:hover .${globalClassNames.checkmark}`]).toEqual(undefined);
        });

        it('Disabled', () => {
            render(<UICheckbox disabled />);

            // Create a test instance to access the styles method
            const testInstance = new UICheckboxTestHelper({ disabled: true });
            const messageInfo: InputValidationMessageInfo = {
                message: undefined,
                type: ErrorMessageType.Info,
                style: {}
            };
            const styles = testInstance.testSetStyle(messageInfo, { disabled: true }) as ICheckboxStyles;
            const textStyles = styles.text as IRawStyle;
            // Check text opacity
            expect(textStyles.opacity).toEqual(0.4);
            const checkBoxStyles = styles.checkbox as IRawStyle;
            // Check checkbox opacity
            expect(checkBoxStyles.opacity).toEqual(0.4);
        });

        it('Disabled and Checked', () => {
            render(<UICheckbox disabled checked />);

            // Create a test instance to access the styles method
            const testInstance = new UICheckboxTestHelper({ disabled: true, checked: true });
            const messageInfo: InputValidationMessageInfo = {
                message: undefined,
                type: ErrorMessageType.Info,
                style: {}
            };
            const styles = testInstance.testSetStyle(messageInfo, { disabled: true, checked: true }) as ICheckboxStyles;
            const rootStyles = styles.root as IRawStyle;
            // Check checkbox background
            expect(rootStyles[1][`:hover .${globalClassNames.checkbox}`].background).toEqual('');
            // Check checkbox borderColor
            expect(rootStyles[1][`:hover .${globalClassNames.checkbox}`].borderColor).toEqual('');
        });
    });
});
