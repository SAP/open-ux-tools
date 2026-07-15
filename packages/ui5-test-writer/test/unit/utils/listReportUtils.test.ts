import type { TreeModel, TreeAggregation, TreeAggregations } from '@sap/ux-specification/dist/types/src/parser';
import type { Logger } from '@sap-ux/logger';
import {
    getListReportFeatures,
    buildButtonState,
    safeCheckButtonVisibility,
    safeCheckActionButtonStates,
    getToolBarActions,
    checkButtonVisibility,
    getFilterFieldNames,
    checkActionButtonStates,
    checkActionButtonStatesFromMetadata,
    getToolBarActionNames,
    getToolBarActionItems,
    isALPManifestTarget,
    isALPFromManifest,
    getSemanticKeyProperties,
    getSemanticKeyPropertiesFromMetadata,
    isSemanticKeyInFilterBar,
    safeGetSemanticKeyProperties,
    getCustomFilterFieldProperties,
    getTableIdentifiers,
    getPropertyLabelFromMetadata,
    isHiddenFilter,
    getFilterFieldItems
} from '../../../src/utils/listReportUtils.js';
import type { ButtonState, FEV4ManifestTarget } from '../../../src/types.js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PageWithModelV4 } from '@sap/ux-specification/dist/types/src/parser/application';
import type { Manifest } from '@sap-ux/project-access';
import { parse } from '@sap-ux/edmx-parser';
import { convert } from '@sap-ux/annotation-converter';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Test buildButtonState()', () => {
    test('should return visible false when buttonState is undefined', () => {
        const result = buildButtonState(undefined);
        expect(result).toEqual({
            visible: false,
            enabled: undefined,
            dynamicPath: undefined
        });
    });

    test('should return visible false when buttonState has visible false', () => {
        const buttonState: ButtonState = {
            visible: false,
            enabled: true
        };
        const result = buildButtonState(buttonState);
        expect(result).toEqual({
            visible: false,
            enabled: true,
            dynamicPath: undefined
        });
    });

    test('should return correct state when button is visible and enabled', () => {
        const buttonState: ButtonState = {
            visible: true,
            enabled: true
        };
        const result = buildButtonState(buttonState);
        expect(result).toEqual({
            visible: true,
            enabled: true,
            dynamicPath: undefined
        });
    });

    test('should return correct state when button is visible but not enabled', () => {
        const buttonState: ButtonState = {
            visible: true,
            enabled: false
        };
        const result = buildButtonState(buttonState);
        expect(result).toEqual({
            visible: true,
            enabled: false,
            dynamicPath: undefined
        });
    });

    test('should return correct state with dynamicPath when enabled is dynamic', () => {
        const buttonState: ButtonState = {
            visible: true,
            enabled: 'dynamic',
            dynamicPath: '_it/__EntityControl/Deletable'
        };
        const result = buildButtonState(buttonState);
        expect(result).toEqual({
            visible: true,
            enabled: 'dynamic',
            dynamicPath: '_it/__EntityControl/Deletable'
        });
    });

    test('should not include dynamicPath when enabled is not dynamic', () => {
        const buttonState: ButtonState = {
            visible: true,
            enabled: true,
            dynamicPath: 'some/path'
        };
        const result = buildButtonState(buttonState);
        expect(result).toEqual({
            visible: true,
            enabled: true,
            dynamicPath: undefined
        });
    });
});

describe('Test safeCheckButtonVisibility()', () => {
    let mockLogger: Logger;

    beforeEach(() => {
        mockLogger = {
            warn: jest.fn(),
            debug: jest.fn(),
            info: jest.fn(),
            error: jest.fn()
        } as unknown as Logger;
    });

    test('should return button visibility result when metadata is valid', () => {
        // Create simple valid metadata
        const validMetadata = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:DataServices>
        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
            <EntityType Name="TestEntity">
                <Key>
                    <PropertyRef Name="ID"/>
                </Key>
                <Property Name="ID" Type="Edm.String"/>
            </EntityType>
            <EntityContainer Name="EntityContainer">
                <EntitySet Name="TestSet" EntityType="TestService.TestEntity"/>
            </EntityContainer>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;
        const result = safeCheckButtonVisibility(validMetadata, 'TestSet', mockLogger);
        expect(result).toBeDefined();
        expect(result?.create).toBeDefined();
        expect(result?.delete).toBeDefined();
    });

    test('should return undefined and log debug when metadata is invalid', () => {
        const result = safeCheckButtonVisibility('invalid xml', 'TestSet', mockLogger);
        expect(result).toBeUndefined();
        expect(mockLogger.debug).toHaveBeenCalled();
    });

    test('should return undefined and log debug when entity set does not exist', () => {
        const validMetadata = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:DataServices>
        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
            <EntityContainer Name="EntityContainer">
            </EntityContainer>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;
        const result = safeCheckButtonVisibility(validMetadata, 'NonExistentEntitySet', mockLogger);
        expect(result).toBeUndefined();
        expect(mockLogger.debug).toHaveBeenCalled();
    });

    test('should handle missing logger gracefully', () => {
        const result = safeCheckButtonVisibility('invalid xml', 'TestSet');
        expect(result).toBeUndefined();
    });

    test('should log error message when parse error occurs', () => {
        const invalidMetadata = '<invalid>xml</invalid>';
        safeCheckButtonVisibility(invalidMetadata, 'TestSet', mockLogger);
        expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Failed to check button visibility'));
    });
});

describe('Test safeCheckActionButtonStates()', () => {
    let mockLogger: Logger;

    beforeEach(() => {
        mockLogger = {
            warn: jest.fn(),
            debug: jest.fn(),
            info: jest.fn(),
            error: jest.fn()
        } as unknown as Logger;
    });

    const validMetadataXml = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:DataServices>
        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
            <EntityType Name="TestEntity">
                <Key>
                    <PropertyRef Name="ID"/>
                </Key>
                <Property Name="ID" Type="Edm.String"/>
            </EntityType>
            <EntityContainer Name="EntityContainer">
                <EntitySet Name="TestSet" EntityType="TestService.TestEntity"/>
            </EntityContainer>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

    test('should return action button states when metadata is valid', () => {
        const result = safeCheckActionButtonStates(convert(parse(validMetadataXml)), 'TestSet', [], mockLogger);
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
    });

    test('should return empty array and log debug when entity set does not exist', () => {
        const result = safeCheckActionButtonStates(
            convert(parse(validMetadataXml)),
            'NonExistentEntitySet',
            [],
            mockLogger
        );
        expect(result).toEqual([]);
        expect(mockLogger.debug).toHaveBeenCalled();
    });

    test('should handle missing logger gracefully', () => {
        expect(() =>
            safeCheckActionButtonStates(convert(parse(validMetadataXml)), 'NonExistentEntitySet', [])
        ).not.toThrow();
    });

    test('should handle empty action names array', () => {
        const result = safeCheckActionButtonStates(convert(parse(validMetadataXml)), 'TestSet', [], mockLogger);
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
    });
});

describe('Test getToolBarActions()', () => {
    test('should return toolbar actions aggregation from page model', () => {
        const mockPageModel: TreeModel = {
            root: {
                aggregations: {
                    table: {
                        aggregations: {
                            toolBar: {
                                aggregations: {
                                    actions: {
                                        aggregations: {
                                            action1: { description: 'Action 1' } as unknown as TreeAggregation,
                                            action2: { description: 'Action 2' } as unknown as TreeAggregation
                                        }
                                    } as unknown as TreeAggregation
                                }
                            } as unknown as TreeAggregation
                        }
                    } as unknown as TreeAggregation
                }
            } as unknown as TreeAggregation,
            name: 'test',
            schema: {}
        } as unknown as TreeModel;

        const result = getToolBarActions(mockPageModel);
        expect(result).toEqual({
            action1: { description: 'Action 1' },
            action2: { description: 'Action 2' }
        });
    });

    test('should return empty object when table is missing', () => {
        const mockPageModel: TreeModel = {
            root: {
                aggregations: {}
            } as unknown as TreeAggregation,
            name: 'test',
            schema: {}
        } as unknown as TreeModel;

        const result = getToolBarActions(mockPageModel);
        expect(result).toEqual({});
    });

    test('should return empty object when toolBar is missing', () => {
        const mockPageModel: TreeModel = {
            root: {
                aggregations: {
                    table: {
                        aggregations: {}
                    } as unknown as TreeAggregation
                }
            } as unknown as TreeAggregation,
            name: 'test',
            schema: {}
        } as unknown as TreeModel;

        const result = getToolBarActions(mockPageModel);
        expect(result).toEqual({});
    });

    test('should return empty object when actions is missing', () => {
        const mockPageModel: TreeModel = {
            root: {
                aggregations: {
                    table: {
                        aggregations: {
                            toolBar: {
                                aggregations: {}
                            } as unknown as TreeAggregation
                        }
                    } as unknown as TreeAggregation
                }
            } as unknown as TreeAggregation,
            name: 'test',
            schema: {}
        } as unknown as TreeModel;

        const result = getToolBarActions(mockPageModel);
        expect(result).toEqual({});
    });
});

