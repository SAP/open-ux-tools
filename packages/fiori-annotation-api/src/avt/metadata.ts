import type {
    RawSchema,
    RawEntityContainer,
    RawEntitySet,
    RawEntityType,
    RawComplexType,
    RawAction,
    RawProperty,
    RawV4NavigationProperty,
    AnnotationList,
    ActionParameter,
    RawSingleton,
    RawActionImport
} from '@sap-ux/vocabularies-types';
import type { MetadataService } from '@sap-ux/odata-entity-model';
import type { MetadataElement } from '@sap-ux/odata-annotation-core-types';

/**
 *
 */
class MetadataConverter {
    entityTypes: RawEntityType[] = [];
    complexTypes: RawComplexType[] = [];
    entitySets: RawEntitySet[] = [];
    actions: RawAction[] = [];
    actionImports: RawActionImport[] = [];
    entityContainer: RawEntityContainer = {
        _type: 'EntityContainer',
        fullyQualifiedName: ''
    };
    singletons: RawSingleton[] = [];

    /**
     *
     * @param metadataService - Metadata service instance.
     */
    constructor(private metadataService: MetadataService) {}

    /**
     * @returns AVT schema.
     */
    convert(): RawSchema {
        const rootLevelElements = this.metadataService.getRootMetadataElements();
        // Schema representation includes entityTypes, entitySets, associations (not supported here), a single entityContainer and actions
        // collect these objects based on the (multiple) EdmTargetKinds of each metadata element
        for (const [elementKey, element] of rootLevelElements) {
            this.convertAction(element.targetKinds, element);
            this.convertComplexType(element.targetKinds, element, elementKey);
            this.convertEntityType(element.targetKinds, element, elementKey);
            this.convertEntityContainer(element.targetKinds, element, elementKey);
        }

        const [namespace] = [...this.metadataService.getNamespaces()];
        if (this.entityContainer.fullyQualifiedName && namespace) {
            // for CDS no entity container is present: build dummy entity container
            const entityContainerName = 'EntityContainer';
            this.entityContainer = {
                _type: 'EntityContainer',
                name: entityContainerName,
                fullyQualifiedName: namespace ? `${namespace}.${entityContainerName}` : entityContainerName
            };
        }
        const annotations: Record<string, AnnotationList[]> = {};
        return {
            namespace,
            annotations,
            entitySets: this.entitySets,
            complexTypes: this.complexTypes,
            entityContainer: this.entityContainer,
            actions: this.actions,
            entityTypes: this.entityTypes,
            actionImports: this.actionImports,
            associations: [],
            singletons: this.singletons,
            associationSets: [],
            typeDefinitions: []
        };
    }
    private convertAction(targetKinds: string[], element: MetadataElement): void {
        if (!['Action', 'Function'].some((item) => targetKinds.includes(item))) {
            return;
        }
        // see AVT parseActions()
        const action: RawAction = {
            _type: 'Action',
            name: element.name,
            fullyQualifiedName: element.path,
            parameters: [],
            isBound: false,
            sourceType: '', // not available here
            returnType: '',
            isFunction: element.kind === 'Function' || element.kind === 'function'
        };
        for (const subElement of element.content ?? []) {
            const subElementTargetKinds = this.metadataService.getEdmTargetKinds(subElement.path);
            if (isReturnParameter(subElementTargetKinds, subElement)) {
                action.returnType = subElement.structuredType ?? subElement.edmPrimitiveType ?? '';
            } else if (subElementTargetKinds.includes('Parameter')) {
                const parameter: ActionParameter = {
                    _type: 'ActionParameter',
                    isCollection: subElementTargetKinds.includes('Collection'),
                    name: subElement.name,
                    annotations: {},
                    fullyQualifiedName: subElement.path,
                    type: subElement.structuredType ?? subElement.edmPrimitiveType ?? ''
                };
                // Set action.sourceType to the type from the parameter '_it'
                if (subElement.name === '_it') {
                    action.sourceType = subElement.structuredType ?? '';
                }
                action.parameters.push(parameter);
            }
        }
        this.actions.push(action);
    }

    private convertEntityContainer(targetKinds: string[], element: MetadataElement, elementKey: string): void {
        if (targetKinds.includes('EntityContainer')) {
            this.entityContainer = {
                _type: 'EntityContainer',
                name: element.name,
                fullyQualifiedName: elementKey
            };
            // entity sets as children of entity container
            for (const subElement of element.content ?? []) {
                const subElementTargetKinds = this.metadataService.getEdmTargetKinds(subElement.path);
                this.convertEntitySet(subElementTargetKinds, subElement);
                this.convertSingleton(subElementTargetKinds, subElement);
                this.convertFunctionImport(subElementTargetKinds, subElement);
            }
        }
    }

