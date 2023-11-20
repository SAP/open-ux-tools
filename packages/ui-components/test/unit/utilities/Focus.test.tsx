import * as React from 'react';
import { render } from '@testing-library/react';
import * as FluentUI from '@fluentui/react';
import { focusToSibling } from '../../../src/utilities/Focus';

describe('focusToSibling', () => {
    let getNextElementSpy: jest.SpyInstance;
    let getPreviousElementSpy: jest.SpyInstance;
    let testElements: {
        first: HTMLElement;
        middle: HTMLElement;
        last: HTMLElement;
    };

    beforeEach(() => {
        getNextElementSpy = jest.spyOn(FluentUI, 'getNextElement');
        getPreviousElementSpy = jest.spyOn(FluentUI, 'getPreviousElement');
        render(
            <div>
                <div id="test1" tabIndex={0} />
                <div id="test2" tabIndex={0} />
                <div id="test3" tabIndex={0} />
            </div>
        );
        testElements = {
            first: document.getElementById('test1') as HTMLElement,
            middle: document.getElementById('test2') as HTMLElement,
            last: document.getElementById('test3') as HTMLElement
        };
    });

    test('Focus next from middle', () => {
        getNextElementSpy.mockReturnValue(testElements.last);
        getPreviousElementSpy.mockReturnValue(testElements.first);
        expect(focusToSibling(testElements.middle, true)).toEqual(testElements.last);
    });

    test('Focus previous from middle', () => {
        getNextElementSpy.mockReturnValue(testElements.last);
        getPreviousElementSpy.mockReturnValue(testElements.first);
        expect(focusToSibling(testElements.middle, false)).toEqual(testElements.first);
    });

    test('Focus next from last element', () => {
        getNextElementSpy.mockReturnValue(null);
        getPreviousElementSpy.mockReturnValue(testElements.middle);
        expect(focusToSibling(testElements.last, true)).toEqual(null);
    });

    test('Focus previous from first element', () => {
        getNextElementSpy.mockReturnValue(testElements.middle);
        getPreviousElementSpy.mockReturnValue(null);
        expect(focusToSibling(testElements.first, false)).toEqual(null);
    });
});
