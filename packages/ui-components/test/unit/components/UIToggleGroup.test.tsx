import * as React from 'react';
import { render, fireEvent } from '@testing-library/react';

import { UIToggleGroup } from '../../../src/components/UIToggleGroup/index';
import type { UIToggleGroupProps } from '../../../src/components/UIToggleGroup/index';

describe('<UIToggleGroup />', () => {
    let toggleGroupProps: UIToggleGroupProps;

    beforeEach(() => {
        toggleGroupProps = Object.freeze({
            options: [
                {
                    key: 'high',
                    text: 'H',
                    ariaLabel: 'High'
                },
                {
                    key: 'medium',
                    text: 'M',
                    ariaLabel: 'Medium'
                },
                {
                    key: 'low',
                    text: 'L',
                    ariaLabel: 'Low'
                }
            ]
        });
    });

    it('Should render a UIToggleGroup component', () => {
        const { container } = render(<UIToggleGroup {...toggleGroupProps} />);
        expect(container.querySelector('div.ui-toggle-group')).not.toBeNull();
    });

    it('Should render a UIToggleGroup component with label', () => {
        const testProps = { ...toggleGroupProps, label: 'test' };
        const { container } = render(<UIToggleGroup {...testProps} />);
        expect(container.querySelector('label.ui-toggle-group-label')).not.toBeNull();
    });

    it('Should render a UIToggleGroup component with labelId', () => {
        const testProps = { ...toggleGroupProps, label: 'test', labelId: 'test1', ariaLabel: 'ariaTest' };
        const { container } = render(<UIToggleGroup {...testProps} />);

        const group = container.querySelector('div.ui-toggle-group') as HTMLElement;
        expect(group.getAttribute('aria-labelledby')).toEqual('test1');

        const label = container.querySelector('label.ui-toggle-group-label') as HTMLElement;
        expect(label.getAttribute('id')).toEqual('test1');
        expect(label.getAttribute('aria-label')).toEqual('ariaTest');
    });

    it('Should render a UIToggleGroup component - click options', () => {
        const onChange = jest.fn();
        const testProps = { ...toggleGroupProps, label: 'test', labelId: 'test1', ariaLabel: 'ariaTest', onChange };
        const { container } = render(<UIToggleGroup {...testProps} />);

        const buttons = container.querySelectorAll('button');
        expect(buttons).toHaveLength(3);

        fireEvent.click(buttons[0]);
        expect(onChange).toHaveBeenCalledWith('high', true);
    });

    it('Should render a UIToggleGroup component - focus options', () => {
        const testProps = {
            ...toggleGroupProps,
            label: 'test',
            labelId: 'test1',
            ariaLabel: 'ariaTest',
            onChange: jest.fn()
        };
        const { container } = render(<UIToggleGroup {...testProps} />);

        const buttons = container.querySelectorAll('button');
        fireEvent.focus(buttons[0]);

        expect(buttons[0].classList.contains('ui-toggle-group-option--focused')).toBe(true);
    });

    it('Should render a UIToggleGroup component - blur options', () => {
        const testProps = {
            ...toggleGroupProps,
            label: 'test',
            labelId: 'test1',
            ariaLabel: 'ariaTest',
            onChange: jest.fn()
        };
        const { container } = render(<UIToggleGroup {...testProps} />);

        const buttons = container.querySelectorAll('button');
        // Focus a button first so the focused class is applied, then blur it
        fireEvent.focus(buttons[0]);
        expect(buttons[0].classList.contains('ui-toggle-group-option--focused')).toBe(true);

        fireEvent.blur(buttons[0]);
        expect(buttons[0].classList.contains('ui-toggle-group-option--focused')).toBe(false);
    });
});