    private convertFunctionImport(targetKinds: string[], element: MetadataElement): void {
        const oDataVersion = this.metadataService.ODataVersion;
        if (targetKinds.includes('FunctionImport') || targetKinds.includes('ActionImport')) {
            // remark: AVT fills it differently in parseFunctionImport() - but then annotations are not picked up in convertTypes()
            if (oDataVersion === '4.0') {
                const actionImport: RawActionImport = {
                    _type: 'ActionImport',
                    name: element.name,
                    fullyQualifiedName: element.path,
                    actionName: unalias(element.structuredType ?? '')
                };
                this.actionImports.push(actionImport);
            } else {
                const action = convertFunctionImportV2(element, targetKinds, this.metadataService);
                this.actions.push(action);
            }
        }
    }

    private convertEntitySet(targetKinds: string[], element: MetadataElement) {
        if (targetKinds.includes('EntitySet') && !targetKinds.includes('ComplexType')) {
            // for CDS no entity container is present: target kind EntitySet can appear at root level
            if (!element.isCollectionValued) {
                this.convertSingleton([...targetKinds, 'Singleton'], element);
            } else {
                const entitySet: RawEntitySet = {
                    _type: 'EntitySet',
                    name: element.name,
                    entityTypeName: element.structuredType ?? (targetKinds.includes('EntityType') ? element.name : ''),
                    navigationPropertyBinding: {},
                    fullyQualifiedName: element.path
                };
                this.entitySets.push(entitySet);
            }
        }
    }

    // XML specific conversion, in CDS singletons are specially annotated entity sets (processed in convertEntitySet)
    private convertSingleton(targetKinds: string[], element: MetadataElement) {
        if (targetKinds.includes('Singleton')) {
            const singleton: RawSingleton = {
                _type: 'Singleton',
                nullable: false,
                name: element.name,
                entityTypeName: element.structuredType ?? (targetKinds.includes('EntityType') ? element.name : ''),
                navigationPropertyBinding: {},
                fullyQualifiedName: element.path
            };
            this.singletons.push(singleton);
        }
    }

    private convertComplexType(targetKinds: string[], element: MetadataElement, elementKey: string): void {
        if (targetKinds.includes('ComplexType')) {
            const complexTypeProperties: RawProperty[] = [];
            const complexTypeNavProperties: RawV4NavigationProperty[] = [];
            for (const subElement of element.content ?? []) {
                const subElementTargetKinds = this.metadataService.getEdmTargetKinds(subElement.path);
                if (subElementTargetKinds.includes('Property')) {
                    const property: RawProperty = {
                        _type: 'Property',
                        name: subElement.name,
                        type: subElement.edmPrimitiveType ?? subElement.structuredType ?? '',
                        fullyQualifiedName: subElement.path
                    };
                    complexTypeProperties.push(property);
                }
                if (subElementTargetKinds.includes('NavigationProperty')) {
                    const navProp: RawV4NavigationProperty = {
                        _type: 'NavigationProperty',
                        name: subElement.name,
                        fullyQualifiedName: subElement.path,
                        targetTypeName: subElement.structuredType ?? '',
                        isCollection: !!element.isCollectionValued,
                        containsTarget: false,
                        partner: '',
                        referentialConstraint: []
                    };
                    complexTypeNavProperties.push(navProp);
                }
            }
            const complexType: RawComplexType = {
                _type: 'ComplexType',
                name: element.name,
                fullyQualifiedName: elementKey,
                properties: complexTypeProperties,
                navigationProperties: complexTypeNavProperties
            };
            this.complexTypes.push(complexType);
        }
    }

    private convertEntityType(targetKinds: string[], element: MetadataElement, elementKey: string): void {
        if (targetKinds.includes('EntityType') && !targetKinds.includes('ComplexType')) {
            const entityProperties: RawProperty[] = [];
            const navigationProperties: RawV4NavigationProperty[] = [];
            const keys: RawProperty[] = [];
            for (const subElement of element.content ?? []) {
                const subElementTargetKinds = this.metadataService.getEdmTargetKinds(subElement.path);
                this.convertProperty(entityProperties, keys, element, subElementTargetKinds, subElement);
                this.convertNavigationProperty(navigationProperties, subElementTargetKinds, subElement);
            }
            const entityType: RawEntityType = {
                _type: 'EntityType',
                name: element.name,
                fullyQualifiedName: elementKey,
                entityProperties,
                keys: keys,
                navigationProperties,
                actions: {}
            };
            this.entityTypes.push(entityType);
        }
    }

