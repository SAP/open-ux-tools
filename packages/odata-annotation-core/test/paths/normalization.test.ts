import { parsePath, toFullyQualifiedPath } from '../../src';

describe('path normalization', () => {
    const aliasMap: { [aliasOrNamespace: string]: string } = {
        MySchema: 'MyNamespace',
        testAlias2: 'testNamespace2',
        testAlias3: 'testNamespace3',
        Common: 'com.sap.vocabularies.Common.v1'
    };

    const testPath = (path: string) => {
        const parsedPath = parsePath(path);
        return toFullyQualifiedPath(aliasMap, 'MyNamespace', parsedPath);
    };

    test('nav prop annotation', () => {
        const result = testPath('MySchema.MyEntityType/MyNavigationProperty@Common.Label');
        expect(result).toStrictEqual(
            'MyNamespace.MyEntityType/MyNamespace.MyNavigationProperty@com.sap.vocabularies.Common.v1.Label'
        );
    });

    test('nav prop annotation with qualifier', () => {
        const result = testPath('MySchema.MyEntityType/MyNavigationProperty@Common.Label#q1');
        expect(result).toStrictEqual(
            'MyNamespace.MyEntityType/MyNamespace.MyNavigationProperty@com.sap.vocabularies.Common.v1.Label#q1'
        );
    });

    test('action', () => {
        const result = testPath('testAction(MySchema.MyEntityType)');
        expect(result).toStrictEqual('MyNamespace.testAction(MyNamespace.MyEntityType)');
    });

    test('action with unknown namespace', () => {
        const result = testPath('unknown.testAction(MySchema.MyEntityType)');
        expect(result).toStrictEqual('unknown.testAction(MyNamespace.MyEntityType)');
    });

    test('identifier alone', () => {
        const result = testPath('MyEntityType');
        expect(result).toStrictEqual('MyEntityType');
    });

    test('unknown namespace in identifier', () => {
        const result = testPath('unknown.MyEntityType');
        expect(result).toStrictEqual('unknown.MyEntityType');
    });

    test('term-cast', () => {
        const result = testPath('@Common.Label#q1');
        expect(result).toStrictEqual('@com.sap.vocabularies.Common.v1.Label#q1');
    });
});
