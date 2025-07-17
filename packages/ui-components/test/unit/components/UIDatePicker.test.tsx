import * as React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
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
        cleanup();
    });

    it('Should render a UIDatePicker component', () => {
        const { container } = render(<UIDatePicker {...defaultProps} />);
        expect(container.querySelectorAll('.ui-DatePicker').length).toEqual(1);
        expect(container.querySelectorAll('input[type="datetime-local"]').length).toEqual(1);
    });

    it('Should render a UIDatePicker component, date only', () => {
        const { container } = render(<UIDatePicker {...defaultProps} dateOnly />);
        expect(container.querySelectorAll('.ui-DatePicker').length).toEqual(1);
        expect(container.querySelectorAll('input[type="date"]').length).toEqual(1);
    });

    it('onInputChange', () => {
        const { container } = render(<UIDatePicker {...defaultProps} dateOnly />);
        const input = container.querySelector('input[type="text"]');
        if (input) {
            fireEvent.change(input, { target: { value: '2022-08-22' } });
            expect(onChangeSpy).toBeCalledTimes(1);
            expect(onChangeSpy.mock.calls[0][1]).toBe('2022-08-22');
        }
    });

    it('onInputChange, undefined', () => {
        const { container } = render(<UIDatePicker {...defaultProps} dateOnly />);
        const input = container.querySelector('input[type="text"]');
        if (input) {
            fireEvent.change(input, { target: { value: '' } });
            expect(onChangeSpy).toBeCalledTimes(1);
            expect(onChangeSpy.mock.calls[0][1]).toBe('');
        }
    });

    it('onPickerChange', () => {
        const { container } = render(<UIDatePicker {...defaultProps} dateOnly />);
        const input = container.querySelector('input[type="date"]');
        if (input) {
            fireEvent.change(input, { target: { value: '2022-08-22' } });
            expect(onChangeSpy).toBeCalledTimes(1);
            expect(onChangeSpy.mock.calls[0][1]).toBe('2022-08-22');
        }
    });

    it('onPickerChange, datetime without seconds', () => {
        const { container } = render(<UIDatePicker {...defaultProps} />);
        const input = container.querySelector('input[type="datetime-local"]');
        if (input) {
            fireEvent.change(input, { target: { value: '2022-08-22T22:00' } });
            expect(onChangeSpy).toBeCalledTimes(1);
            expect(onChangeSpy.mock.calls[0][1]).toBe('2022-08-22T22:00:00');
        }
    });
});