    private convertProperty(
        entityProperties: RawProperty[],
        keys: RawProperty[],
        parent: MetadataElement,
        targetKinds: string[],
        element: MetadataElement
    ): void {
        if (targetKinds.includes('Property') && !targetKinds.includes('NavigationProperty')) {
            const property: RawProperty = {
                _type: 'Property',
                name: element.name,
                type: element.edmPrimitiveType ?? element.structuredType ?? '',
                fullyQualifiedName: element.path
            };
            entityProperties.push(property);
            if (parent.keys?.includes(element.name)) {
                keys.push(property);
            }
        }
    }
    private convertNavigationProperty(
        navigationProperties: RawV4NavigationProperty[],
        targetKinds: string[],
        element: MetadataElement
    ): void {
        if (targetKinds.includes('NavigationProperty')) {
            const property: RawV4NavigationProperty = {
                _type: 'NavigationProperty',
                name: element.name,
                fullyQualifiedName: element.path,
                targetTypeName: element.structuredType ?? '',
                isCollection: !!element.isCollectionValued,
                containsTarget: false,
                partner: '',
                referentialConstraint: []
            };
            navigationProperties.push(property);
        }
    }
}

function convertFunctionImportV2(
    element: MetadataElement,
    targetKinds: string[],
    metadataService: MetadataService
): RawAction {
    const action: RawAction = {
        _type: 'Action',
        name: element.name,
        fullyQualifiedName: element.path,
        parameters: [],
        isBound: false, // always set to false in AVT!
        sourceType: '', // not available here
        returnType: '',
        isFunction: targetKinds.includes('FunctionImport')
    };
    for (const parameterMdElement of element.content) {
        const parameterTargetKinds = metadataService.getEdmTargetKinds(parameterMdElement.path);
        if (isReturnParameter(parameterTargetKinds, parameterMdElement)) {
            action.returnType = parameterMdElement.structuredType ?? parameterMdElement.edmPrimitiveType ?? '';
        } else if (parameterTargetKinds.includes('Parameter')) {
            // Set action.sourceType to the type from the parameter '_it'
            if (parameterMdElement.name === '_it') {
                action.sourceType = parameterMdElement.structuredType ?? '';
            }
            const parameter: ActionParameter = {
                _type: 'ActionParameter',
                isCollection: parameterMdElement.isCollectionValued ?? false,
                fullyQualifiedName: parameterMdElement.path,
                annotations: {},
                name: parameterMdElement.name,
                type: parameterMdElement.structuredType ?? parameterMdElement.edmPrimitiveType ?? ''
            };
            action.parameters.push(parameter);
        }
    }
    return action;
}

function isReturnParameter(elementTargetKinds: string[], element: MetadataElement): boolean {
    return (
        (elementTargetKinds.includes('Parameter') && element.name === '$Return') ||
        elementTargetKinds.includes('ReturnType')
    );
}

const aliases: Record<string, string> = {};

function unalias(aliasedValue: string): string;

// TODO: check what is this actually doing, aliases are not filled at all.
function unalias(aliasedValue: string | undefined): string | undefined {
    if (!aliasedValue) {
        return aliasedValue;
    }

    const separators = ['@', '/', '('];
    const unaliased: string[] = [];
    let start = 0;
    for (let end = 0, maybeAlias = true; end < aliasedValue.length; end++) {
        const char = aliasedValue[end];
        if (maybeAlias && char === '.') {
            const alias = aliasedValue.substring(start, end);
            unaliased.push(aliases[alias] ?? alias);
            start = end;
            maybeAlias = false;
        }
        if (separators.includes(char)) {
            unaliased.push(aliasedValue.substring(start, end + 1));
            start = end + 1;
            maybeAlias = true;
        }
    }
    unaliased.push(aliasedValue.substring(start));

    return unaliased.join('');
}

/**
 * Convert metadata to AVT Schema representation.
 *
 * @param metadataService Metadata service.
 * @returns Metadata in AVT format.
 */
export function convertMetadataToAvtSchema(metadataService: MetadataService): RawSchema {
    const converter = new MetadataConverter(metadataService);
    return converter.convert();
}