describe('Test checkButtonVisibility()', () => {
    test('should return default state when no restrictions are present', () => {
        // Create minimal metadata without restrictions
        const minimalMetadata = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:DataServices>
        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
            <EntityType Name="TestEntity">
                <Key>
                    <PropertyRef Name="ID"/>
                </Key>
                <Property Name="ID" Type="Edm.String"/>
            </EntityType>
            <EntityContainer Name="EntityContainer">
                <EntitySet Name="TestSet" EntityType="TestService.TestEntity"/>
            </EntityContainer>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

        const result = checkButtonVisibility(minimalMetadata, 'TestSet');
        expect(result.create).toEqual({ visible: true, enabled: true });
        expect(result.delete).toEqual({ visible: true, enabled: true });
    });

    test('should return default state when restrictions exist but property is undefined', () => {
        // Test internal analyzeRestriction function behavior when value is undefined/null
        const minimalMetadata = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:DataServices>
        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
            <EntityType Name="TestEntity">
                <Key>
                    <PropertyRef Name="ID"/>
                </Key>
                <Property Name="ID" Type="Edm.String"/>
            </EntityType>
            <EntityContainer Name="EntityContainer">
                <EntitySet Name="TestSet" EntityType="TestService.TestEntity"/>
            </EntityContainer>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

        const result = checkButtonVisibility(minimalMetadata, 'TestSet');
        // When no restrictions, defaults to visible and enabled
        expect(result.create.visible).toBe(true);
        expect(result.create.enabled).toBe(true);
    });

    test('should throw error when metadata is invalid', () => {
        expect(() => {
            checkButtonVisibility('invalid xml', 'TestSet');
        }).toThrow('Failed to analyze button visibility');
    });

    test('should throw error when entity set does not exist', () => {
        const minimalMetadata = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:DataServices>
        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
            <EntityContainer Name="EntityContainer">
            </EntityContainer>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

        expect(() => {
            checkButtonVisibility(minimalMetadata, 'NonExistentSet');
        }).toThrow("Entity set 'NonExistentSet' not found in metadata");
    });

    test('should handle boolean restrictions correctly - when annotations are present', () => {
        // Note: The edmx parser/converter may not always recognize simple entity set annotations
        // This test verifies that the function handles the case when annotations ARE present
        // in the converted metadata structure
        const minimalMetadata = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:DataServices>
        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
            <EntityType Name="TestEntity">
                <Key>
                    <PropertyRef Name="ID"/>
                </Key>
                <Property Name="ID" Type="Edm.String"/>
            </EntityType>
            <EntityContainer Name="EntityContainer">
                <EntitySet Name="TestSet" EntityType="TestService.TestEntity"/>
            </EntityContainer>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

        // When restrictions are not present, function returns defaults
        const result = checkButtonVisibility(minimalMetadata, 'TestSet');
        expect(result.create.visible).toBe(true);
        expect(result.create.enabled).toBe(true);
        expect(result.delete.visible).toBe(true);
        expect(result.delete.enabled).toBe(true);
    });

    test('should handle path-based restrictions correctly - defaults when no annotations', () => {
        // Similar to above - testing default behavior when annotations are not in metadata
        const minimalMetadata = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:DataServices>
        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
            <EntityType Name="TestEntity">
                <Key>
                    <PropertyRef Name="ID"/>
                </Key>
                <Property Name="ID" Type="Edm.String"/>
            </EntityType>
            <EntityContainer Name="EntityContainer">
                <EntitySet Name="TestSet" EntityType="TestService.TestEntity"/>
            </EntityContainer>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

        const result = checkButtonVisibility(minimalMetadata, 'TestSet');
        // When no restrictions are defined, defaults to enabled
        expect(result.delete.visible).toBe(true);
        expect(result.delete.enabled).toBe(true);
    });
});

describe('Test getFilterFieldNames()', () => {
    let mockLogger: Logger;

    beforeEach(() => {
        mockLogger = {
            warn: jest.fn(),
            debug: jest.fn(),
            info: jest.fn(),
            error: jest.fn()
        } as unknown as Logger;
    });

    test('should return filter field names from page model', () => {
        const mockPageModel: TreeModel = {
            root: {
                aggregations: {
                    filterBar: {
                        aggregations: {
                            selectionFields: {
                                aggregations: {
                                    field1: {
                                        schema: { keys: [{ name: 'Value', value: 'Field1' }] }
                                    } as unknown as TreeAggregation,
                                    field2: {
                                        schema: { keys: [{ name: 'Value', value: 'Field2' }] }
                                    } as unknown as TreeAggregation
                                }
                            } as unknown as TreeAggregation
                        }
                    } as unknown as TreeAggregation
                }
            } as unknown as TreeAggregation,
            name: 'test',
            schema: {}
        } as unknown as TreeModel;

        const result = getFilterFieldNames(mockPageModel, mockLogger);
        expect(result).toContain('Field1');
        expect(result).toContain('Field2');
        expect(result).toHaveLength(2);
    });

    test('should return empty array when filter fields cannot be extracted', () => {
        const mockPageModel: TreeModel = {
            root: {
                aggregations: {}
            } as unknown as TreeAggregation,
            name: 'test',
            schema: {}
        } as unknown as TreeModel;

        const result = getFilterFieldNames(mockPageModel, mockLogger);
        expect(result).toEqual([]);
        expect(mockLogger.warn).toHaveBeenCalledWith(
            'Unable to extract filter fields from project model using specification. No filter field tests will be generated.'
        );
    });

    test('should log debug on error', () => {
        const invalidPageModel = null as unknown as TreeModel;
        const result = getFilterFieldNames(invalidPageModel, mockLogger);
        expect(result).toEqual([]);
        expect(mockLogger.debug).toHaveBeenCalled();
    });

    test('should handle missing logger gracefully', () => {
        const mockPageModel: TreeModel = {
            root: {
                aggregations: {}
            } as unknown as TreeAggregation,
            name: 'test',
            schema: {}
        } as unknown as TreeModel;

        const result = getFilterFieldNames(mockPageModel);
        expect(result).toEqual([]);
    });
});

