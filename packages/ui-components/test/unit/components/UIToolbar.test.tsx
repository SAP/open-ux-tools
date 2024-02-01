import { render } from '@testing-library/react';
import * as React from 'react';
import { UIToolbar, UIToolbarColumn } from '../../../src/components';

describe('<UIToolbar />', () => {
    const selectors = {
        toolbar: '.toolbar',
        column: '.ui-toolbar__column'
    };
    it('Render', () => {
        const { container } = render(
            <UIToolbar>
                <UIToolbarColumn>
                    <div>Left</div>
                </UIToolbarColumn>
                <UIToolbarColumn>
                    <div>Right</div>
                </UIToolbarColumn>
            </UIToolbar>
        );

        expect(container.querySelectorAll(selectors.toolbar).length).toEqual(1);
        expect(container.querySelectorAll(selectors.column).length).toEqual(2);
    });

    it('Render with custom attributes', () => {
        const testValue = 'test value';
        const { container } = render(
            <UIToolbar data-test={testValue}>
                <UIToolbarColumn data-test2={testValue}>
                    <div>Left</div>
                </UIToolbarColumn>
                <UIToolbarColumn>
                    <div>Right</div>
                </UIToolbarColumn>
            </UIToolbar>
        );

        expect(container.querySelector(`${selectors.toolbar} [data-test="test value"]`)).not.toEqual(null);
        expect(container.querySelector(`${selectors.column} [data-test2="test value"]`)).not.toEqual(null);
    });
});
