import { isHTMLElement } from '../../../src/utilities/Dom';

describe('isHTMLElement', () => {
    test('Test HTML Element', () => {
        const divElement = document.createElement('div');
        expect(isHTMLElement(divElement)).toBeTruthy();
    });

    test('Test XML Element(non HTML Element)', () => {
        const element = document.implementation.createDocument(null, 'dummy').firstChild as Element;
        expect(isHTMLElement(element)).toBeFalsy();
    });
});
