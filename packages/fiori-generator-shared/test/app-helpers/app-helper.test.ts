import { getFlpId, getSemanticObject } from '../../src/app-helpers/app-helpers';

describe('app-helper tests', () => {
    test('should return flp id', () => {
        const flpId = getFlpId('a.b.c.testApp', 'display');
        expect(flpId).toBe('abctestApp-display');
    });

    test('should return semantic object', () => {
        const semObj = getSemanticObject('a.b.c.#testApp_#');
        expect(semObj).toBe('abctestApp');
    });

    test('should return correct length for semantic object', () => {
        const s = 'a.b.c.#testApp_#'.repeat(10);
        const semObj = getSemanticObject(s);
        expect(semObj.length).toBe(30);
    });
});
