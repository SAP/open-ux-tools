import { getElementsWithName } from '../../src/parser/element-getters';
import { XMLElement } from '@xml-tools/ast';

describe('edge cases', () => {
    test('getElementsWithName when no subelements', () => {
        const result = getElementsWithName('test', {
            type: 'XMLElement',
            name: 'Annotation',
            subElements: null
        } as unknown as XMLElement);
        expect(result.length).toBe(0);
    });
});
