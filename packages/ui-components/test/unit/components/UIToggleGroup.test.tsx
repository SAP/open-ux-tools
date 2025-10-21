import * as React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { UIToggleGroup } from '../../../src/components/UIToggleGroup/index';
import type { UIToggleGroupProps } from '../../../src/components/UIToggleGroup/index';

describe('<UIToggleGroup />', () => {
    let toggleGroupProps: UIToggleGroupProps;
    let renderResult: ReturnType<typeof render>;
    let container: HTMLElement;

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

    afterEach(() => {
        if (renderResult) {
            renderResult.unmount();
        }
    });

    it('Should render a UIToggleGroup component', () => {
        const testProps = Object.assign({}, toggleGroupProps);
        renderResult = render(<UIToggleGroup {...testProps} />);
        container = renderResult.container;

        expect(container.querySelectorAll('div.ui-toggle-group').length).toEqual(1);
    });

    it('Should render a UIToggleGroup component with label', () => {
        const testProps = Object.assign({}, toggleGroupProps, {
            label: 'test'
        });
        renderResult = render(<UIToggleGroup {...testProps} />);
        container = renderResult.container;

        expect(container.querySelectorAll('label.ui-toggle-group-label').length).toEqual(1);
    });

    it('Should render a UIToggleGroup component with labelId', () => {
        const testProps = Object.assign({}, toggleGroupProps, {
            label: 'test',
            labelId: 'test1',
            ariaLabel: 'ariaTest'
        });
        renderResult = render(<UIToggleGroup {...testProps} />);
        container = renderResult.container;

        const toggleGroup = container.querySelector('div.ui-toggle-group');
        const label = container.querySelector('label.ui-toggle-group-label');
        expect(toggleGroup?.getAttribute('aria-labelledby')).toEqual('test1');
        expect(label?.getAttribute('id')).toEqual('test1');
        expect(label?.getAttribute('aria-label')).toEqual('ariaTest');
    });

    it('Should render a UIToggleGroup component - click options', () => {
        const onChange = jest.fn();
        const testProps = Object.assign({}, toggleGroupProps, {
            label: 'test',
            labelId: 'test1',
            ariaLabel: 'ariaTest',
            onChange
        });
        renderResult = render(<UIToggleGroup {...testProps} />);
        container = renderResult.container;

        const buttons = container.querySelectorAll('button');
        expect(buttons.length).toEqual(3);

        fireEvent.click(buttons[0]);
        expect(onChange).toHaveBeenCalledWith('high', true);
    });

    it('Should render a UIToggleGroup component - focus options', () => {
        const testProps = Object.assign({}, toggleGroupProps, {
            label: 'test',
            labelId: 'test1',
            ariaLabel: 'ariaTest',
            onChange: jest.fn()
        });
        renderResult = render(<UIToggleGroup {...testProps} />);
        container = renderResult.container;

        const buttons = container.querySelectorAll('button');

        // Focus should work without error - the component handles internal state
        expect(() => fireEvent.focus(buttons[0])).not.toThrow();
        // Verify the button has the focused class after focus
        expect(buttons[0].className).toContain('ui-toggle-group-option--focused');
    });

    it('Should render a UIToggleGroup component - blur options', () => {
        const testProps = Object.assign({}, toggleGroupProps, {
            label: 'test',
            labelId: 'test1',
            ariaLabel: 'ariaTest',
            onChange: jest.fn()
        });
        renderResult = render(<UIToggleGroup {...testProps} />);
        container = renderResult.container;

        const buttons = container.querySelectorAll('button');
        fireEvent.focus(buttons[0]);

        // Blur should work without error - the component handles internal state
        expect(() => fireEvent.blur(buttons[0])).not.toThrow();
        // After blur, no button should have the focused class
        expect(buttons[0].className).not.toContain('ui-toggle-group-option--focused');
    });
});
