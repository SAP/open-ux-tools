import * as React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { UISearchBox } from '../../../src/components/UISearchBox/UISearchBox';

describe('<UISearchBox />', () => {
    it('Existence', () => {
        const { container } = render(<UISearchBox />);
        expect(container.querySelector('.ms-SearchBox')).not.toBeNull();
    });

    it('Test callbacks - onChange and onClear', () => {
        const expectQuery = 'dummy';
        const onChange = jest.fn();
        const onClear = jest.fn();

        const { container, rerender } = render(<UISearchBox />);

        rerender(<UISearchBox onChange={onChange} onClear={onClear} />);

        const input = container.querySelector('input') as HTMLInputElement;
        fireEvent.change(input, { target: { value: expectQuery } });
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][1]).toEqual(expectQuery);

        // Check reset
        onChange.mockClear();
        const resetButton = container.querySelector('button.ms-Button') as HTMLButtonElement;
        expect(resetButton).not.toBeNull();

        fireEvent.click(resetButton);
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][1]).toEqual('');
        expect(onClear).toHaveBeenCalledTimes(1);
    });
});
