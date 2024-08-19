import type { Namespace, Reference } from '@sap-ux/odata-annotation-core-types';
import { getAliasInformation, getAllNamespacesAndReferences } from '../../src';

describe('names/namespaces.ts', () => {
    test('getAliasInformation', () => {
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
                name: 'SEPMRA_PROD_MAN',
                alias: 'SEPMRA_PROD_MAN'
            }
        ];
        const metadataNamespaces = new Set<string>().add('test');
        const result = getAliasInformation([namespace, ...references], metadataNamespaces);
        expect(result).toMatchSnapshot();
    });
});

describe('names/namespaces.ts', () => {
    test('getAllNamespacesAndReferences', () => {
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
                name: 'SEPMRA_PROD_MAN',
                alias: 'SEPMRA_PROD_MAN'
            }
        ];
        const result = getAllNamespacesAndReferences(namespace, references);
        expect(result).toMatchSnapshot();
    });
});