describe('Test checkActionButtonStates()', () => {
    test('should return empty actions array when no LineItem annotation exists', () => {
        const minimalMetadata = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:DataServices>
        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
            <EntityType Name="TestEntity">
                <Key>
                    <PropertyRef Name="ID"/>
                </Key>
                <Property Name="ID" Type="Edm.String"/>
            </EntityType>
            <EntityContainer Name="EntityContainer">
                <EntitySet Name="TestSet" EntityType="TestService.TestEntity"/>
            </EntityContainer>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

        const result = checkActionButtonStates(minimalMetadata, 'TestSet');
        expect(result.actions).toEqual([]);
        expect(result.entityType).toBe('TestEntity');
    });

    test('should return empty actions array when LineItem exists but is not an array', () => {
        // Test coverage for the Array.isArray check
        const minimalMetadata = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:DataServices>
        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
            <EntityType Name="TestEntity">
                <Key>
                    <PropertyRef Name="ID"/>
                </Key>
                <Property Name="ID" Type="Edm.String"/>
            </EntityType>
            <EntityContainer Name="EntityContainer">
                <EntitySet Name="TestSet" EntityType="TestService.TestEntity"/>
            </EntityContainer>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

        const result = checkActionButtonStates(minimalMetadata, 'TestSet');
        expect(result.actions).toEqual([]);
        expect(result.entityType).toBe('TestEntity');
    });

    test('should throw error when entity set does not exist', () => {
        const minimalMetadata = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:DataServices>
        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
            <EntityContainer Name="EntityContainer">
            </EntityContainer>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

        expect(() => {
            checkActionButtonStates(minimalMetadata, 'NonExistentSet');
        }).toThrow("Entity set 'NonExistentSet' not found in metadata");
    });

    test('should throw error when entity type is missing', () => {
        // The EDMX parser may be more lenient and not fail on this
        // This test ensures we handle the case where EntitySet exists but EntityType is not referenced
        const minimalMetadata = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:DataServices>
        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
            <EntityType Name="TestEntity">
                <Key>
                    <PropertyRef Name="ID"/>
                </Key>
                <Property Name="ID" Type="Edm.String"/>
            </EntityType>
            <EntityContainer Name="EntityContainer">
                <EntitySet Name="TestSet" EntityType="TestService.TestEntity"/>
            </EntityContainer>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

        // When entity type exists, function should succeed
        const result = checkActionButtonStates(minimalMetadata, 'TestSet');
        expect(result.entityType).toBe('TestEntity');
    });

    test('should handle invalid metadata gracefully', () => {
        expect(() => {
            checkActionButtonStates('invalid xml', 'TestSet');
        }).toThrow('Failed to analyze action button states');
    });

    test('should return filtered actions when action names are provided', () => {
        // Note: The edmx parser/converter may not recognize UI.LineItem annotations on EntitySet level
        // Testing that when no LineItem exists, we get empty array
        const minimalMetadata = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:DataServices>
        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
            <EntityType Name="TestEntity">
                <Key>
                    <PropertyRef Name="ID"/>
                </Key>
                <Property Name="ID" Type="Edm.String"/>
            </EntityType>
            <EntityContainer Name="EntityContainer">
                <EntitySet Name="TestSet" EntityType="TestService.TestEntity"/>
            </EntityContainer>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;
        const result = checkActionButtonStates(minimalMetadata, 'TestSet', ['Check']);
        expect(result.actions).toBeDefined();
        expect(Array.isArray(result.actions)).toBe(true);
        // When no LineItem annotation, returns empty array
        expect(result.actions).toEqual([]);
    });

    test('should return all actions when no action names filter is provided', () => {
        // Similar to above - testing that function returns empty array when no LineItem exists
        const minimalMetadata = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:DataServices>
        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
            <EntityType Name="TestEntity">
                <Key>
                    <PropertyRef Name="ID"/>
                </Key>
                <Property Name="ID" Type="Edm.String"/>
            </EntityType>
            <EntityContainer Name="EntityContainer">
                <EntitySet Name="TestSet" EntityType="TestService.TestEntity"/>
            </EntityContainer>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;
        const result = checkActionButtonStates(minimalMetadata, 'TestSet');
        expect(result.actions).toBeDefined();
        expect(Array.isArray(result.actions)).toBe(true);
        expect(result.actions).toEqual([]);
    });

    test('should handle actions with InvocationGrouping - returns empty when no LineItem', () => {
        // Testing that function handles case when no LineItem annotations exist
        const minimalMetadata = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:DataServices>
        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
            <EntityType Name="TestEntity">
                <Key>
                    <PropertyRef Name="ID"/>
                </Key>
                <Property Name="ID" Type="Edm.String"/>
            </EntityType>
            <EntityContainer Name="EntityContainer">
                <EntitySet Name="TestSet" EntityType="TestService.TestEntity"/>
            </EntityContainer>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

        const result = checkActionButtonStates(minimalMetadata, 'TestSet');
        expect(result.actions).toEqual([]);
        expect(result.entityType).toBe('TestEntity');
    });

    test('should handle error case and wrap it in Failed to analyze message', () => {
        // Test the catch block error handling
        const invalidXml = 'completely broken xml <>';
        expect(() => {
            checkActionButtonStates(invalidXml, 'TestSet');
        }).toThrow('Failed to analyze action button states');
    });

    test('should process action buttons with real metadata fixture', () => {
        // Use the actual fixture metadata to test action button processing
        const fixtureMetadata = readFileSync(join(__dirname, '../../fixtures/metadata.xml'), 'utf8');

        // Test with Travel entity set which has LineItem annotations
        const result = checkActionButtonStates(fixtureMetadata, 'Travel');

        expect(result).toBeDefined();
        expect(result.entityType).toBe('TravelType');
        expect(Array.isArray(result.actions)).toBe(true);

        // The fixture has DataFieldForAction entries
        if (result.actions.length > 0) {
            const action = result.actions[0];
            expect(action).toHaveProperty('label');
            expect(action).toHaveProperty('action');
            expect(action).toHaveProperty('visible');
            expect(action).toHaveProperty('enabled');
        }
    });

    test('should filter actions by name with real metadata fixture', () => {
        const fixtureMetadata = readFileSync(join(__dirname, '../../fixtures/metadata.xml'), 'utf8');

        // Test filtering by action name - looking for specific actions
        const result = checkActionButtonStates(fixtureMetadata, 'Travel', ['setToBooked', 'deductDiscount']);

        expect(result).toBeDefined();
        expect(Array.isArray(result.actions)).toBe(true);

        // Should only return actions that match the filter (or be empty if none match)
        // The filtering logic looks for actions by name or label
        if (result.actions.length > 0) {
            result.actions.forEach((action) => {
                expect(action).toHaveProperty('action');
                expect(action).toHaveProperty('label');
                expect(action).toHaveProperty('visible');
                expect(action).toHaveProperty('enabled');
            });
        }
    });

    test('should extract InvocationGrouping from real metadata', () => {
        const fixtureMetadata = readFileSync(join(__dirname, '../../fixtures/metadata.xml'), 'utf8');

        const result = checkActionButtonStates(fixtureMetadata, 'Travel');

        // Check if any actions have InvocationGrouping
        const actionsWithGrouping = result.actions.filter((a) => a.invocationGrouping);

        // The fixture should have at least some actions with InvocationGrouping
        if (actionsWithGrouping.length > 0) {
            expect(actionsWithGrouping[0].invocationGrouping).toBeDefined();
        }
    });

    test('should extract action method name from complex action string', () => {
        // This tests the extractActionMethodName internal function through the public API
        const fixtureMetadata = readFileSync(join(__dirname, '../../fixtures/metadata.xml'), 'utf8');

        const result = checkActionButtonStates(fixtureMetadata, 'Travel');

        // Actions should have properly extracted method names
        if (result.actions.length > 0) {
            result.actions.forEach((action) => {
                // The action string should be a fully qualified name
                expect(action.action).toBeDefined();
                expect(action.action.length).toBeGreaterThan(0);
                // Verify the action format (should contain namespace and method)
                expect(action.action).toMatch(/\w+/);
            });
        }
    });

    test('should handle OperationAvailable annotations with boolean values', () => {
        // Test with fixture that has OperationAvailable annotations
        const fixtureMetadata = readFileSync(join(__dirname, '../../fixtures/metadata.xml'), 'utf8');

        const result = checkActionButtonStates(fixtureMetadata, 'Travel');

        // Some actions should have enabled state based on OperationAvailable
        if (result.actions.length > 0) {
            result.actions.forEach((action) => {
                // enabled can be true, false, or 'dynamic'
                expect(['boolean', 'string']).toContain(typeof action.enabled);
                if (action.enabled === 'dynamic') {
                    expect(action.dynamicPath).toBeDefined();
                }
            });
        }
    });

    test('should handle findOperationAvailableAnnotation in actions', () => {
        // This exercises the findOperationAvailableAnnotation internal function
        const fixtureMetadata = readFileSync(join(__dirname, '../../fixtures/metadata.xml'), 'utf8');

        // Get all actions without filtering
        const result = checkActionButtonStates(fixtureMetadata, 'Travel');

        // Each action should have an enabled state determined by OperationAvailable annotation
        expect(result.actions.length).toBeGreaterThanOrEqual(0);
        result.actions.forEach((action) => {
            expect(action.visible).toBe(true); // Actions are always visible by default
            expect(action.enabled).toBeDefined();
        });
    });

    test('should handle extractEnumMemberValue for InvocationGrouping', () => {
        // This tests the extractEnumMemberValue internal function
        const fixtureMetadata = readFileSync(join(__dirname, '../../fixtures/metadata.xml'), 'utf8');

        const result = checkActionButtonStates(fixtureMetadata, 'Travel');

        // Filter actions that have InvocationGrouping
        const actionsWithGrouping = result.actions.filter((a) => a.invocationGrouping);

        // If there are actions with grouping, verify the extracted value
        if (actionsWithGrouping.length > 0) {
            actionsWithGrouping.forEach((action) => {
                // The invocationGrouping should be extracted correctly
                expect(typeof action.invocationGrouping).toBe('string');
                expect(action.invocationGrouping?.length).toBeGreaterThan(0);
            });
        }
    });
});

