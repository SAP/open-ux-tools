import * as React from 'react';
import { render } from '@testing-library/react';

const { getNextElement: mockGetNextElement, getPreviousElement: mockGetPreviousElement } = await (async () => {
    const actual = await import('@fluentui/react');
    const mocked = {
        ...actual,
        getNextElement: jest.fn(),
        getPreviousElement: jest.fn()
    };
    jest.unstable_mockModule('@fluentui/react', () => mocked);
    return mocked;
})();

const { focusToSibling } = await import('../../../src/utilities/Focus');

describe('focusToSibling', () => {
    let testElements: {
        first: HTMLElement;
        middle: HTMLElement;
        last: HTMLElement;
    };

    beforeEach(() => {
        jest.clearAllMocks();
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
        (mockGetNextElement as jest.Mock).mockReturnValue(testElements.last);
        (mockGetPreviousElement as jest.Mock).mockReturnValue(testElements.first);
        expect(focusToSibling(testElements.middle, true)).toEqual(testElements.last);
    });

    test('Focus previous from middle', () => {
        (mockGetNextElement as jest.Mock).mockReturnValue(testElements.last);
        (mockGetPreviousElement as jest.Mock).mockReturnValue(testElements.first);
        expect(focusToSibling(testElements.middle, false)).toEqual(testElements.first);
    });

    test('Focus next from last element', () => {
        (mockGetNextElement as jest.Mock).mockReturnValue(null);
        (mockGetPreviousElement as jest.Mock).mockReturnValue(testElements.middle);
        expect(focusToSibling(testElements.last, true)).toEqual(null);
    });

    test('Focus previous from first element', () => {
        (mockGetNextElement as jest.Mock).mockReturnValue(testElements.middle);
        (mockGetPreviousElement as jest.Mock).mockReturnValue(null);
        expect(focusToSibling(testElements.first, false)).toEqual(null);
    });
});
