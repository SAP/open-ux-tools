jest.mock('axios');
jest.mock('fs/promises');
jest.mock('prettier');

import * as Vocabularies from '../../tools/update';

import { join } from 'node:path';
import fs from 'fs/promises';
import axios from 'axios';
import prettier from 'prettier';
import type { CSDL, CSDLAnnotations } from '@sap-ux/vocabularies/CSDL';

describe('vocabularies', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    it('getNamespaceAliasMapping', () => {
        // Arrange
        const vocabularies: CSDL = {
            $Version: '4.0',
            $Reference: {
                'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Core.V1.json': {
                    $Include: [
                        {
                            $Namespace: 'Org.OData.Core.V1',
                            $Alias: 'Core'
                        }
                    ]
                }
            },
            'Org.OData.Aggregation.V1': {
                $Alias: 'Aggregation',
                '@Core.Description': 'Terms to describe which data in a given entity model can be aggregated, and how.'
            }
        };
        const expectedResult = {
            Edm: 'Edm',
            odata: 'odata',
            Core: 'Org.OData.Core.V1',
            Aggregation: 'Org.OData.Aggregation.V1'
        };

        // Act
        const result = Vocabularies.getNamespaceAliasMapping(vocabularies);

        // Assert
        expect(result).toEqual(expectedResult);
    });

    it('getFullyQualifiedName - Term with Alias', () => {
        // Arrange
        const namespaceAliasMapping = {
            Edm: 'Edm',
            odata: 'odata',
            Core: 'Org.OData.Core.V1',
            Aggregation: 'Org.OData.Aggregation.V1'
        };

        // Act
        const result = Vocabularies.getFullyQualifiedName('Core.Description', namespaceAliasMapping);

        // Assert
        expect(result).toEqual('Org.OData.Core.V1.Description');
    });

    it('getFullyQualifiedName - Term with full namespace', () => {
        // Arrange
        const namespaceAliasMapping = {
            Edm: 'Edm',
            odata: 'odata',
            Core: 'Org.OData.Core.V1',
            Aggregation: 'Org.OData.Aggregation.V1'
        };

        // Act
        const result = Vocabularies.getFullyQualifiedName('Org.OData.Core.V1.Description', namespaceAliasMapping);

        // Assert
        expect(result).toEqual('Org.OData.Core.V1.Description');
    });

    it('renameKey', () => {
        // Arrange
        const object = {
            '@Core.Description': 'Terms to describe which data in a given entity model can be aggregated, and how.'
        };
        const expectedObject = {
            '@Org.OData.Core.V1.Description':
                'Terms to describe which data in a given entity model can be aggregated, and how.'
        };

        // Act
        const result = Vocabularies.renameKey(object, '@Core.Description', '@Org.OData.Core.V1.Description');

        // Assert
        expect(result).toEqual(expectedObject);
    });

    it('uglifyAnnotations', () => {
        // Arrange
        const object: CSDLAnnotations = {
            'Aggregation.CustomAggregate': {
                '@Validation.ApplicableTerms@Core.Description':
                    'Adding a list of other terms that can be annotated to it.',
                '@Validation.ApplicableTerms': ['Common.Label']
            }
        };
        const namespaceAliasMapping = {
            Edm: 'Edm',
            odata: 'odata',
            Core: 'Org.OData.Core.V1',
            Aggregation: 'Org.OData.Aggregation.V1',
            Validation: 'Org.OData.Validation.V1',
            Common: 'com.sap.vocabularies.Common.v1',
            Analytics: 'com.sap.vocabularies.Analytics.v1'
        };
        const expectedOutput = {
            'Org.OData.Aggregation.V1.CustomAggregate': {
                '@Validation.ApplicableTerms@Core.Description':
                    'Adding a list of other terms that can be annotated to it.',
                '@Validation.ApplicableTerms': ['Common.Label']
            }
        };

        // Act
        const result = Vocabularies.uglifyAnnotations(object, namespaceAliasMapping);

        // Assert
        expect(result).toEqual(expectedOutput);
    });

    it('uglify', () => {
        // Arrange
        const vocabularies: CSDL = {
            $Version: '4.0',
            $Reference: {
                'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Core.V1.json': {
                    $Include: [
                        {
                            $Namespace: 'Org.OData.Core.V1',
                            $Alias: 'Core'
                        }
                    ]
                }
            },
            'Org.OData.Aggregation.V1': {
                $Alias: 'Aggregation',
                '@Core.Description': 'Terms to describe which data in a given entity model can be aggregated, and how.'
            }
        };

        const expectedResult = {
            $Version: '4.0',
            $Reference: {
                'https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Core.V1.json': {
                    $Include: [
                        {
                            $Namespace: 'Org.OData.Core.V1',
                            $Alias: 'Core'
                        }
                    ]
                }
            },
            'Org.OData.Aggregation.V1': {
                $Alias: 'Aggregation',
                '@Org.OData.Core.V1.Description':
                    'Terms to describe which data in a given entity model can be aggregated, and how.'
            }
        };

        // Act
        const result = Vocabularies.uglify(vocabularies);

        // Assert
        expect(result).toEqual(expectedResult);
    });

    it('getVocabulary', async () => {
        // Arrange
        const fakeResponse: Response = new Response();
        fakeResponse.json = async (): Promise<unknown> => Promise.resolve('mockResponse');

        const axiosSpy = jest
            .spyOn(axios, 'get')
            .mockImplementationOnce(async () => Promise.resolve({ data: 'vocabularyData' }));

        // Act
        const result = await Vocabularies.getVocabulary('someUrl');

        // Assert
        expect(result).toBe('vocabularyData');
        expect(axiosSpy).toHaveBeenCalledTimes(1);
        expect(axiosSpy).toHaveBeenCalledWith('someUrl', { 'responseType': 'json' });
    });

    it('updateVocabularies', async () => {
        // Arrange
        function getMockContent(namespace: string): any {
            const content = {
                namespace: {
                    $alias: `alias_${namespace}`
                }
            };

            return content;
        }

        const mockSupportedVocabularies: Vocabularies.SupportedVocabularies = {
            namespaceA: {
                uri: 'uri_namespaceA'
            },
            namespaceB: {
                uri: 'uri_namespaceB'
            },
            namespaceC: {
                uri: 'uri_namespaceC',
                update: false
            }
        };
        const numberOfMockVocabularies: number = Object.keys(mockSupportedVocabularies).length;

        Object.defineProperty(Vocabularies, 'SUPPORTED_VOCABULARIES', {
            get: jest.fn(() => mockSupportedVocabularies)
        });

        const axiosSpy = jest.spyOn(axios, 'get');
        const prettierSpy = jest.spyOn(prettier, 'resolveConfig');
        const consoleSpy = jest.spyOn(console, 'log');

        for (const namespace in Vocabularies.SUPPORTED_VOCABULARIES) {
            const mockContent = getMockContent(namespace);

            axiosSpy.mockImplementationOnce(async () => Promise.resolve({ data: mockContent }));
            jest.spyOn(prettier, 'format').mockReturnValueOnce(`prettifiedJson_${namespace}`);
        }
        jest.spyOn(prettier, 'resolveConfig').mockResolvedValue({});
        jest.spyOn(console, 'log').mockImplementation(() => undefined);

        try {
            // Act
            await Vocabularies.updateVocabularies();

            // Assert

            // -- Check result
            const numberOfSkippedVocabularies = 1;
            const numberOfNonSkippedVocabularies = numberOfMockVocabularies - numberOfSkippedVocabularies;

            // -- check function calls (data flow)
            expect(fs.mkdir).toHaveBeenCalledTimes(1);
            expect(fs.mkdir).toHaveBeenCalledWith(Vocabularies.VOCABULARIES_LOCATION);
            expect(axiosSpy).toHaveBeenCalledTimes(numberOfNonSkippedVocabularies);
            expect(prettierSpy).toHaveBeenCalledTimes(numberOfNonSkippedVocabularies);
            expect(fs.writeFile).toHaveBeenCalledTimes(numberOfNonSkippedVocabularies);
            expect(consoleSpy).toHaveBeenCalledTimes(numberOfNonSkippedVocabularies);

            Object.keys(mockSupportedVocabularies).forEach((namespace, index) => {
                const vocabulary = mockSupportedVocabularies[namespace];
                const callNumber = index + 1;
                if (vocabulary.update === false) {
                    return;
                }
                const path = `${join(Vocabularies.VOCABULARIES_LOCATION, namespace)}.ts`;
                expect(axiosSpy).toHaveBeenNthCalledWith(callNumber, vocabulary.uri, { 'responseType': 'json' });
                expect(prettierSpy).toHaveBeenNthCalledWith(callNumber, path);
                expect(fs.writeFile).toHaveBeenNthCalledWith(callNumber, path, `prettifiedJson_${namespace}`, 'utf8');
                expect(consoleSpy).toHaveBeenNthCalledWith(callNumber, `Vocabulary file updated: ${namespace}`);
            });
        } catch (err) {
            console.log(err);
            expect(false).toBeTruthy();
        }
    });

    describe('convertKey', () => {
        let namespaceAliasMapping: any;

        beforeEach(() => {
            namespaceAliasMapping = {
                alias0: 'namespace0',
                alias1: 'namespace1'
            };
        });

        it('@alias1.myTerm', () => {
            // Act/Assert
            expect(Vocabularies.convertKey('@alias1.myTerm', namespaceAliasMapping)).toEqual('@namespace1.myTerm');
        });

        it('@alias1.myTerm1@alias0.myTerm0', () => {
            // Act/Assert
            expect(Vocabularies.convertKey('@alias1.myTerm1@alias0.myTerm0', namespaceAliasMapping)).toEqual(
                '@namespace1.myTerm1@namespace0.myTerm0'
            );
        });

        it('prop@alias1.myTerm', () => {
            // Act/Assert
            expect(Vocabularies.convertKey('prop@alias1.myTerm', namespaceAliasMapping)).toEqual(
                'prop@namespace1.myTerm'
            );
        });
    });

    describe('convertValue', () => {
        let namespaceAliasMapping: any;

        beforeEach(() => {
            namespaceAliasMapping = {
                alias0: 'namespace0',
                alias1: 'namespace1',
                Hierarchy: 'com.sap.vocabularies.Hierarchy.v1'
            };
        });

        it('string value', () => {
            expect(Vocabularies.convertValue('alias1.myTermSomeOtherText', namespaceAliasMapping)).toEqual(
                'namespace1.myTermSomeOtherText'
            );
        });

        it('string value with namespace', () => {
            expect(Vocabularies.convertValue('Hierarchy.Level', namespaceAliasMapping)).toEqual(
                'com.sap.vocabularies.Hierarchy.v1.Level'
            );
            expect(Vocabularies.convertValue('com.sap.vocabularies.Hierarchy.v1.Level', namespaceAliasMapping)).toEqual(
                'com.sap.vocabularies.Hierarchy.v1.Level'
            );
        });

        it('array value', () => {
            expect(Vocabularies.convertValue(['alias1.myTerm1', 'alias0.myTerm0'], namespaceAliasMapping)).toEqual([
                'namespace1.myTerm1',
                'namespace0.myTerm0'
            ]);
        });
    });
});