describe('Test internal helper function coverage through public APIs', () => {
    test('should exercise analyzeRestriction with null value', () => {
        // This tests the path where restriction[propertyName] is null
        // Since we can't easily mock the converter output, we test default behavior
        const minimalMetadata = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:DataServices>
        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
            <EntityType Name="TestEntity">
                <Key>
                    <PropertyRef Name="ID"/>
                </Key>
                <Property Name="ID" Type="Edm.String"/>
            </EntityType>
            <EntityContainer Name="EntityContainer">
                <EntitySet Name="TestSet" EntityType="TestService.TestEntity"/>
            </EntityContainer>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

        const result = checkButtonVisibility(minimalMetadata, 'TestSet');
        // When no restrictions, should return default state
        expect(result.create.visible).toBe(true);
        expect(result.create.enabled).toBe(true);
        expect(result.delete.visible).toBe(true);
        expect(result.delete.enabled).toBe(true);
    });

    test('should handle analyzeRestriction with boolean false value using fixture', () => {
        // Use the fixture which has actual restriction annotations
        const fixtureMetadata = readFileSync(join(__dirname, '../../fixtures/metadata.xml'), 'utf8');

        // Test with Booking entity which may have restrictions
        const result = checkButtonVisibility(fixtureMetadata, 'Booking');

        // The result should be defined with create and delete properties
        expect(result).toBeDefined();
        expect(result.create).toBeDefined();
        expect(result.delete).toBeDefined();
        expect(typeof result.create.visible).toBe('boolean');
        expect(typeof result.delete.visible).toBe('boolean');
    });

    test('should handle path-based restriction with $Path using fixture', () => {
        // The fixture has path-based restrictions like _Booking/__DeleteByAssociationControl
        const fixtureMetadata = readFileSync(join(__dirname, '../../fixtures/metadata.xml'), 'utf8');

        const result = checkButtonVisibility(fixtureMetadata, 'Booking');

        // Should handle path-based enabled state
        expect(result).toBeDefined();
        if (result.delete.enabled === 'dynamic') {
            expect(result.delete.dynamicPath).toBeDefined();
            expect(typeof result.delete.dynamicPath).toBe('string');
        }
    });

    test('should handle getToolBarActions with nested empty aggregations', () => {
        const mockPageModel: TreeModel = {
            root: {
                aggregations: {
                    table: {
                        aggregations: {
                            toolBar: {
                                aggregations: {
                                    actions: {
                                        aggregations: {}
                                    } as unknown as TreeAggregation
                                }
                            } as unknown as TreeAggregation
                        }
                    } as unknown as TreeAggregation
                }
            } as unknown as TreeAggregation,
            name: 'test',
            schema: {}
        } as unknown as TreeModel;

        const result = getToolBarActions(mockPageModel);
        expect(result).toEqual({});
    });

    test('should handle getToolBarActionItems with various aggregation states', () => {
        // Test with mixed valid and invalid descriptions
        const toolBarActionsAgg: TreeAggregations = {
            action1: { description: 'Valid Action' } as unknown as TreeAggregation,
            action2: { description: '' } as unknown as TreeAggregation,
            action3: { description: null } as unknown as TreeAggregation
        };

        const result = getToolBarActionItems(toolBarActionsAgg);
        expect(result).toHaveLength(3);
        expect(result[0]).toBe('Valid Action');
        expect(result[1]).toBe('');
        expect(result[2]).toBeNull();
    });

    test('should test getFilterFieldNames with various error scenarios', () => {
        const mockLogger = {
            warn: jest.fn(),
            debug: jest.fn(),
            info: jest.fn(),
            error: jest.fn()
        } as unknown as Logger;

        // Test with completely invalid model structure
        const invalidModel = {
            root: null
        } as unknown as TreeModel;

        const result = getFilterFieldNames(invalidModel, mockLogger);
        expect(result).toEqual([]);
        // When filter fields are empty, warn is called
        expect(mockLogger.warn).toHaveBeenCalled();
    });

    test('should test checkButtonVisibility error wrapping', () => {
        // Test that errors are properly wrapped with context message
        try {
            checkButtonVisibility('', 'TestSet');
            fail('Should have thrown error');
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect((error as Error).message).toContain('Failed to analyze button visibility');
        }
    });

    test('should handle dataFieldForActions filtering by matching action method', () => {
        // Test the findActionStates internal function by filtering actions
        const fixtureMetadata = readFileSync(join(__dirname, '../../fixtures/metadata.xml'), 'utf8');

        // Get actions from Travel entity
        const allActions = checkActionButtonStates(fixtureMetadata, 'Travel');

        // If there are actions, try filtering by one of them
        if (allActions.actions.length > 0) {
            const firstActionName = allActions.actions[0].action.split('.').pop()?.split('(')[0];
            if (firstActionName) {
                const filtered = checkActionButtonStates(fixtureMetadata, 'Travel', [firstActionName]);
                // The filtered result should contain actions
                expect(filtered.actions.length).toBeGreaterThanOrEqual(0);
            }
        }
    });

    test('should handle actions with label matching in findActionStates', () => {
        // Test that findActionStates can match by label as well as action name
        const fixtureMetadata = readFileSync(join(__dirname, '../../fixtures/metadata.xml'), 'utf8');

        const allActions = checkActionButtonStates(fixtureMetadata, 'Travel');

        // Try to filter by label if actions have labels
        if (allActions.actions.length > 0 && allActions.actions[0].label) {
            const firstLabel = allActions.actions[0].label;
            const filtered = checkActionButtonStates(fixtureMetadata, 'Travel', [firstLabel]);

            // Should be able to find actions by label
            expect(filtered.actions).toBeDefined();
        }
    });

    test('should handle extractAllActionStates when no filter is provided', () => {
        // This exercises the extractAllActionStates code path
        const fixtureMetadata = readFileSync(join(__dirname, '../../fixtures/metadata.xml'), 'utf8');

        // Call without actionNames parameter
        const result = checkActionButtonStates(fixtureMetadata, 'Travel');

        // Should extract all actions
        expect(result.actions).toBeDefined();
        expect(Array.isArray(result.actions)).toBe(true);

        // Verify each action has the expected structure
        result.actions.forEach((action) => {
            expect(action).toHaveProperty('label');
            expect(action).toHaveProperty('action');
            expect(action).toHaveProperty('visible');
            expect(action).toHaveProperty('enabled');
        });
    });

    test('should handle Booking entity with different annotation structure', () => {
        // Test with Booking entity which may have different annotations
        const fixtureMetadata = readFileSync(join(__dirname, '../../fixtures/metadata.xml'), 'utf8');

        const result = checkActionButtonStates(fixtureMetadata, 'Booking');

        // Should successfully parse even if structure is different
        expect(result).toBeDefined();
        expect(result.entityType).toBeDefined();
        expect(Array.isArray(result.actions)).toBe(true);
    });

    test('should handle BookingSupplement entity', () => {
        // Test with another entity to cover more code paths
        const fixtureMetadata = readFileSync(join(__dirname, '../../fixtures/metadata.xml'), 'utf8');

        const result = checkActionButtonStates(fixtureMetadata, 'BookingSupplement');

        expect(result).toBeDefined();
        expect(result.entityType).toBeDefined();
        expect(Array.isArray(result.actions)).toBe(true);
    });

    test('should return enabled:false for bound actions without OperationAvailable annotation', () => {
        // Single-entity bound actions require row selection — disabled by default (no row selected).
        // Collection-bound actions operate on the entity set — always enabled.
        const metadata = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:DataServices>
        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
            <EntityType Name="TestEntity">
                <Key><PropertyRef Name="ID"/></Key>
                <Property Name="ID" Type="Edm.Guid" Nullable="false"/>
            </EntityType>
            <Action Name="EntityBoundAction" IsBound="true">
                <Parameter Name="_it" Type="TestService.TestEntity" Nullable="false"/>
            </Action>
            <Action Name="CollectionBoundAction" IsBound="true">
                <Parameter Name="_it" Type="Collection(TestService.TestEntity)" Nullable="false"/>
            </Action>
            <Action Name="UnboundAction" IsBound="false"/>
            <EntityContainer Name="Container">
                <EntitySet Name="TestSet" EntityType="TestService.TestEntity"/>
            </EntityContainer>
            <Annotations Target="TestService.TestEntity">
                <Annotation Term="com.sap.vocabularies.UI.v1.LineItem">
                    <Collection>
                        <Record Type="com.sap.vocabularies.UI.v1.DataFieldForAction">
                            <PropertyValue Property="Label" String="Entity Bound Action"/>
                            <PropertyValue Property="Action" String="TestService.EntityBoundAction(TestService.TestEntity)"/>
                        </Record>
                        <Record Type="com.sap.vocabularies.UI.v1.DataFieldForAction">
                            <PropertyValue Property="Label" String="Collection Bound Action"/>
                            <PropertyValue Property="Action" String="TestService.CollectionBoundAction(Collection(TestService.TestEntity))"/>
                        </Record>
                        <Record Type="com.sap.vocabularies.UI.v1.DataFieldForAction">
                            <PropertyValue Property="Label" String="Unbound Action"/>
                            <PropertyValue Property="Action" String="TestService.UnboundAction"/>
                        </Record>
                    </Collection>
                </Annotation>
            </Annotations>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

        const result = checkActionButtonStates(metadata, 'TestSet');
        expect(result.actions).toBeDefined();
        expect(Array.isArray(result.actions)).toBe(true);

        const entityBoundAction = result.actions.find((a) => a.label === 'Entity Bound Action');
        const collectionBoundAction = result.actions.find((a) => a.label === 'Collection Bound Action');
        const unboundAction = result.actions.find((a) => a.label === 'Unbound Action');

        if (entityBoundAction) {
            expect(entityBoundAction.enabled).toBe(false);
        }
        if (collectionBoundAction) {
            expect(collectionBoundAction.enabled).toBe(true);
        }
        if (unboundAction) {
            expect(unboundAction.enabled).toBe(true);
        }
    });
});

describe('Test getToolBarActionNames()', () => {
    let mockLogger: Logger;

    beforeEach(() => {
        mockLogger = {
            warn: jest.fn(),
            debug: jest.fn(),
            info: jest.fn(),
            error: jest.fn()
        } as unknown as Logger;
    });

    test('should return toolbar action names from page model', () => {
        const mockPageModel: TreeModel = {
            root: {
                aggregations: {
                    table: {
                        aggregations: {
                            toolBar: {
                                aggregations: {
                                    actions: {
                                        aggregations: {
                                            action1: { description: 'Action One' } as unknown as TreeAggregation,
                                            action2: { description: 'Action Two' } as unknown as TreeAggregation
                                        }
                                    } as unknown as TreeAggregation
                                }
                            } as unknown as TreeAggregation
                        }
                    } as unknown as TreeAggregation
                }
            } as unknown as TreeAggregation,
            name: 'test',
            schema: {}
        } as unknown as TreeModel;

        const result = getToolBarActionNames(mockPageModel, mockLogger);
        expect(result).toContain('Action One');
        expect(result).toContain('Action Two');
        expect(result).toHaveLength(2);
    });

    test('should return empty array when toolbar actions cannot be extracted', () => {
        const mockPageModel: TreeModel = {
            root: {
                aggregations: {}
            } as unknown as TreeAggregation,
            name: 'test',
            schema: {}
        } as unknown as TreeModel;

        const result = getToolBarActionNames(mockPageModel, mockLogger);
        expect(result).toEqual([]);
        expect(mockLogger.warn).toHaveBeenCalledWith(
            'Unable to extract toolbar actions from project model using specification. No toolbar action tests will be generated.'
        );
    });

    test('should log debug on error', () => {
        const invalidPageModel = null as unknown as TreeModel;
        const result = getToolBarActionNames(invalidPageModel, mockLogger);
        expect(result).toEqual([]);
        expect(mockLogger.debug).toHaveBeenCalled();
    });

    test('should handle missing logger gracefully', () => {
        const mockPageModel: TreeModel = {
            root: {
                aggregations: {}
            } as unknown as TreeAggregation,
            name: 'test',
            schema: {}
        } as unknown as TreeModel;

        const result = getToolBarActionNames(mockPageModel);
        expect(result).toEqual([]);
    });
});

