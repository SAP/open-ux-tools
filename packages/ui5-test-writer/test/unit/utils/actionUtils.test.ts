import type { Action, ActionParameter, ConvertedMetadata } from '@sap-ux/vocabularies-types';
import type { DataFieldForAction } from '@sap-ux/vocabularies-types/vocabularies/UI';
import { parse } from '@sap-ux/edmx-parser';
import { convert } from '@sap-ux/annotation-converter';
import type { Logger } from '@sap-ux/logger';
import {
    extractActionMethodName,
    findOperationAvailableAnnotation,
    analyzeOperationAvailability,
    extractEnumMemberValue,
    buildActionButtonState,
    buildActionStateFromSpecModelKey,
    checkEditVisibilityFromMetadata,
    safeCheckEditVisibilityFromMetadata
} from '../../../src/utils/actionUtils';

describe('extractActionMethodName()', () => {
    test('extracts method name from fully qualified action with parentheses', () => {
        expect(extractActionMethodName('TestService.doSomething(TestService.Entity)')).toBe('doSomething');
    });

    test('extracts method name from multi-segment namespace with parentheses', () => {
        expect(extractActionMethodName('com.sap.gateway.srvd.Activate(com.sap.EntityType)')).toBe('Activate');
    });

    test('extracts method name from namespace-qualified name without parentheses', () => {
        expect(extractActionMethodName('com.sap.gateway.srvd.dmo.sd_travel.Approve')).toBe('Approve');
    });

    test('returns the input when there are no dots or parentheses', () => {
        expect(extractActionMethodName('SimpleAction')).toBe('SimpleAction');
    });

    test('returns empty string for empty input', () => {
        expect(extractActionMethodName('')).toBe('');
    });

    test('handles action with Collection() binding parameter', () => {
        expect(extractActionMethodName('TestService.MassProcess(Collection(TestService.Entity))')).toBe('MassProcess');
    });

    test('handles edge case where dot appears after opening paren via fallback', () => {
        // Regex won't match if the segment between last dot and paren contains a dot,
        // but the second branch (lastDotIndex + parenIndex) handles it
        expect(extractActionMethodName('ns.Method(ns.Param)')).toBe('Method');
    });
});

describe('findOperationAvailableAnnotation()', () => {
    test('returns undefined when metadata has no actions and no entityContainer', () => {
        const metadata = { entitySets: [], actions: [] } as unknown as ConvertedMetadata;
        expect(findOperationAvailableAnnotation(metadata, 'DoSomething')).toBeUndefined();
    });

    test('finds annotation from metadata.actions by action name', () => {
        const metadata = {
            entitySets: [],
            actions: [
                {
                    name: 'Approve',
                    fullyQualifiedName: 'TestService.Approve(TestService.Order)',
                    annotations: {
                        Core: { OperationAvailable: true }
                    }
                }
            ]
        } as unknown as ConvertedMetadata;
        expect(findOperationAvailableAnnotation(metadata, 'Approve')).toBe(true);
    });

    test('finds annotation from metadata.actions by fullyQualifiedName match', () => {
        const metadata = {
            entitySets: [],
            actions: [
                {
                    name: 'SomeOtherName',
                    fullyQualifiedName: 'TestService.Activate(TestService.Order)',
                    annotations: {
                        Core: { OperationAvailable: false }
                    }
                }
            ]
        } as unknown as ConvertedMetadata;
        expect(findOperationAvailableAnnotation(metadata, 'Activate')).toBe(false);
    });

    test('finds annotation from entityContainer annotations', () => {
        const metadata = {
            entitySets: [],
            actions: [],
            entityContainer: {
                annotations: {
                    'TestService.Approve': {
                        Core: { OperationAvailable: { $Path: 'IsActive' } }
                    }
                }
            }
        } as unknown as ConvertedMetadata;
        const result = findOperationAvailableAnnotation(metadata, 'Approve');
        expect(result).toEqual({ $Path: 'IsActive' });
    });

    test('returns undefined when action exists but has no OperationAvailable', () => {
        const metadata = {
            entitySets: [],
            actions: [
                {
                    name: 'Approve',
                    fullyQualifiedName: 'TestService.Approve(TestService.Order)',
                    annotations: { Core: {} }
                }
            ]
        } as unknown as ConvertedMetadata;
        expect(findOperationAvailableAnnotation(metadata, 'Approve')).toBeUndefined();
    });

    test('returns undefined when no matching action or container key exists', () => {
        const metadata = {
            entitySets: [],
            actions: [{ name: 'Other', annotations: { Core: { OperationAvailable: true } } }],
            entityContainer: {
                annotations: { 'TestService.Other': { Core: { OperationAvailable: true } } }
            }
        } as unknown as ConvertedMetadata;
        expect(findOperationAvailableAnnotation(metadata, 'NonExistent')).toBeUndefined();
    });
});

