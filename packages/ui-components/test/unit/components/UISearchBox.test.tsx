import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UISearchBox } from '../../../src/components/UISearchBox/UISearchBox';

describe('<UISearchBox />', () => {
    let renderResult: ReturnType<typeof render>;

    beforeEach(() => {
        renderResult = render(<UISearchBox />);
    });

    afterEach(() => {
        renderResult.unmount();
    });

    it('Existence', () => {
        const { container } = renderResult;
        // Check for any input element or search box specific class
        const input = container.querySelector('input') || container.querySelector('[role="searchbox"]');
        expect(input).toBeTruthy();
    });

    it('Test callbacks - onChange and onClear', async () => {
        const expectQuery = 'dummy';
        const onChange = jest.fn();
        const onClear = jest.fn();

        renderResult.rerender(<UISearchBox onChange={onChange} onClear={onClear} />);

        const { container } = renderResult;
        const input = container.querySelector('input') || container.querySelector('[role="searchbox"]');
        expect(input).toBeTruthy();

        // Test onChange
        await userEvent.type(input as HTMLElement, expectQuery);
        expect(onChange).toHaveBeenCalled();
        expect(onChange.mock.calls[onChange.mock.calls.length - 1][1]).toEqual(expectQuery);

        // Check reset
        onChange.mockClear();
        const resetButton = container.querySelector('button.ms-Button');
        expect(resetButton).toBeTruthy();

        await userEvent.click(resetButton as HTMLElement);
        expect(onChange).toBeCalledTimes(1);
        expect(onChange.mock.calls[0][1]).toEqual('');
        expect(onClear).toBeCalledTimes(1);
    });
});
