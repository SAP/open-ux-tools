import { render } from '@testing-library/react';
import * as React from 'react';
import { UIToolbar, UIToolbarColumn } from '../../../src/components';
import { mockResizeObserver } from '../../utils/utils';

mockResizeObserver();

describe('<UIToolbar />', () => {
    const selectors = {
        toolbar: '.ui-toolbar',
        column: '.ui-toolbar__column'
    };
    it('Render', () => {
        render(
            <UIToolbar>
                <UIToolbarColumn>
                    <div>Left</div>
                </UIToolbarColumn>
                <UIToolbarColumn>
                    <div>Right</div>
                </UIToolbarColumn>
            </UIToolbar>
        );

        expect(document.querySelectorAll(selectors.toolbar).length).toEqual(1);
        expect(document.querySelectorAll(selectors.column).length).toEqual(2);
    });

    it('Render with custom attributes', () => {
        const testValue = 'test value';
        render(
            <UIToolbar data-test={testValue}>
                <UIToolbarColumn data-test2={testValue}>
                    <div>Left</div>
                </UIToolbarColumn>
                <UIToolbarColumn>
                    <div>Right</div>
                </UIToolbarColumn>
            </UIToolbar>
        );

        expect(document.querySelector(`${selectors.toolbar}[data-test="test value"]`)).not.toEqual(null);
        expect(document.querySelector(`${selectors.column}[data-test2="test value"]`)).not.toEqual(null);
    });
});