describe('analyzeOperationAvailability()', () => {
    test('returns enabled=true when undefined and not entity-bound', () => {
        expect(analyzeOperationAvailability(undefined, false)).toEqual({ enabled: true });
    });

    test('returns enabled=false when undefined and entity-bound', () => {
        expect(analyzeOperationAvailability(undefined, true)).toEqual({ enabled: false });
    });

    test('returns enabled=true when undefined and isEntityBound not provided', () => {
        expect(analyzeOperationAvailability(undefined)).toEqual({ enabled: true });
    });

    test('returns the boolean value when operationAvailable is true', () => {
        expect(analyzeOperationAvailability(true as unknown as any)).toEqual({ enabled: true });
    });

    test('returns the boolean value when operationAvailable is false', () => {
        expect(analyzeOperationAvailability(false as unknown as any)).toEqual({ enabled: false });
    });

    test('returns dynamic with $Path when object has $Path', () => {
        const opAvail = { $Path: 'IsApproved' } as any;
        expect(analyzeOperationAvailability(opAvail)).toEqual({ enabled: 'dynamic', dynamicPath: 'IsApproved' });
    });

    test('returns dynamic with path when object has path property', () => {
        const opAvail = { path: 'IsActive' } as any;
        expect(analyzeOperationAvailability(opAvail)).toEqual({ enabled: 'dynamic', dynamicPath: 'IsActive' });
    });

    test('prefers $Path over path when both present', () => {
        const opAvail = { $Path: 'Primary', path: 'Secondary' } as any;
        expect(analyzeOperationAvailability(opAvail)).toEqual({ enabled: 'dynamic', dynamicPath: 'Primary' });
    });

    test('returns enabled=true for object without $Path or path', () => {
        const opAvail = { someOtherProp: 'value' } as any;
        expect(analyzeOperationAvailability(opAvail)).toEqual({ enabled: true });
    });
});

describe('extractEnumMemberValue()', () => {
    test('returns string value directly when input is a string', () => {
        expect(extractEnumMemberValue('Isolated')).toBe('Isolated');
    });

    test('extracts value after slash from $EnumMember', () => {
        expect(extractEnumMemberValue({ $EnumMember: 'UI.OperationGroupingType/Isolated' })).toBe('Isolated');
    });

    test('returns full $EnumMember when no slash present', () => {
        expect(extractEnumMemberValue({ $EnumMember: 'ChangeSet' })).toBe('ChangeSet');
    });

    test('returns undefined for undefined input', () => {
        expect(extractEnumMemberValue(undefined)).toBeUndefined();
    });

    test('returns undefined for object without $EnumMember', () => {
        expect(extractEnumMemberValue({ otherProp: 'value' })).toBeUndefined();
    });

    test('returns undefined for null input', () => {
        expect(extractEnumMemberValue(null)).toBeUndefined();
    });
});

