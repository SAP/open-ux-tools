import * as React from 'react';
import * as Enzyme from 'enzyme';
import type { IStyleFunction, ITextFieldStyleProps } from '@fluentui/react';
import { TextField } from '@fluentui/react';
import type { UITextInputProps } from '../../../src/components/UIInput';
import { UITextInput } from '../../../src/components/UIInput';

describe('<UIToggle />', () => {
    let wrapper: Enzyme.ReactWrapper<UITextInputProps>;

    const getStyles = (): ITextFieldStyleProps => {
        const textfieldProps = wrapper.find(TextField).props();
        const styles = (textfieldProps.styles as IStyleFunction<{}, {}>)(textfieldProps) as ITextFieldStyleProps;
        return styles;
    };

    beforeEach(() => {
        wrapper = Enzyme.mount(<UITextInput />);
    });

    afterEach(() => {
        wrapper.unmount();
    });

    it('Should render a UITextInput component', () => {
        expect(wrapper.find('.ms-TextField').length).toEqual(1);
    });

    it('Styles - default', () => {
        expect(getStyles()).toMatchSnapshot();
    });

    const testCases = [
        // Single line
        {
            multiline: false,
            disabled: undefined,
            readOnly: undefined
        },
        {
            multiline: false,
            disabled: true,
            readOnly: undefined
        },
        {
            multiline: false,
            disabled: undefined,
            readOnly: true
        },
        // Multi line
        {
            multiline: true,
            disabled: undefined,
            readOnly: undefined
        },
        {
            multiline: true,
            disabled: true,
            readOnly: undefined
        },
        {
            multiline: true,
            disabled: undefined,
            readOnly: true
        }
    ];
    for (const testCase of testCases) {
        it(`Styles - multiline=${testCase.multiline}, disabled=${testCase.disabled}, readOnly=${testCase.readOnly}`, () => {
            wrapper.setProps({
                multiline: testCase.multiline,
                disabled: testCase.disabled,
                readOnly: testCase.readOnly
            });
            expect(getStyles()).toMatchSnapshot();
        });
    }

    it('Readonly input field with value', () => {
        wrapper.setProps({
            readOnly: true,
            value: 'test'
        });
        expect(getStyles()).toMatchSnapshot();
    });

    describe('Styles - error message', () => {
        it('Error', () => {
            wrapper.setProps({
                errorMessage: 'dummy'
            });
            expect(getStyles()).toMatchSnapshot();
        });

        it('Warning', () => {
            wrapper.setProps({
                warningMessage: 'dummy'
            });
            expect(getStyles()).toMatchSnapshot();
        });

        it('Info', () => {
            wrapper.setProps({
                infoMessage: 'dummy'
            });
            expect(getStyles()).toMatchSnapshot();
        });

        it('Error - custom component', async () => {
            wrapper.setProps({
                errorMessage: <div className="dummyError">TEST</div>
            });
            wrapper.update();
            await new Promise((resolve) => setTimeout(resolve, 100));
            const element = wrapper.getDOMNode();
            expect(element.querySelectorAll('.dummyError').length).toEqual(1);
        });
    });
});