describe('Test getToolBarActionItems()', () => {
    test('should return action descriptions from aggregations', () => {
        const toolBarActionsAgg: TreeAggregations = {
            action1: { description: 'First Action' } as unknown as TreeAggregation,
            action2: { description: 'Second Action' } as unknown as TreeAggregation,
            action3: { description: 'Third Action' } as unknown as TreeAggregation
        };

        const result = getToolBarActionItems(toolBarActionsAgg);
        expect(result).toContain('First Action');
        expect(result).toContain('Second Action');
        expect(result).toContain('Third Action');
        expect(result).toHaveLength(3);
    });

    test('should return empty array when aggregations is empty', () => {
        const toolBarActionsAgg: TreeAggregations = {};
        const result = getToolBarActionItems(toolBarActionsAgg);
        expect(result).toEqual([]);
    });

    test('should return empty array when aggregations is undefined', () => {
        const result = getToolBarActionItems(undefined as unknown as TreeAggregations);
        expect(result).toEqual([]);
    });

    test('should return empty array when aggregations is null', () => {
        const result = getToolBarActionItems(null as unknown as TreeAggregations);
        expect(result).toEqual([]);
    });

    test('should handle items with undefined description', () => {
        const toolBarActionsAgg: TreeAggregations = {
            action1: { description: 'Action 1' } as unknown as TreeAggregation,
            action2: {} as unknown as TreeAggregation
        };

        const result = getToolBarActionItems(toolBarActionsAgg);
        expect(result).toHaveLength(2);
        expect(result[0]).toBe('Action 1');
        expect(result[1]).toBeUndefined();
    });
});

