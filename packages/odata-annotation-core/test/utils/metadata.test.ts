import type {
    IMetadataService,
    MetadataElement,
    ODataVersionType,
    Namespace,
    Reference
} from '@sap-ux/odata-annotation-core-types';
import { MetadataService } from '@sap-ux/odata-entity-model';
import { getAliasInformation, getPathBaseMetadataElement, getSegmentWithoutAlias } from '../../src';

const ODataVersion: ODataVersionType = '2.0';
const metadataFileUri = 'testFileUri';
const metadataElements: MetadataElement[] = [
    {
        isAnnotatable: true,
        kind: 'EntityType',
        name: 'com.sap.gateway.default.iwbep.tea_busi.v0001.Department',
        path: 'com.sap.gateway.default.iwbep.tea_busi.v0001.Department',
        isCollectionValued: false,
        isComplexType: false,
        isEntityType: true,
        targetKinds: ['EntityType'],
        content: [
            {
                content: [],
                isAnnotatable: true,
                kind: 'Property',
                name: 'Sector',
                path: 'com.sap.gateway.default.iwbep.tea_busi.v0001.Department/Sector',
                isCollectionValued: false,
                isComplexType: false,
                isEntityType: false,
                edmPrimitiveType: 'Edm.String',
                targetKinds: ['Property']
            }
        ]
    },
    {
        isAnnotatable: true,
        kind: 'EntityType',
        path: 'com.sap.gateway.default.iwbep.tea_busi.v0001.Worker',
        name: 'com.sap.gateway.default.iwbep.tea_busi.v0001.Worker',
        isCollectionValued: false,
        isComplexType: false,
        isEntityType: true,
        targetKinds: ['EntityType'],
        content: [
            {
                content: [],
                isAnnotatable: true,
                kind: 'Property',
                name: 'Name',
                path: 'com.sap.gateway.default.iwbep.tea_busi.v0001.Worker/Name',
                isCollectionValued: false,
                isComplexType: false,
                isEntityType: false,
                edmPrimitiveType: 'Edm.String',
                targetKinds: ['Property']
            },
            {
                content: [],
                isAnnotatable: true,
                kind: 'NavigationProperty',
                name: 'to_Department',
                path: 'com.sap.gateway.default.iwbep.tea_busi.v0001.Worker/to_Department',
                isCollectionValued: false,
                isComplexType: false,
                isEntityType: false,
                structuredType: 'com.sap.gateway.default.iwbep.tea_busi.v0001.Department',
                targetKinds: ['NavigationProperty']
            }
        ]
    },
    {
        isAnnotatable: true,
        kind: 'Action',
        name: 'com.sap.gateway.default.iwbep.tea_busi.v0001.SetDepartment',
        path: 'com.sap.gateway.default.iwbep.tea_busi.v0001.SetDepartment',
        isCollectionValued: false,
        isComplexType: false,
        isEntityType: false,
        targetKinds: ['Action'],
        content: [
            {
                content: [],
                isAnnotatable: true,
                kind: 'Parameter',
                name: 'ID',
                path: 'com.sap.gateway.default.iwbep.tea_busi.v0001.SetDepartment/ID',
                isCollectionValued: false,
                isComplexType: false,
                isEntityType: false,
                edmPrimitiveType: 'Edm.String',
                targetKinds: ['Property']
            }
        ]
    },
    {
        isAnnotatable: true,
        kind: 'EntityContainer',
        name: 'TestNamespace.EntityContainer',
        path: 'TestNamespace.EntityContainer',
        targetKinds: ['EntityContainer'],
        content: [
            {
                isAnnotatable: true,
                kind: 'EntitySet',
                name: 'Currencies',
                path: 'TestNamespace.EntityContainer/Currencies',
                structuredType: 'TestNamespace.Currencies',
                targetKinds: ['EntitySet'],
                content: [
                    {
                        path: 'TestNamespace.EntityContainer/Currencies/code',
                        isAnnotatable: true,
                        kind: 'Property',
                        name: 'code',
                        content: [],
                        targetKinds: ['Property']
                    },
                    {
                        path: 'TestNamespace.EntityContainer/Currencies/name',
                        isAnnotatable: true,
                        kind: 'Property',
                        name: 'name',
                        content: [],
                        targetKinds: ['Property']
                    }
                ]
            },
            {
                isAnnotatable: true,
                kind: 'EntitySet',
                name: 'Countries',
                path: 'TestNamespace.EntityContainer/Countries',
                structuredType: 'TestNamespace.Countries',
                targetKinds: ['EntitySet'],
                content: [
                    {
                        path: 'TestNamespace.EntityContainer/Countries/code',
                        isAnnotatable: true,
                        kind: 'Property',
                        name: 'code',
                        content: [],
                        targetKinds: ['Property']
                    },
                    {
                        path: 'TestNamespace.EntityContainer/Countries/name',
                        isAnnotatable: true,
                        kind: 'Property',
                        name: 'name',
                        content: [],
                        targetKinds: ['Property']
                    }
                ]
            }
        ]
    },
    {
        isAnnotatable: true,
        kind: 'EntityType',
        name: 'TestNamespace.Currencies',
        path: 'TestNamespace.Currencies',
        isCollectionValued: true,
        isComplexType: false,
        isEntityType: true,
        targetKinds: ['EntityType'],
        content: [
            {
                isAnnotatable: true,
                kind: 'Property',
                name: 'code',
                path: 'TestNamespace.Currencies/code',
                edmPrimitiveType: 'Edm.String',
                content: [],
                targetKinds: ['Property']
            },
            {
                isAnnotatable: true,
                kind: 'Property',
                name: 'name',
                path: 'TestNamespace.Currencies/name',
                edmPrimitiveType: 'Edm.String',
                content: [],
                targetKinds: ['Property']
            }
        ]
    },
    {
        isAnnotatable: true,
        kind: 'EntityType',
        name: 'TestNamespace.Countries',
        path: 'TestNamespace.Countries',
        isCollectionValued: true,
        isComplexType: false,
        isEntityType: true,
        targetKinds: ['EntityType'],
        content: [
            {
                isAnnotatable: true,
                kind: 'Property',
                name: 'code',
                path: 'TestNamespace.Countries/code',
                edmPrimitiveType: 'Edm.Int16',
                content: [],
                targetKinds: ['Property']
            },
            {
                isAnnotatable: true,
                kind: 'Property',
                name: 'descr',
                path: 'TestNamespace.Countries/descr',
                edmPrimitiveType: 'Edm.String',
                content: [],
                targetKinds: ['Property']
            },
            {
                isAnnotatable: true,
                kind: 'Property',
                name: 'createdAt',
                path: 'TestNamespace.Countries/createdAt',
                edmPrimitiveType: 'Edm.DateTimeOffset',
                content: [],
                targetKinds: ['Property']
            }
        ]
    }
];
const namespace: Namespace = {
    type: 'namespace',
    name: 'test'
};
const references: Reference[] = [
    {
        type: 'reference',
        name: 'com.sap.vocabularies.Common.v1',
        alias: 'Common'
    },
    {
        type: 'reference',
        name: 'com.sap.vocabularies.UI.v1',
        alias: 'UI'
    },
    {
        type: 'reference',
        name: 'com.sap.vocabularies.Communication.v1',
        alias: 'Communication'
    },
    {
        type: 'reference',
        name: 'com.sap.gateway.default.iwbep.tea_busi.v0001',
        alias: 'tea_busi'
    }
];
const metadataNamespaces = new Set<string>().add('metadataNs');
const aliasInfo = getAliasInformation([namespace, ...references], metadataNamespaces);

