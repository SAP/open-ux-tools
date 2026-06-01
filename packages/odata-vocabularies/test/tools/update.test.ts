import { jest } from '@jest/globals';
import type { CSDL, CSDLAnnotations } from '@sap-ux/vocabularies/CSDL';
import type * as VocabulariesType from '../../tools/update';

const mockAxiosGet = jest.fn();
jest.unstable_mockModule('axios', () => ({
    default: { get: mockAxiosGet },
    __esModule: true
}));

const mockMkdir = jest.fn();
const mockWriteFile = jest.fn();
jest.unstable_mockModule('fs/promises', () => ({
    default: { mkdir: mockMkdir, writeFile: mockWriteFile },
    mkdir: mockMkdir,
    writeFile: mockWriteFile,
    __esModule: true
}));

const mockFormat = jest.fn();
const mockResolveConfig = jest.fn();
jest.unstable_mockModule('prettier', () => ({
    default: { format: mockFormat, resolveConfig: mockResolveConfig },
    format: mockFormat,
    resolveConfig: mockResolveConfig,
    __esModule: true
}));

const Vocabularies = await import('../../tools/update');
const { join } = await import('node:path');

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
        mockAxiosGet.mockResolvedValueOnce({ data: 'vocabularyData' });

        // Act
        const result = await Vocabularies.getVocabulary('someUrl');

        // Assert
        expect(result).toBe('vocabularyData');
        expect(mockAxiosGet).toHaveBeenCalledTimes(1);
        expect(mockAxiosGet).toHaveBeenCalledWith('someUrl', { 'responseType': 'json' });
    });

    it('updateVocabularies', async () => {
        // Arrange
        function getMockContent(namespace: string): any {
            return {
                namespace: {
                    $alias: `alias_${namespace}`
                }
            };
        }

        const supportedVocabularies = Vocabularies.SUPPORTED_VOCABULARIES;
        const allNamespaces = Object.keys(supportedVocabularies);
        const updatableNamespaces = allNamespaces.filter((ns) => supportedVocabularies[ns].update !== false);
        const numberOfNonSkippedVocabularies = updatableNamespaces.length;

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

        for (const namespace of updatableNamespaces) {
            const mockContent = getMockContent(namespace);
            mockAxiosGet.mockImplementationOnce(async () => Promise.resolve({ data: mockContent }));
            mockFormat.mockResolvedValueOnce(`prettifiedJson_${namespace}`);
        }
        mockResolveConfig.mockResolvedValue({});

        try {
            // Act
            await Vocabularies.updateVocabularies();

            // Assert
            expect(mockMkdir).toHaveBeenCalledTimes(1);
            expect(mockMkdir).toHaveBeenCalledWith(Vocabularies.VOCABULARIES_LOCATION);
            expect(mockAxiosGet).toHaveBeenCalledTimes(numberOfNonSkippedVocabularies);
            expect(mockResolveConfig).toHaveBeenCalledTimes(numberOfNonSkippedVocabularies);
            expect(mockWriteFile).toHaveBeenCalledTimes(numberOfNonSkippedVocabularies);
            expect(consoleSpy).toHaveBeenCalledTimes(numberOfNonSkippedVocabularies);

            updatableNamespaces.forEach((namespace, index) => {
                const vocabulary = supportedVocabularies[namespace];
                const callNumber = index + 1;
                const path = `${join(Vocabularies.VOCABULARIES_LOCATION, namespace)}.ts`;
                expect(mockAxiosGet).toHaveBeenNthCalledWith(callNumber, vocabulary.uri, { 'responseType': 'json' });
                expect(mockResolveConfig).toHaveBeenNthCalledWith(callNumber, path);
                expect(mockWriteFile).toHaveBeenNthCalledWith(callNumber, path, `prettifiedJson_${namespace}`, 'utf8');
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
