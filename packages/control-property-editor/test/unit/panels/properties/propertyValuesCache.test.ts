import { getCachedValue, setCachedValue } from '../../../../src/panels/properties/propertyValuesCache';
import { InputType } from '../../../../src/panels/properties/types';

describe('propertyValuesCache', () => {
    test('read/write', () => {
        const controlId = 'testControlId';
        const propertyName = 'testPropName';

        setCachedValue(controlId, propertyName, InputType.expression, '{firstExpression}');

        let cachedValue = getCachedValue('controlId2', propertyName, InputType.enumMember);
        expect(cachedValue).toMatchInlineSnapshot(`null`);

        cachedValue = getCachedValue(controlId, 'propertyName2', InputType.enumMember);
        expect(cachedValue).toMatchInlineSnapshot(`null`);

        cachedValue = getCachedValue(controlId, propertyName, InputType.enumMember);
        expect(cachedValue).toMatchInlineSnapshot(`null`);

        cachedValue = getCachedValue(controlId, propertyName, InputType.expression);
        expect(cachedValue).toMatchInlineSnapshot(`"{firstExpression}"`);
    });
});