describe('getPathBaseMetadataElement', () => {
    let metadata: IMetadataService;
    beforeEach(() => {
        metadata = new MetadataService({ ODataVersion });
        metadata.import(metadataElements, metadataFileUri);
    });

    test('entity type', () => {
        // arrange
        const targetPath = 'com.sap.gateway.default.iwbep.tea_busi.v0001.Department';
        // act
        const pathBaseElement = getPathBaseMetadataElement(metadata, targetPath, aliasInfo);
        // expect
        expect(pathBaseElement?.name).toBe('com.sap.gateway.default.iwbep.tea_busi.v0001.Department');
    });
    test('property with primitive type', () => {
        // arrange
        const targetPath = 'com.sap.gateway.default.iwbep.tea_busi.v0001.Department/Sector';
        // act
        const pathBaseElement = getPathBaseMetadataElement(metadata, targetPath, aliasInfo);
        // expect
        expect(pathBaseElement?.name).toBe('com.sap.gateway.default.iwbep.tea_busi.v0001.Department');
    });
    test('navigation to other entity type', () => {
        // arrange
        const targetPath = 'com.sap.gateway.default.iwbep.tea_busi.v0001.Worker/to_Department/Sector';
        // act
        const pathBaseElement = getPathBaseMetadataElement(metadata, targetPath, aliasInfo);
        // expect
        expect(pathBaseElement?.name).toBe('com.sap.gateway.default.iwbep.tea_busi.v0001.Worker');
    });
    test('action parameter', () => {
        // arrange
        const targetPath = 'com.sap.gateway.default.iwbep.tea_busi.v0001.SetDepartment/ID';
        // act
        const pathBaseElement = getPathBaseMetadataElement(metadata, targetPath, aliasInfo);
        // expect
        expect(pathBaseElement?.name).toBe('com.sap.gateway.default.iwbep.tea_busi.v0001.SetDepartment');
    });
});

describe('getSegmentWithoutAlias', () => {
    test('vocabulary', () => {
        // arrange
        const segment = '@Common.Text';
        // act
        const result = getSegmentWithoutAlias(aliasInfo, segment);
        // expect
        expect(result).toMatchInlineSnapshot(`"@com.sap.vocabularies.Common.v1.Text"`);
    });

    test('entity type segment', () => {
        // arrange
        const segment = 'tea_busi.Department';
        // act
        const result = getSegmentWithoutAlias(aliasInfo, segment);
        // expect
        expect(result).toMatchInlineSnapshot(`"com.sap.gateway.default.iwbep.tea_busi.v0001.Department"`);
    });
});