describe('buildActionButtonState()', () => {
    const minimalMetadata = {
        entitySets: [],
        actions: []
    } as unknown as ConvertedMetadata;

    test('builds state for a simple unbound action', () => {
        const item = {
            Action: 'TestService.Check',
            Label: 'Check Order',
            ActionTarget: undefined
        } as unknown as DataFieldForAction;

        const result = buildActionButtonState(item, minimalMetadata);
        expect(result.label).toBe('Check Order');
        expect(result.action).toBe('TestService.Check');
        expect(result.visible).toBe(true);
        expect(result.enabled).toBe(true);
    });

    test('builds state for entity-bound action (disabled by default)', () => {
        const item = {
            Action: 'TestService.Approve(TestService.Order)',
            Label: 'Approve',
            ActionTarget: {
                isBound: true,
                parameters: [{ isCollection: false }]
            }
        } as unknown as DataFieldForAction;

        const result = buildActionButtonState(item, minimalMetadata);
        expect(result.enabled).toBe(false);
    });

    test('builds state for collection-bound action (enabled by default)', () => {
        const item = {
            Action: 'TestService.MassApprove(Collection(TestService.Order))',
            Label: 'Mass Approve',
            ActionTarget: {
                isBound: true,
                parameters: [{ isCollection: true }]
            }
        } as unknown as DataFieldForAction;

        const result = buildActionButtonState(item, minimalMetadata);
        expect(result.enabled).toBe(true);
    });

    test('includes invocationGrouping when present', () => {
        const item = {
            Action: 'TestService.Process',
            Label: 'Process',
            ActionTarget: undefined,
            InvocationGrouping: { $EnumMember: 'UI.OperationGroupingType/ChangeSet' }
        } as unknown as DataFieldForAction;

        const result = buildActionButtonState(item, minimalMetadata);
        expect(result.invocationGrouping).toBe('ChangeSet');
    });

    test('handles missing Label and Action gracefully', () => {
        const item = {
            Action: undefined,
            Label: undefined,
            ActionTarget: undefined
        } as unknown as DataFieldForAction;

        const result = buildActionButtonState(item, minimalMetadata);
        expect(result.label).toBe('');
        expect(result.action).toBe('');
    });
});

describe('buildActionStateFromSpecModelKey()', () => {
    const minimalMetadata = {
        entitySets: [],
        actions: [],
        namespace: 'TestService'
    } as unknown as ConvertedMetadata;

    test('returns undefined for non-DataFieldForAction keys', () => {
        expect(
            buildActionStateFromSpecModelKey('DataFieldForAnnotation::Test', 'Test', minimalMetadata, 'ns')
        ).toBeUndefined();
    });

    test('returns undefined when key has no action part', () => {
        expect(buildActionStateFromSpecModelKey('DataFieldForAction::', 'Test', minimalMetadata, 'ns')).toBeUndefined();
    });

    test('builds state for a bound action found in metadata', () => {
        const metadata = {
            entitySets: [],
            actions: [
                {
                    name: 'Approve',
                    fullyQualifiedName: 'TestService.Approve(TestService.Order)',
                    isBound: true,
                    parameters: [{ isCollection: false }],
                    annotations: { Core: {} }
                }
            ]
        } as unknown as ConvertedMetadata;

        const result = buildActionStateFromSpecModelKey(
            'DataFieldForAction::TestService.Approve::TestService.OrderType',
            'Approve Order',
            metadata,
            'TestService'
        );

        expect(result).toEqual({
            label: 'Approve Order',
            action: 'Approve',
            service: 'TestService',
            unbound: false,
            visible: true,
            enabled: false,
            dynamicPath: undefined
        });
    });

    test('builds state for an unbound action (not found in metadata)', () => {
        const result = buildActionStateFromSpecModelKey(
            'DataFieldForAction::TestService.Create::TestService.OrderType',
            'Create',
            minimalMetadata,
            'TestService'
        );

        expect(result).toEqual({
            label: 'Create',
            action: 'Create',
            service: 'TestService',
            unbound: true,
            visible: true,
            enabled: true,
            dynamicPath: undefined
        });
    });

    test('uses empty string for label when undefined', () => {
        const result = buildActionStateFromSpecModelKey(
            'DataFieldForAction::TestService.DoIt::TestService.OrderType',
            undefined,
            minimalMetadata,
            'TestService'
        );
        expect(result?.label).toBe('');
    });

    test('resolves OperationAvailable with dynamic path', () => {
        const metadata = {
            entitySets: [],
            actions: [
                {
                    name: 'Activate',
                    fullyQualifiedName: 'TestService.Activate(TestService.Order)',
                    isBound: true,
                    parameters: [{ isCollection: false }],
                    annotations: { Core: { OperationAvailable: { $Path: 'IsReady' } } }
                }
            ]
        } as unknown as ConvertedMetadata;

        const result = buildActionStateFromSpecModelKey(
            'DataFieldForAction::TestService.Activate::TestService.OrderType',
            'Activate',
            metadata,
            'TestService'
        );

        expect(result).toEqual({
            label: 'Activate',
            action: 'Activate',
            service: 'TestService',
            unbound: false,
            visible: true,
            enabled: 'dynamic',
            dynamicPath: 'IsReady'
        });
    });
});

