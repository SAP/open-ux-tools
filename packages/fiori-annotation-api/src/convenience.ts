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
    ActionParameter
} from '@sap-ux/vocabularies-types';
import type { MetadataService, MetadataElement, Path } from '@sap-ux/odata-metadata';

/**
 * convert metadata to AVT Schema representation
 * @param metadataService
 */
export function convertMetaDataToAvtSchema(metadataService: MetadataService): RawSchema {
    const rootLevelElement = metadataService.getRootMetadataElements();
    // Schema representation includes entityTypes, entitySets, associations (not supported here), a single entityContainer and actions
    // collect these objects based on the (multiple) EdmTargetKinds of each metadata element
    const entityTypes: RawEntityType[] = [];
    const complexTypes: RawComplexType[] = [];
    const entitySets: RawEntitySet[] = [];
    let entityContainer: RawEntityContainer = {
        _type: 'EntityContainer',
        fullyQualifiedName: ''
    };
    const actions: RawAction[] = [];
    rootLevelElement.forEach((element: MetadataElement, elementKey: Path) => {
        const targetKinds = metadataService.getEdmTargetKinds(element.path);
        if (targetKinds.includes('EntityContainer')) {
            entityContainer = {
                _type: 'EntityContainer',
                name: element.name,
                fullyQualifiedName: elementKey
            };
            // entity sets as children of entity container
            for (const subElement of element.content ?? []) {
                const subElementTargetKinds = metadataService.getEdmTargetKinds(subElement.path);
                if (subElementTargetKinds.includes('EntitySet')) {
                    // only EntitySets are considered in AVT Schema representation (no Singleton, Action/FunctionImport etc...)
                    const entitySet: RawEntitySet = {
                        _type: 'EntitySet',
                        name: subElement.name,
                        entityTypeName: subElement.structuredType ?? '', // TODO: check if this causes issues
                        navigationPropertyBinding: {},
                        fullyQualifiedName: subElement.path
                    };
                    entitySets.push(entitySet);
                }
                if (metadataService.ODataVersion === '2.0' && subElementTargetKinds.includes('FunctionImport')) {
                    // remark: AVT fills it differently in parseFunctionImport() - but then annotations are not picked up in convertTypes()
                    const action: RawAction = {
                        _type: 'Action',
                        name: subElement.name,
                        fullyQualifiedName: subElement.path,
                        parameters: [],
                        isBound: false, // always set to false in AVT!
                        sourceType: '', // not available here TODO: check if this causes issues
                        returnType: '', // TODO: check if this causes issues
                        isFunction: false
                    };
                    for (const parameterMdElement of subElement.content ?? []) {
                        if (parameterMdElement) {
                            const parameterTargetKinds = metadataService.getEdmTargetKinds(parameterMdElement.path);
                            if (parameterTargetKinds.includes('Parameter')) {
                                // Set action.sourceType to the type from the parameter '_it'
                                if (parameterMdElement.name === '_it') {
                                    action.sourceType = parameterMdElement.structuredType ?? ''; // TODO: check if this causes issues
                                }
                                const parameter: ActionParameter = {
                                    _type: 'ActionParameter',
                                    isEntitySet: false,
                                    fullyQualifiedName: parameterMdElement.path,
                                    annotations: {},
                                    name: parameterMdElement.name,
                                    type: parameterMdElement.structuredType ?? parameterMdElement.edmPrimitiveType ?? '' // TODO: check if this causes issues
                                };
                                action.parameters.push(parameter);
                            } else if (parameterTargetKinds.includes('ReturnType')) {
                                action.returnType =
                                    parameterMdElement.structuredType ?? parameterMdElement.edmPrimitiveType ?? ''; // TODO: check if this causes issues
                            }
                        }
                    }
                    actions.push(action);
                }
            }
        }
        if (targetKinds.includes('EntityType')) {
            const entityProperties: RawProperty[] = [];
            const entityNavProps: RawV4NavigationProperty[] = [];
            const keys: RawProperty[] = [];
            for (const subElement of element.content ?? []) {
                const subElementTargetKinds = metadataService.getEdmTargetKinds(subElement.path);
                if (subElementTargetKinds.includes('Property')) {
                    const property: RawProperty = {
                        _type: 'Property',
                        name: subElement.name,
                        type: subElement.edmPrimitiveType ?? subElement.structuredType ?? '', // TODO: check if this causes issues
                        fullyQualifiedName: subElement.path
                    };
                    entityProperties.push(property);
                    if (element.keys && element.keys.includes(subElement.name)) {
                        keys.push(property);
                    }
                }
                if (subElementTargetKinds.includes('NavigationProperty')) {
                    const navProp: RawV4NavigationProperty = {
                        _type: 'NavigationProperty',
                        name: subElement.name,
                        fullyQualifiedName: subElement.path,
                        targetTypeName: subElement.structuredType ?? '', // TODO: check if this causes issues
                        isCollection: false,
                        containsTarget: false,
                        partner: '', // TODO: check if this causes issues
                        referentialConstraint: []
                    };
                    entityNavProps.push(navProp);
                }
            }
            const entityType: RawEntityType = {
                _type: 'EntityType',
                name: element.name,
                fullyQualifiedName: elementKey,
                entityProperties: entityProperties,
                keys: keys,
                navigationProperties: entityNavProps,
                actions: {}
            };
            entityTypes.push(entityType);
        }
        if (targetKinds.includes('ComplexType')) {
            const complexTypeProperties: RawProperty[] = [];
            const complexTypeNavProperties: RawV4NavigationProperty[] = [];
            for (const subElement of element.content ?? []) {
                const subElementTargetKinds = metadataService.getEdmTargetKinds(subElement.path);
                if (subElementTargetKinds.includes('Property')) {
                    const property: RawProperty = {
                        _type: 'Property',
                        name: subElement.name,
                        type: subElement.edmPrimitiveType ?? subElement.structuredType ?? '', // TODO: check if this causes issues
                        fullyQualifiedName: subElement.path
                    };
                    complexTypeProperties.push(property);
                }
                if (subElementTargetKinds.includes('NavigationProperty')) {
                    const navProp: RawV4NavigationProperty = {
                        _type: 'NavigationProperty',
                        name: subElement.name,
                        fullyQualifiedName: subElement.path,
                        targetTypeName: subElement.structuredType ?? '', // TODO: check if this causes issues
                        isCollection: false,
                        containsTarget: false,
                        partner: '', // TODO: check if this causes issues
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
            complexTypes.push(complexType);
        }
        if (targetKinds.includes('EntitySet')) {
            // for CDS no entity container is present: target kind EntitySet can appear at root level
            const entitySet: RawEntitySet = {
                _type: 'EntitySet',
                name: element.name,
                entityTypeName: element.structuredType || (targetKinds.includes('EntityType') ? element.name : ''),
                navigationPropertyBinding: {},
                fullyQualifiedName: element.path
            };
            entitySets.push(entitySet);
        }
        if (targetKinds.includes('Action') || targetKinds.includes('Function')) {
            // see AVT parseActions()
            const action: RawAction = {
                _type: 'Action',
                name: element.name,
                fullyQualifiedName: element.path,
                parameters: [],
                isBound: false, // TODO: check if this causes issues
                sourceType: '', // not available here // TODO: check if this causes issues
                returnType: '', // TODO: check if this causes issues
                isFunction: false
            };
            for (const subElement of element.content ?? []) {
                const subElementTargetKinds = metadataService.getEdmTargetKinds(subElement.path);
                if (subElementTargetKinds.includes('Parameter')) {
                    const parameter = {
                        _type: 'ActionParameter',
                        isEntitySet: false,
                        fullyQualifiedName: subElement.path,
                        type: subElement.structuredType || subElement.edmPrimitiveType
                    };
                    action.parameters.push(parameter as any);
                } else if (subElementTargetKinds.includes('ReturnType')) {
                    action.returnType = subElement.structuredType ?? subElement.edmPrimitiveType ?? ''; // TODO: check if this causes issues
                }
            }
            actions.push(action);
        }
    });

    const [namespace] = [...metadataService.getNamespaces()];
    if (entityContainer.fullyQualifiedName && namespace) {
        // for CDS no entity container is present: build dummy entity container
        const entityContainerName = 'dummyEntityContainer';
        entityContainer = {
            _type: 'EntityContainer',
            name: entityContainerName,
            fullyQualifiedName: namespace ? namespace + '.' + entityContainerName : entityContainerName
        };
    }

    const annotations: Record<string, AnnotationList[]> = {};
    return {
        namespace,
        annotations,
        entitySets,
        complexTypes,
        entityContainer,
        actions,
        entityTypes,
        associations: [],
        singletons: [],
        associationSets: [],
        typeDefinitions: []
    };
}
