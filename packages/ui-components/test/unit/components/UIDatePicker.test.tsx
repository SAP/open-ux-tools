import * as React from 'react';
import * as Enzyme from 'enzyme';
import { UIDatePicker } from '../../../src/components/UIDatePicker';

describe('<UIDatePicker />', () => {
    const onChangeSpy = jest.fn();
    const onKeyDownSpy = jest.fn();
    const onClickSpy = jest.fn();

    const defaultProps = {
        onChange: onChangeSpy,
        onKeyDown: onKeyDownSpy,
        onClick: onClickSpy
    };

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Should render a UIDatePicker component', () => {
        const wrapper = Enzyme.mount(<UIDatePicker {...defaultProps} />);
        expect(wrapper.find('.ui-DatePicker').length).toEqual(1);
        expect(wrapper.find('input[type="datetime-local"]').length).toEqual(1);
    });

    it('Should render a UIDatePicker component, date only', () => {
        const wrapper = Enzyme.mount(<UIDatePicker {...defaultProps} dateOnly />);
        expect(wrapper.find('.ui-DatePicker').length).toEqual(1);
        expect(wrapper.find('input[type="date"]').length).toEqual(1);
    });

    it('onInputChange', () => {
        const wrapper = Enzyme.mount(<UIDatePicker {...defaultProps} dateOnly />);
        wrapper.find('input[type="text"]').simulate('change', { target: { value: '2022-08-22' } });
        expect(onChangeSpy).toBeCalledTimes(1);
        expect(onChangeSpy.mock.calls[0][1]).toBe('2022-08-22');
    });

    it('onInputChange, undefined', () => {
        const wrapper = Enzyme.mount(<UIDatePicker {...defaultProps} dateOnly />);
        wrapper.instance()['onInputChange']({}, undefined);
        expect(onChangeSpy).toBeCalledTimes(1);
        expect(onChangeSpy.mock.calls[0][1]).toBe('');
    });

    it('onPickerChange', () => {
        const wrapper = Enzyme.mount(<UIDatePicker {...defaultProps} dateOnly />);
        wrapper.find('input[type="date"]').simulate('change', { target: { value: '2022-08-22' } });
        expect(onChangeSpy).toBeCalledTimes(1);
        expect(onChangeSpy.mock.calls[0][1]).toBe('2022-08-22');
    });

    it('onPickerChange, datetime without seconds', () => {
        const wrapper = Enzyme.mount(<UIDatePicker {...defaultProps} />);
        wrapper.find('input[type="datetime-local"]').simulate('change', { target: { value: '2022-08-22T22:00' } });
        expect(onChangeSpy).toBeCalledTimes(1);
        expect(onChangeSpy.mock.calls[0][1]).toBe('2022-08-22T22:00:00');
    });
});
