jest.mock('mkdirp');
jest.mock('node-fetch');
jest.mock('fs');
jest.mock('prettier');

import * as Vocabularies from '../../src/tools/Vocabularies';

import path from 'path';
import mkdirp from 'mkdirp';
import fs from 'fs';
import fetch, { Response } from 'node-fetch';
import prettier from 'prettier';

const fWrapper = { fetch };

describe('vocabularies', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    it('getNamespaceAliasMapping', () => {
        // Arrange
        const vocabularies = {
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
        const object = {
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
        const vocabularies = {
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

        const fetchSpy = jest
            .spyOn(fWrapper, 'fetch')
            .mockImplementationOnce(async () => Promise.resolve(fakeResponse));

        // Act
        const result = await Vocabularies.getVocabulary('someUrl');

        // Assert
        expect(result).toBe('mockResponse');
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(fetchSpy).toHaveBeenCalledWith('someUrl');
    });

    it('updateVocabularies', async () => {
        // Arrange
        function getMockContent(namespace): any {
            const content = {};

            content[namespace] = {
                $alias: `alias_${namespace}`
            };

            return content;
        }

        const mockSupportedVocabularies = {
            namespaceA: {
                alias: 'alias_namespaceA',
                uri: 'uri_namespaceA'
            },
            namespaceB: {
                alias: 'alias_namespaceB',
                uri: 'uri_namespaceB'
            },
            namespaceC: {
                alias: 'alias_namespaceC',
                uri: 'uri_namespaceC',
                update: false
            }
        };
        const numberOfMockVocabularies: number = Object.keys(mockSupportedVocabularies).length;

        Object.defineProperty(Vocabularies, 'SUPPORTED_VOCABULARIES', {
            get: jest.fn(() => mockSupportedVocabularies)
        });

        const mkdirpSpy = jest.spyOn(mkdirp, 'sync');
        const fetchSpy = jest.spyOn(fWrapper, 'fetch');
        const prettierSpy = jest.spyOn(prettier, 'resolveConfig');
        const fsSpy = jest.spyOn(fs, 'writeFileSync');
        const consoleSpy = jest.spyOn(console, 'log');

        for (const namespace in Vocabularies.SUPPORTED_VOCABULARIES) {
            const mockContent = getMockContent(namespace);

            const fakeResponse: Response = new Response();
            fakeResponse.json = async (): Promise<unknown> => Promise.resolve(mockContent);

            // ToDo; isololate 'getVocabulary' instead of 'fetch'
            fetchSpy.mockImplementationOnce(async () => Promise.resolve(fakeResponse));
            (prettier.format as any).mockReturnValueOnce(`prettifiedJson_${namespace}`);
        }
        (prettier.resolveConfig as any).mockResolvedValue({});
        jest.spyOn(console, 'log').mockImplementation(() => undefined);

        try {
            // Act
            const vocabularies: any = await Vocabularies.updateVocabularies();

            // Assert

            // -- Check result
            expect(Object.keys(vocabularies).length).toEqual(numberOfMockVocabularies);
            let numberOfSkippedVocabularies = 0;
            for (const namespace in vocabularies) {
                const vocabulary = vocabularies[namespace];
                if (vocabulary.update === false) {
                    numberOfSkippedVocabularies++;
                    continue;
                }
                const mockContent = getMockContent(namespace);
                expect(vocabulary.alias).toEqual(mockContent[namespace].$alias);
                expect(vocabulary.content).toEqual(mockContent);
                expect(vocabulary.file).toEqual(`${path.join(Vocabularies.VOCABULARIES_LOCATION, namespace)}.ts`);
                expect(vocabulary.filePrettified).toEqual(`prettifiedJson_${namespace}`);
                expect(vocabulary.uri).toEqual(mockSupportedVocabularies[namespace].uri);
            }
            const numberOfNonSkippedVocabularies = numberOfMockVocabularies - numberOfSkippedVocabularies;

            // -- check function calls (data flow)
            expect(mkdirpSpy).toHaveBeenCalledTimes(1);
            expect(mkdirpSpy).toHaveBeenCalledWith(Vocabularies.VOCABULARIES_LOCATION);
            expect(fetchSpy).toHaveBeenCalledTimes(numberOfNonSkippedVocabularies);
            expect(prettierSpy).toHaveBeenCalledTimes(numberOfNonSkippedVocabularies);
            expect(fsSpy).toHaveBeenCalledTimes(numberOfNonSkippedVocabularies);
            expect(consoleSpy).toHaveBeenCalledTimes(numberOfNonSkippedVocabularies);

            Object.keys(vocabularies).forEach((namespace, idx) => {
                const vocabulary = vocabularies[namespace];
                if (vocabulary.update === false) {
                    return;
                }

                expect(fetchSpy.mock.calls[idx][0]).toBe(vocabulary.uri);
                expect(prettierSpy.mock.calls[idx][0]).toBe(vocabulary.file);
                expect(fsSpy.mock.calls[idx][0]).toBe(vocabulary.file);
                expect(fsSpy.mock.calls[idx][1]).toBe(vocabulary.filePrettified);
                expect(fsSpy.mock.calls[idx][2]).toBe('utf8');
                expect(consoleSpy.mock.calls[idx][0]).toBe(`Vocabulary file updated: ${namespace}`);
            });
        } catch (err) {
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
