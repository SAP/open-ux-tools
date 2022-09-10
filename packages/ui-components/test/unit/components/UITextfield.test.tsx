import * as React from 'react';
import * as Enzyme from 'enzyme';
import type { IStyleFunction, ITextFieldStyleProps } from '@fluentui/react';
import { TextField } from '@fluentui/react';
import type { UITextInputProps } from '../../../src/components/UIInput';
import { UITextInput } from '../../../src/components/UIInput';

describe('<UIToggle />', () => {
    let wrapper: Enzyme.ReactWrapper<UITextInputProps>;

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
        const styles = (wrapper.find(TextField).props().styles as IStyleFunction<{}, {}>)({}) as ITextFieldStyleProps;
        expect(styles).toMatchSnapshot();
    });

    describe('Styles - error message', () => {
        it('Error', () => {
            wrapper.setProps({
                errorMessage: 'dummy'
            });
            const styles = (wrapper.find(TextField).props().styles as IStyleFunction<{}, {}>)(
                {}
            ) as ITextFieldStyleProps;
            expect(styles).toMatchSnapshot();
        });

        it('Warning', () => {
            wrapper.setProps({
                warningMessage: 'dummy'
            });
            const styles = (wrapper.find(TextField).props().styles as IStyleFunction<{}, {}>)(
                {}
            ) as ITextFieldStyleProps;
            expect(styles).toMatchSnapshot();
        });

        it('Info', () => {
            wrapper.setProps({
                infoMessage: 'dummy'
            });
            const styles = (wrapper.find(TextField).props().styles as IStyleFunction<{}, {}>)(
                {}
            ) as ITextFieldStyleProps;
            expect(styles).toMatchSnapshot();
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