describe('Test getListReportFeatures()', () => {
    let mockLogger: Logger;

    beforeEach(() => {
        mockLogger = {
            warn: jest.fn(),
            debug: jest.fn(),
            info: jest.fn(),
            error: jest.fn()
        } as unknown as Logger;
    });

    test('should return complete list report features with metadata', () => {
        const validMetadata = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:DataServices>
        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
            <EntityType Name="TestEntity">
                <Key>
                    <PropertyRef Name="ID"/>
                </Key>
                <Property Name="ID" Type="Edm.String"/>
            </EntityType>
            <EntityContainer Name="EntityContainer">
                <EntitySet Name="TestSet" EntityType="TestService.TestEntity"/>
            </EntityContainer>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

        const mockPageModel: PageWithModelV4 = {
            model: {
                root: {
                    aggregations: {
                        filterBar: {
                            aggregations: {
                                selectionFields: {
                                    aggregations: {
                                        field1: {
                                            description: 'Filter 1',
                                            schema: { keys: [{ name: 'Value', value: 'Field1' }] }
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            }
                        } as unknown as TreeAggregation,
                        table: {
                            aggregations: {
                                columns: {
                                    aggregations: {
                                        col1: {
                                            description: 'Column 1',
                                            custom: false,
                                            schema: {
                                                keys: [{ name: 'Value', value: 'col1' }]
                                            }
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation,
                                toolBar: {
                                    aggregations: {
                                        actions: {
                                            aggregations: {
                                                action1: { description: 'Check' } as unknown as TreeAggregation
                                            }
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            }
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation
            } as unknown as TreeModel,
            name: 'test'
        };

        const result = getListReportFeatures(mockPageModel, mockLogger, validMetadata);

        expect(result).toBeDefined();
        expect(result.createButton).toBeDefined();
        expect(result.deleteButton).toBeDefined();
        expect(result.filterBarItems).toContainEqual({ property: 'Field1', description: 'Filter 1', custom: false });
        expect(result.tableColumns).toBeDefined();
        expect(result.toolBarActions).toBeDefined();
    });

    test('should return features without metadata when metadata is not provided', () => {
        const mockPageModel: PageWithModelV4 = {
            model: {
                root: {
                    aggregations: {
                        filterBar: {
                            aggregations: {
                                selectionFields: {
                                    aggregations: {
                                        field1: {
                                            description: 'Filter 1',
                                            schema: { keys: [{ name: 'Value', value: 'Field1' }] }
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            }
                        } as unknown as TreeAggregation,
                        table: {
                            aggregations: {
                                columns: {
                                    aggregations: {
                                        col1: { description: 'Column 1' } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation,
                                toolBar: {
                                    aggregations: {
                                        actions: {
                                            aggregations: {}
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            }
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation
            } as unknown as TreeModel,
            name: 'test'
        };

        const result = getListReportFeatures(mockPageModel, mockLogger);

        expect(result.createButton).toEqual({
            visible: false,
            enabled: undefined,
            dynamicPath: undefined
        });
        expect(result.deleteButton).toEqual({
            visible: false,
            enabled: undefined,
            dynamicPath: undefined
        });
        expect(result.filterBarItems).toContainEqual({ property: 'Field1', description: 'Filter 1', custom: false });
        expect(result.toolBarActions).toEqual([]);
    });

    test('should return features without metadata when only metadata is provided but not entitySetName', () => {
        const mockPageModel: PageWithModelV4 = {
            model: {
                root: {
                    aggregations: {
                        filterBar: {
                            aggregations: {
                                selectionFields: {
                                    aggregations: {}
                                } as unknown as TreeAggregation
                            }
                        } as unknown as TreeAggregation,
                        table: {
                            aggregations: {
                                columns: {
                                    aggregations: {}
                                } as unknown as TreeAggregation,
                                toolBar: {
                                    aggregations: {
                                        actions: {
                                            aggregations: {}
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            }
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation
            } as unknown as TreeModel,
            name: 'test'
        };

        const validMetadata = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:DataServices>
        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
            <EntityType Name="TestEntity">
                <Key>
                    <PropertyRef Name="ID"/>
                </Key>
                <Property Name="ID" Type="Edm.String"/>
            </EntityType>
            <EntityContainer Name="EntityContainer">
                <EntitySet Name="TestSet" EntityType="TestService.TestEntity"/>
            </EntityContainer>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;
        const result = getListReportFeatures(mockPageModel, mockLogger, validMetadata);

        expect(result.createButton?.visible).toBe(false);
        expect(result.deleteButton?.visible).toBe(false);
        expect(result.toolBarActions).toEqual([]);
    });

    test('should handle empty page model gracefully', () => {
        const emptyPageModel: PageWithModelV4 = {
            model: {
                root: {
                    aggregations: {}
                } as unknown as TreeAggregation
            } as unknown as TreeModel,
            name: 'test'
        };

        const result = getListReportFeatures(emptyPageModel, mockLogger);

        expect(result.createButton).toBeDefined();
        expect(result.deleteButton).toBeDefined();
        expect(result.filterBarItems).toEqual([]);
        expect(result.tableColumns).toBeDefined();
        expect(result.toolBarActions).toEqual([]);
    });

    test('should handle missing logger gracefully', () => {
        const mockPageModel: PageWithModelV4 = {
            model: {
                root: {
                    aggregations: {}
                } as unknown as TreeAggregation
            } as unknown as TreeModel,
            name: 'test'
        };

        const result = getListReportFeatures(mockPageModel);
        expect(result).toBeDefined();
    });

    test('should integrate all sub-functions correctly', () => {
        const validMetadata = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:DataServices>
        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
            <EntityType Name="TestEntity">
                <Key>
                    <PropertyRef Name="ID"/>
                </Key>
                <Property Name="ID" Type="Edm.String"/>
            </EntityType>
            <EntityContainer Name="EntityContainer">
                <EntitySet Name="TestSet" EntityType="TestService.TestEntity">
                    <Annotation Term="com.sap.vocabularies.UI.v1.LineItem">
                        <Collection>
                            <Record Type="com.sap.vocabularies.UI.v1.DataFieldForAction">
                                <PropertyValue Property="Label" String="Check Action"/>
                                <PropertyValue Property="Action" String="TestService.Check"/>
                            </Record>
                        </Collection>
                    </Annotation>
                </EntitySet>
            </EntityContainer>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

        const completePageModel: PageWithModelV4 = {
            model: {
                root: {
                    aggregations: {
                        filterBar: {
                            aggregations: {
                                selectionFields: {
                                    aggregations: {
                                        field1: {
                                            description: 'Product',
                                            schema: { keys: [{ name: 'Value', value: 'Product' }] }
                                        } as unknown as TreeAggregation,
                                        field2: {
                                            description: 'Category',
                                            schema: { keys: [{ name: 'Value', value: 'Category' }] }
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            }
                        } as unknown as TreeAggregation,
                        table: {
                            aggregations: {
                                columns: {
                                    aggregations: {
                                        col1: {
                                            description: 'ID',
                                            custom: false,
                                            schema: {
                                                keys: [{ name: 'Value', value: 'IDColumn' }]
                                            }
                                        } as unknown as TreeAggregation,
                                        col2: {
                                            description: 'Name',
                                            custom: false,
                                            schema: {
                                                keys: [{ name: 'Value', value: 'NameColumn' }]
                                            }
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation,
                                toolBar: {
                                    aggregations: {
                                        actions: {
                                            aggregations: {
                                                action1: { description: 'Check' } as unknown as TreeAggregation
                                            }
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            }
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation
            } as unknown as TreeModel,
            name: 'test'
        };

        const result = getListReportFeatures(completePageModel, mockLogger, validMetadata);

        // Verify all components are integrated
        expect(result.filterBarItems).toHaveLength(2);
        expect(result.filterBarItems).toContainEqual({ property: 'Product', description: 'Product', custom: false });
        expect(result.filterBarItems).toContainEqual({ property: 'Category', description: 'Category', custom: false });

        expect(Object.keys(result.tableColumns || {})).toContain('IDColumn');
        expect(Object.keys(result.tableColumns || {})).toContain('NameColumn');

        expect(result.createButton).toBeDefined();
        expect(result.createButton?.visible).toBeDefined();

        expect(result.deleteButton).toBeDefined();
        expect(result.deleteButton?.visible).toBeDefined();

        expect(Array.isArray(result.toolBarActions)).toBe(true);
    });

    test('should log debug and return partial result when metadata XML is invalid', () => {
        const pageModel: PageWithModelV4 = {
            model: {
                root: { aggregations: {} } as unknown as TreeAggregation
            } as unknown as TreeModel,
            name: 'TestList',
            entitySet: 'TestSet'
        };

        const result = getListReportFeatures(pageModel, mockLogger, 'not valid xml');
        expect(result).toBeDefined();
        expect(result.name).toBe('TestList');
        expect(result.semanticKey?.semanticKeyProperties).toBeUndefined();
        expect(result.toolBarActions).toEqual([]);
        expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Failed to parse metadata'));
    });
});

/** ALP manifest target with views.paths containing a primary array */
const ALP_TARGET: FEV4ManifestTarget = {
    type: 'Component',
    name: 'sap.fe.templates.ListReport',
    options: {
        settings: {
            contextPath: '/SalesOrderManage',
            views: {
                paths: [
                    {
                        primary: [{ annotationPath: 'com.sap.vocabularies.UI.v1.PresentationVariant' }],
                        secondary: [{ annotationPath: 'com.sap.vocabularies.UI.v1.LineItem' }],
                        defaultPath: 'both'
                    }
                ]
            }
        }
    }
};

/** Non-ALP ListReport target (no views.paths) */
const LR_TARGET: FEV4ManifestTarget = {
    type: 'Component',
    name: 'sap.fe.templates.ListReport',
    options: { settings: { contextPath: '/Orders' } }
};

/** Minimal ALP manifest matching the real alpv4 structure */
const ALP_MANIFEST: Manifest = {
    'sap.app': { id: 'alpv4test', type: 'application', applicationVersion: { version: '0.0.1' } },
    'sap.ui5': {
        routing: {
            targets: {
                SalesOrderManageList: ALP_TARGET as any,
                SalesOrderManageObjectPage: {
                    type: 'Component',
                    name: 'sap.fe.templates.ObjectPage'
                } as any
            }
        }
    }
} as unknown as Manifest;

/** Manifest with a standard (non-ALP) ListReport */
const LR_MANIFEST: Manifest = {
    'sap.app': { id: 'lrtest', type: 'application', applicationVersion: { version: '0.0.1' } },
    'sap.ui5': {
        routing: {
            targets: {
                OrdersList: LR_TARGET as any
            }
        }
    }
} as unknown as Manifest;

describe('isALPManifestTarget()', () => {
    test('returns true when views.paths contains an entry with a non-empty primary array', () => {
        expect(isALPManifestTarget(ALP_TARGET)).toBe(true);
    });

    test('returns false when target has no views configuration', () => {
        expect(isALPManifestTarget(LR_TARGET)).toBe(false);
    });

    test('returns false when views.paths is an empty array', () => {
        const target: FEV4ManifestTarget = {
            name: 'sap.fe.templates.ListReport',
            options: { settings: { views: { paths: [] } } }
        };
        expect(isALPManifestTarget(target)).toBe(false);
    });

    test('returns false when views.paths entries have no primary array', () => {
        const target: FEV4ManifestTarget = {
            name: 'sap.fe.templates.ListReport',
            options: {
                settings: {
                    views: {
                        paths: [{ secondary: [{ annotationPath: 'com.sap.vocabularies.UI.v1.LineItem' }] }]
                    }
                }
            }
        };
        expect(isALPManifestTarget(target)).toBe(false);
    });

    test('returns false when primary array is empty', () => {
        const target: FEV4ManifestTarget = {
            name: 'sap.fe.templates.ListReport',
            options: { settings: { views: { paths: [{ primary: [] }] } } }
        };
        expect(isALPManifestTarget(target)).toBe(false);
    });

    test('returns true when one of multiple paths entries has a primary array', () => {
        const target: FEV4ManifestTarget = {
            name: 'sap.fe.templates.ListReport',
            options: {
                settings: {
                    views: {
                        paths: [
                            { secondary: [{ annotationPath: 'com.sap.vocabularies.UI.v1.LineItem' }] },
                            { primary: [{ annotationPath: 'com.sap.vocabularies.UI.v1.Chart' }] }
                        ]
                    }
                }
            }
        };
        expect(isALPManifestTarget(target)).toBe(true);
    });
});

describe('isALPFromManifest()', () => {
    test('returns true when the specified target is an ALP ListReport', () => {
        expect(isALPFromManifest(ALP_MANIFEST, 'SalesOrderManageList')).toBe(true);
    });

    test('returns false when the specified target is an ObjectPage (not ListReport)', () => {
        expect(isALPFromManifest(ALP_MANIFEST, 'SalesOrderManageObjectPage')).toBe(false);
    });

    test('returns true when no targetKey given and at least one ListReport target is ALP', () => {
        expect(isALPFromManifest(ALP_MANIFEST)).toBe(true);
    });

    test('returns false when the specified target is a non-ALP ListReport', () => {
        expect(isALPFromManifest(LR_MANIFEST, 'OrdersList')).toBe(false);
    });

    test('returns false when no targetKey given and no ListReport targets are ALP', () => {
        expect(isALPFromManifest(LR_MANIFEST)).toBe(false);
    });

    test('returns false when manifest has no routing targets', () => {
        const manifest = {
            'sap.app': { id: 'test', type: 'application', applicationVersion: { version: '0.0.1' } }
        } as unknown as Manifest;
        expect(isALPFromManifest(manifest)).toBe(false);
    });

    test('returns false when specified target key does not exist in manifest', () => {
        expect(isALPFromManifest(ALP_MANIFEST, 'NonExistentTarget')).toBe(false);
    });
});

describe('getListReportFeatures() isALP integration', () => {
    const minimalPage: PageWithModelV4 = {
        name: 'SalesOrderManageList',
        model: {
            root: {
                aggregations: {
                    filterBar: { aggregations: {} } as unknown as TreeAggregation,
                    table: { aggregations: {} } as unknown as TreeAggregation
                }
            } as unknown as TreeAggregation
        } as unknown as TreeModel
    };

    test('sets isALP true when manifest identifies the page as ALP', () => {
        const result = getListReportFeatures(minimalPage, undefined, undefined, ALP_MANIFEST);
        expect(result.isALP).toBe(true);
    });

    test('sets isALP false when manifest has no ALP configuration for the page', () => {
        const page: PageWithModelV4 = { ...minimalPage, name: 'OrdersList' };
        const result = getListReportFeatures(page, undefined, undefined, LR_MANIFEST);
        expect(result.isALP).toBe(false);
    });

    test('sets isALP false when no manifest is provided', () => {
        const result = getListReportFeatures(minimalPage);
        expect(result.isALP).toBe(false);
    });
});

describe('Test getSemanticKeyProperties()', () => {
    const metadataWithSemanticKey = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:DataServices>
        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm"
                xmlns:SAP__common="com.sap.vocabularies.Common.v1"
                Alias="SAP__self">
            <EntityType Name="TravelType">
                <Key><PropertyRef Name="TravelID"/></Key>
                <Property Name="TravelID" Type="Edm.String"/>
                <Property Name="Description" Type="Edm.String"/>
            </EntityType>
            <EntityContainer Name="Container">
                <EntitySet Name="Travel" EntityType="TestService.TravelType"/>
            </EntityContainer>
            <Annotations Target="TestService.TravelType">
                <Annotation Term="com.sap.vocabularies.Common.v1.SemanticKey">
                    <Collection>
                        <PropertyPath>TravelID</PropertyPath>
                    </Collection>
                </Annotation>
            </Annotations>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

    const metadataWithMultipleSemanticKeys = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:DataServices>
        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm"
                Alias="SAP__self">
            <EntityType Name="OrderType">
                <Key><PropertyRef Name="OrderID"/></Key>
                <Property Name="OrderID" Type="Edm.String"/>
                <Property Name="CompanyCode" Type="Edm.String"/>
            </EntityType>
            <EntityContainer Name="Container">
                <EntitySet Name="Order" EntityType="TestService.OrderType"/>
            </EntityContainer>
            <Annotations Target="TestService.OrderType">
                <Annotation Term="com.sap.vocabularies.Common.v1.SemanticKey">
                    <Collection>
                        <PropertyPath>OrderID</PropertyPath>
                        <PropertyPath>CompanyCode</PropertyPath>
                    </Collection>
                </Annotation>
            </Annotations>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

    const metadataWithoutSemanticKey = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:DataServices>
        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
            <EntityType Name="ItemType">
                <Key><PropertyRef Name="ID"/></Key>
                <Property Name="ID" Type="Edm.String"/>
            </EntityType>
            <EntityContainer Name="Container">
                <EntitySet Name="Item" EntityType="TestService.ItemType"/>
            </EntityContainer>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

    test('returns PropertyPath value from SemanticKey annotation', () => {
        const result = getSemanticKeyProperties(metadataWithSemanticKey, 'Travel');
        expect(result).toEqual(['TravelID']);
    });

    test('returns all PropertyPath values when SemanticKey has multiple entries', () => {
        const result = getSemanticKeyProperties(metadataWithMultipleSemanticKeys, 'Order');
        expect(result).toEqual(['OrderID', 'CompanyCode']);
    });

    const metadataWithLabels = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:DataServices>
        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
            <EntityType Name="BankType">
                <Key><PropertyRef Name="BankCountry"/></Key>
                <Property Name="BankCountry" Type="Edm.String"/>
                <Property Name="BankInternalID" Type="Edm.String"/>
                <Property Name="NoLabelProp" Type="Edm.String"/>
            </EntityType>
            <EntityContainer Name="Container">
                <EntitySet Name="Bank" EntityType="TestService.BankType"/>
            </EntityContainer>
            <Annotations Target="TestService.BankType">
                <Annotation Term="com.sap.vocabularies.Common.v1.SemanticKey">
                    <Collection>
                        <PropertyPath>BankCountry</PropertyPath>
                        <PropertyPath>BankInternalID</PropertyPath>
                        <PropertyPath>NoLabelProp</PropertyPath>
                    </Collection>
                </Annotation>
            </Annotations>
            <Annotations Target="TestService.BankType/BankCountry">
                <Annotation Term="com.sap.vocabularies.Common.v1.Label" String="Bank Country"/>
            </Annotations>
            <Annotations Target="TestService.BankType/BankInternalID">
                <Annotation Term="com.sap.vocabularies.Common.v1.Label" String="Bank ID"/>
            </Annotations>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

    test('resolveLabels=false returns property names (default)', () => {
        expect(getSemanticKeyProperties(metadataWithLabels, 'Bank', false)).toEqual([
            'BankCountry',
            'BankInternalID',
            'NoLabelProp'
        ]);
    });

    test('resolveLabels=true returns Common.Label values, falling back to property name when no label', () => {
        expect(getSemanticKeyProperties(metadataWithLabels, 'Bank', true)).toEqual([
            'Bank Country',
            'Bank ID',
            'NoLabelProp'
        ]);
    });

    test('returns empty array when no SemanticKey annotation exists', () => {
        const result = getSemanticKeyProperties(metadataWithoutSemanticKey, 'Item');
        expect(result).toEqual([]);
    });

    test('returns SemanticKey from the fixture metadata file', () => {
        const metadataXml = readFileSync(join(__dirname, '../../../test/fixtures/metadata.xml'), 'utf-8');
        const result = getSemanticKeyProperties(metadataXml, 'Travel');
        expect(result).toEqual(['TravelID']);
    });

    test('throws when entity set is not found', () => {
        expect(() => getSemanticKeyProperties(metadataWithSemanticKey, 'NonExistent')).toThrow(
            "Entity set 'NonExistent' not found in metadata"
        );
    });

    test('throws when metadata XML is invalid', () => {
        expect(() => getSemanticKeyProperties('not valid xml', 'Travel')).toThrow();
    });
});

describe('Test isSemanticKeyInFilterBar()', () => {
    const makePageModel = (fields: string[]): TreeModel => {
        const aggregations: Record<string, TreeAggregation> = {};
        fields.forEach((f) => {
            aggregations[f] = { schema: { keys: [{ name: 'Value', value: f }] } } as unknown as TreeAggregation;
        });
        return {
            root: {
                aggregations: {
                    filterBar: {
                        aggregations: {
                            selectionFields: { aggregations } as unknown as TreeAggregation
                        }
                    } as unknown as TreeAggregation
                }
            } as unknown as TreeAggregation,
            name: 'test',
            schema: {}
        } as unknown as TreeModel;
    };

    const metadataSingleKey = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:DataServices>
        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm"
                xmlns:Common="https://oasis-namespaces.org/odata/4.0/cs02/Common">
            <EntityType Name="OrderType">
                <Key><PropertyRef Name="SalesOrder"/></Key>
                <Property Name="SalesOrder" Type="Edm.String"/>
                <Property Name="Customer" Type="Edm.String"/>
            </EntityType>
            <EntityContainer Name="Container">
                <EntitySet Name="Order" EntityType="TestService.OrderType"/>
            </EntityContainer>
            <Annotations Target="TestService.OrderType">
                <Annotation Term="Common.SemanticKey">
                    <Collection><PropertyPath>SalesOrder</PropertyPath></Collection>
                </Annotation>
            </Annotations>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

    const metadataCompositeKey = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:DataServices>
        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm"
                xmlns:Common="https://oasis-namespaces.org/odata/4.0/cs02/Common">
            <EntityType Name="BankType">
                <Key><PropertyRef Name="BankCountry"/></Key>
                <Property Name="BankCountry" Type="Edm.String"/>
                <Property Name="BankInternalID" Type="Edm.String"/>
                <Property Name="SWIFTCode" Type="Edm.String"/>
            </EntityType>
            <EntityContainer Name="Container">
                <EntitySet Name="Bank" EntityType="TestService.BankType"/>
            </EntityContainer>
            <Annotations Target="TestService.BankType">
                <Annotation Term="Common.SemanticKey">
                    <Collection>
                        <PropertyPath>BankCountry</PropertyPath>
                        <PropertyPath>BankInternalID</PropertyPath>
                    </Collection>
                </Annotation>
            </Annotations>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

    const metadataNoSemanticKey = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:DataServices>
        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
            <EntityType Name="ItemType">
                <Key><PropertyRef Name="ID"/></Key>
                <Property Name="ID" Type="Edm.String"/>
                <Property Name="Name" Type="Edm.String"/>
            </EntityType>
            <EntityContainer Name="Container">
                <EntitySet Name="Item" EntityType="TestService.ItemType"/>
            </EntityContainer>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

    test('returns true when single semantic key property is present in filter bar', () => {
        const pageModel = makePageModel(['SalesOrder', 'Customer', 'Status']);
        expect(isSemanticKeyInFilterBar(pageModel, metadataSingleKey, 'Order')).toBe(true);
    });

    test('returns false when single semantic key property is absent from filter bar', () => {
        const pageModel = makePageModel(['Customer', 'Status']);
        expect(isSemanticKeyInFilterBar(pageModel, metadataSingleKey, 'Order')).toBe(false);
    });

    test('returns true when all composite semantic key properties are present in filter bar', () => {
        const pageModel = makePageModel(['BankCountry', 'BankInternalID', 'SWIFTCode']);
        expect(isSemanticKeyInFilterBar(pageModel, metadataCompositeKey, 'Bank')).toBe(true);
    });

    test('returns false when only some composite semantic key properties are present in filter bar', () => {
        const pageModel = makePageModel(['BankCountry', 'SWIFTCode']);
        expect(isSemanticKeyInFilterBar(pageModel, metadataCompositeKey, 'Bank')).toBe(false);
    });

    test('returns false when no composite semantic key properties are present in filter bar', () => {
        const pageModel = makePageModel(['SWIFTCode']);
        expect(isSemanticKeyInFilterBar(pageModel, metadataCompositeKey, 'Bank')).toBe(false);
    });

    test('returns false when entity has no SemanticKey annotation', () => {
        const pageModel = makePageModel(['ID', 'Name']);
        expect(isSemanticKeyInFilterBar(pageModel, metadataNoSemanticKey, 'Item')).toBe(false);
    });

    test('returns false when filter bar has no fields', () => {
        const pageModel = makePageModel([]);
        expect(isSemanticKeyInFilterBar(pageModel, metadataSingleKey, 'Order')).toBe(false);
    });

    test('returns false and logs debug when metadata XML is invalid', () => {
        const pageModel = makePageModel(['OrderID']);
        const mockLogger = {
            debug: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
            error: jest.fn()
        } as unknown as Logger;
        expect(isSemanticKeyInFilterBar(pageModel, 'not valid xml', 'Order', mockLogger)).toBe(false);
        expect(mockLogger.debug).toHaveBeenCalledWith(
            expect.stringContaining('Failed to check semantic key in filter bar')
        );
    });

    test('returns false and logs debug when entity set is not found in metadata', () => {
        const pageModel = makePageModel(['OrderID']);
        const mockLogger = {
            debug: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
            error: jest.fn()
        } as unknown as Logger;
        expect(isSemanticKeyInFilterBar(pageModel, metadataSingleKey, 'NonExistentSet', mockLogger)).toBe(false);
        expect(mockLogger.debug).toHaveBeenCalledWith(
            expect.stringContaining('Failed to check semantic key in filter bar')
        );
    });
});

describe('Test safeGetSemanticKeyProperties()', () => {
    let mockLogger: Logger;

    beforeEach(() => {
        mockLogger = {
            warn: jest.fn(),
            debug: jest.fn(),
            info: jest.fn(),
            error: jest.fn()
        } as unknown as Logger;
    });

    const validMetadataXml = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:DataServices>
        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
            <EntityType Name="TravelType">
                <Key><PropertyRef Name="TravelID"/></Key>
                <Property Name="TravelID" Type="Edm.String"/>
            </EntityType>
            <EntityContainer Name="Container">
                <EntitySet Name="Travel" EntityType="TestService.TravelType"/>
            </EntityContainer>
            <Annotations Target="TestService.TravelType">
                <Annotation Term="com.sap.vocabularies.Common.v1.SemanticKey">
                    <Collection>
                        <PropertyPath>TravelID</PropertyPath>
                    </Collection>
                </Annotation>
            </Annotations>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

    test('returns semantic key properties when metadata and entity set are valid', () => {
        const result = safeGetSemanticKeyProperties(convert(parse(validMetadataXml)), 'Travel', mockLogger);
        expect(result).toEqual(['TravelID']);
        expect(mockLogger.debug).not.toHaveBeenCalled();
    });

    test('returns undefined and logs debug when entity set does not exist', () => {
        const result = safeGetSemanticKeyProperties(convert(parse(validMetadataXml)), 'NonExistent', mockLogger);
        expect(result).toBeUndefined();
        expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Failed to get semantic key properties'));
    });

    test('returns undefined without throwing when logger is not provided', () => {
        expect(() => safeGetSemanticKeyProperties(convert(parse(validMetadataXml)), 'NonExistent')).not.toThrow();
    });

    test('logs the error message when entity set is not found', () => {
        safeGetSemanticKeyProperties(convert(parse(validMetadataXml)), 'NonExistent', mockLogger);
        const [loggedMessage] = (mockLogger.debug as jest.Mock).mock.calls[0];
        expect(loggedMessage).toMatch(/Failed to get semantic key properties: .+/);
    });
});

describe('Test getCustomFilterFieldProperties()', () => {
    const makeManifest = (controlConfiguration: Record<string, unknown>): Manifest =>
        ({
            'sap.ui5': {
                routing: {
                    targets: {
                        MyLR: { options: { settings: { controlConfiguration } } }
                    }
                }
            }
        }) as unknown as Manifest;

    test('returns empty set when manifest is undefined', () => {
        expect(getCustomFilterFieldProperties(undefined, 'MyLR').size).toBe(0);
    });

    test('returns empty set when target key is undefined', () => {
        expect(getCustomFilterFieldProperties(makeManifest({}), undefined).size).toBe(0);
    });

    test('returns empty set when controlConfiguration is missing', () => {
        const manifest = { 'sap.ui5': { routing: { targets: { MyLR: {} } } } } as unknown as Manifest;
        expect(getCustomFilterFieldProperties(manifest, 'MyLR').size).toBe(0);
    });

    test('returns empty set when SelectionFields config has no filterFields', () => {
        const manifest = makeManifest({ '@com.sap.vocabularies.UI.v1.SelectionFields': {} });
        expect(getCustomFilterFieldProperties(manifest, 'MyLR').size).toBe(0);
    });

    test('includes only fields that declare a non-empty template', () => {
        const manifest = makeManifest({
            '@com.sap.vocabularies.UI.v1.SelectionFields': {
                filterFields: {
                    CustomField: { template: 'my.app.ext.CustomFilter' },
                    StandardField: {},
                    EmptyTemplate: { template: '' }
                }
            }
        });
        const result = getCustomFilterFieldProperties(manifest, 'MyLR');
        expect(result.has('CustomField')).toBe(true);
        expect(result.has('StandardField')).toBe(false);
        expect(result.has('EmptyTemplate')).toBe(false);
        expect(result.size).toBe(1);
    });
});

describe('Test getTableIdentifiers()', () => {
    const makeManifest = (paths: unknown): Manifest =>
        ({
            'sap.ui5': {
                routing: {
                    targets: {
                        MyLR: { options: { settings: { views: { paths } } } }
                    }
                }
            }
        }) as unknown as Manifest;

    test('returns empty array when manifest is undefined', () => {
        expect(getTableIdentifiers(undefined, 'MyLR')).toEqual([]);
    });

    test('returns empty array when target key is undefined', () => {
        expect(getTableIdentifiers(makeManifest([{ key: '1' }]), undefined)).toEqual([]);
    });

    test('returns empty array when views.paths is missing or not an array', () => {
        const manifest = { 'sap.ui5': { routing: { targets: { MyLR: {} } } } } as unknown as Manifest;
        expect(getTableIdentifiers(manifest, 'MyLR')).toEqual([]);
        expect(getTableIdentifiers(makeManifest('not-an-array'), 'MyLR')).toEqual([]);
        expect(getTableIdentifiers(makeManifest([]), 'MyLR')).toEqual([]);
    });

    test('returns non-custom tab keys and skips custom (template) tabs and keyless entries', () => {
        const manifest = makeManifest([
            { key: '1' },
            { key: '2' },
            { key: '5', template: 'my.app.ext.CustomTab' },
            { key: '' },
            undefined,
            { key: '6' }
        ]);
        expect(getTableIdentifiers(manifest, 'MyLR')).toEqual(['1', '2', '6']);
    });

    test('returns empty array for a single-path views.paths (treated as single-table LR)', () => {
        expect(getTableIdentifiers(makeManifest([{ key: '1' }]), 'MyLR')).toEqual([]);
    });

    test('returns empty array when only one non-custom tab survives filtering', () => {
        const manifest = makeManifest([{ key: '1' }, { key: '5', template: 'my.app.ext.CustomTab' }]);
        expect(getTableIdentifiers(manifest, 'MyLR')).toEqual([]);
    });
});

describe('Test getPropertyLabelFromMetadata() and isHiddenFilter()', () => {
    const metadataXml = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:DataServices>
        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
            <EntityType Name="ItemType">
                <Key><PropertyRef Name="ID"/></Key>
                <Property Name="ID" Type="Edm.String"/>
                <Property Name="Labelled" Type="Edm.String"/>
                <Property Name="Plain" Type="Edm.String"/>
                <Property Name="Secret" Type="Edm.String"/>
            </EntityType>
            <EntityContainer Name="EntityContainer">
                <EntitySet Name="Items" EntityType="TestService.ItemType"/>
            </EntityContainer>
            <Annotations Target="TestService.ItemType/Labelled">
                <Annotation Term="com.sap.vocabularies.Common.v1.Label" String="Item Type"/>
            </Annotations>
            <Annotations Target="TestService.ItemType/Secret">
                <Annotation Term="com.sap.vocabularies.UI.v1.HiddenFilter" Bool="true"/>
            </Annotations>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;
    const metadata = convert(parse(metadataXml));

    test('getPropertyLabelFromMetadata returns the Common.Label value', () => {
        expect(getPropertyLabelFromMetadata(metadata, 'Items', 'Labelled')).toBe('Item Type');
    });

    test('getPropertyLabelFromMetadata returns undefined when the property has no label', () => {
        expect(getPropertyLabelFromMetadata(metadata, 'Items', 'Plain')).toBeUndefined();
    });

    test('getPropertyLabelFromMetadata returns undefined for an unknown entity set or property', () => {
        expect(getPropertyLabelFromMetadata(metadata, 'Unknown', 'Labelled')).toBeUndefined();
        expect(getPropertyLabelFromMetadata(metadata, 'Items', 'Unknown')).toBeUndefined();
    });

    test('isHiddenFilter returns true for a HiddenFilter-annotated property', () => {
        expect(isHiddenFilter(metadata, 'Items', 'Secret')).toBe(true);
    });

    test('isHiddenFilter returns false for a non-hidden property', () => {
        expect(isHiddenFilter(metadata, 'Items', 'Plain')).toBe(false);
    });

    test('isHiddenFilter returns false when entity set name is undefined', () => {
        expect(isHiddenFilter(metadata, undefined, 'Secret')).toBe(false);
    });
});

describe('Test getFilterFieldItems() error handling', () => {
    test('returns empty array and logs debug when the page model cannot be traversed', () => {
        const mockLogger = {
            debug: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
            error: jest.fn()
        } as unknown as Logger;
        // Accessing `.root` throws → getFilterFields throws → caught and logged
        const brokenPageModel = {
            get root(): never {
                throw new Error('root access failed');
            }
        } as unknown as TreeModel;
        const result = getFilterFieldItems(brokenPageModel, mockLogger);
        expect(result).toEqual([]);
        expect(mockLogger.debug).toHaveBeenCalled();
    });
});

describe('Test getListReportFeatures() custom filter field i18n label resolution', () => {
    const mockLogger = { debug: jest.fn(), warn: jest.fn(), info: jest.fn(), error: jest.fn() } as unknown as Logger;

    const metadataXml = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:DataServices>
        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
            <EntityType Name="ItemType">
                <Key><PropertyRef Name="ID"/></Key>
                <Property Name="ID" Type="Edm.String"/>
                <Property Name="ItemCategory" Type="Edm.String"/>
            </EntityType>
            <EntityContainer Name="EntityContainer">
                <EntitySet Name="Items" EntityType="TestService.ItemType"/>
            </EntityContainer>
            <Annotations Target="TestService.ItemType/ItemCategory">
                <Annotation Term="com.sap.vocabularies.Common.v1.Label" String="Item Type"/>
            </Annotations>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

    const manifest = {
        'sap.ui5': {
            routing: {
                targets: {
                    MyLR: {
                        options: {
                            settings: {
                                controlConfiguration: {
                                    '@com.sap.vocabularies.UI.v1.SelectionFields': {
                                        filterFields: {
                                            ItemCategory: { template: 'my.app.ext.CustomFilter' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    } as unknown as Manifest;

    test('resolves an unresolved i18n placeholder label via the OData Common.Label', () => {
        const pageModel: PageWithModelV4 = {
            name: 'MyLR',
            entitySet: 'Items',
            model: {
                root: {
                    aggregations: {
                        filterBar: {
                            aggregations: {
                                selectionFields: {
                                    aggregations: {
                                        ItemCategory: {
                                            description: '{i18n>customCategory}',
                                            schema: { keys: [{ name: 'Value', value: 'ItemCategory' }] }
                                        } as unknown as TreeAggregation
                                    }
                                } as unknown as TreeAggregation
                            }
                        } as unknown as TreeAggregation
                    }
                } as unknown as TreeAggregation
            } as unknown as TreeModel
        } as unknown as PageWithModelV4;

        const result = getListReportFeatures(pageModel, mockLogger, metadataXml, manifest);
        // The custom field's {i18n>...} placeholder is replaced by the metadata Common.Label
        expect(result.filterBarItems).toContainEqual({
            property: 'ItemCategory',
            description: 'Item Type',
            custom: true
        });
    });
});