describe('checkEditVisibilityFromMetadata()', () => {
    const baseMetadataXml = (annotations = ''): string => `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
    <edmx:DataServices>
        <Schema Namespace="TestService" xmlns="http://docs.oasis-open.org/odata/ns/edm">
            <EntityType Name="TestEntity">
                <Key><PropertyRef Name="ID"/></Key>
                <Property Name="ID" Type="Edm.String"/>
            </EntityType>
            <EntityContainer Name="EntityContainer">
                <EntitySet Name="TestSet" EntityType="TestService.TestEntity"/>
            </EntityContainer>${annotations}
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

    test('returns default visible/enabled when no UpdateRestrictions are present', () => {
        const metadata = convert(parse(baseMetadataXml()));
        const result = checkEditVisibilityFromMetadata(metadata, 'TestSet');
        expect(result).toEqual({ visible: true, enabled: true });
    });

    test('honours UpdateRestrictions Updatable=false', () => {
        const metadata = convert(
            parse(
                baseMetadataXml(`
            <Annotations Target="TestService.EntityContainer/TestSet">
                <Annotation Term="Org.OData.Capabilities.V1.UpdateRestrictions">
                    <Record>
                        <PropertyValue Property="Updatable" Bool="false"/>
                    </Record>
                </Annotation>
            </Annotations>`)
            )
        );
        const result = checkEditVisibilityFromMetadata(metadata, 'TestSet');
        expect(result.visible).toBe(false);
        expect(result.enabled).toBe(false);
    });

    test('returns dynamic state with the path when Updatable is path-based', () => {
        const metadata = convert(
            parse(
                baseMetadataXml(`
            <Annotations Target="TestService.EntityContainer/TestSet">
                <Annotation Term="Org.OData.Capabilities.V1.UpdateRestrictions">
                    <Record>
                        <PropertyValue Property="Updatable" Path="_it/__EntityControl/Updatable"/>
                    </Record>
                </Annotation>
            </Annotations>`)
            )
        );
        const result = checkEditVisibilityFromMetadata(metadata, 'TestSet');
        expect(result.enabled).toBe('dynamic');
        expect(result.dynamicPath).toBe('_it/__EntityControl/Updatable');
    });

    test('throws when entity set does not exist', () => {
        const metadata = convert(parse(baseMetadataXml()));
        expect(() => checkEditVisibilityFromMetadata(metadata, 'MissingSet')).toThrow(
            "Entity set 'MissingSet' not found in metadata"
        );
    });
});

describe('safeCheckEditVisibilityFromMetadata()', () => {
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
                <Key><PropertyRef Name="ID"/></Key>
                <Property Name="ID" Type="Edm.String"/>
            </EntityType>
            <EntityContainer Name="EntityContainer">
                <EntitySet Name="TestSet" EntityType="TestService.TestEntity"/>
            </EntityContainer>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>`;

    test('returns ButtonState when entity set is valid', () => {
        const metadata = convert(parse(validMetadataXml));
        const result = safeCheckEditVisibilityFromMetadata(metadata, 'TestSet', mockLogger);
        expect(result).toEqual({ visible: true, enabled: true });
        expect(mockLogger.debug).not.toHaveBeenCalled();
    });

    test('returns undefined and logs debug when entity set is missing', () => {
        const metadata = convert(parse(validMetadataXml));
        const result = safeCheckEditVisibilityFromMetadata(metadata, 'MissingSet', mockLogger);
        expect(result).toBeUndefined();
        expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Failed to check edit visibility'));
    });

    test('returns undefined when metadata structure is malformed and tolerates missing logger', () => {
        const result = safeCheckEditVisibilityFromMetadata({} as ConvertedMetadata, 'TestSet');
        expect(result).toBeUndefined();
    });
});
