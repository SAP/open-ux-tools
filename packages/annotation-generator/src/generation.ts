import type { Change } from '@sap-ux/fiori-annotation-api';
import {
    ApiError,
    ApiErrorCode,
    ChangeType,
    ExpressionType,
    FioriAnnotationService
} from '@sap-ux/fiori-annotation-api';
import { getProject } from '@sap-ux/project-access';
import type { Project } from '@sap-ux/project-access';
import type { Editor } from 'mem-fs-editor';

import { convert } from '@sap-ux/annotation-converter';
import type { MetadataElement } from '@sap-ux/odata-annotation-core-types';
import type { MetadataService } from '@sap-ux/odata-entity-model';
import type {
    AnnotationRecord,
    ConvertedMetadata,
    EntityType,
    NavigationProperty,
    Property,
    RawAnnotation
} from '@sap-ux/vocabularies-types';
import { CommonAnnotationTerms, CommonAnnotationTypes } from '@sap-ux/vocabularies-types/vocabularies/Common';
import type { EntityTypeAnnotations, PropertyAnnotations } from '@sap-ux/vocabularies-types/vocabularies/Edm_Types';
import { UIAnnotationTerms, UIAnnotationTypes } from '@sap-ux/vocabularies-types/vocabularies/UI';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { adaptFilePath } from './utils';

const draftSpecificFields = ['IsActiveEntity', 'HasActiveEntity', 'HasDraftEntity'];

const commonNodeModulePath = join('node_modules', '@sap', 'cds', 'common.cds');
const managedProperties = ['createdAt', 'createdBy', 'modifiedAt', 'modifiedBy'];

const FACETS_PROP_NAME_LABEL = 'Label';
const FACETS_PROP_NAME_ID = 'ID';
const FACETS_PROP_NAME_TARGET = 'Target';
const FIELD_GROUP_PROP_NAME_DATA = 'Data';
const DATA_FIELD_PROP_NAME_VALUE = 'Value';
const DATA_FIELD_PROP_NAME_LABEL = 'Label';
const VALUE_LIST_PROP_NAME_COLLECTION_PATH = 'CollectionPath';
const VALUE_LIST_PROP_NAME_PARAMETERS = 'Parameters';
const VALUE_LIST_PROP_NAME_LOCAL_DATA_PROPERTY = 'LocalDataProperty';
const VALUE_LIST_PROP_NAME_VALUE_LIST_PROPERTY = 'ValueListProperty';

export type AnnotationServiceParameters = {
    /**
     * Path to project root folder or project instance.
     */
    project: string | Project;
    /**
     * Name of the service.
     */
    serviceName: string;
    /**
     * Name of the app.
     */
    appName?: string;
    /**
     * Only applicable for CAP CDS projects.
     * When set to true SAP annotations will be created instead of OData annotations.
     */
    writeSapAnnotations?: boolean;
};
/**
 * Generate annotations options.
 */
export type GenerateAnnotationsOptions = {
    /**
     * Name of entity set which is the basis for List Report/Object Page.
     */
    entitySetName: string;
    /**
     * Relative path (from project root) to the local annotation file, where annotations should be generated.
     */
    annotationFilePath: string;
    /**
     * Generate default facets (UI.Facets and UI.FieldGroup annotations for Object Page).
     */
    addFacets?: boolean;
    /**
     * Generate default line items (UI.LineItem annotation for List Report).
     */
    addLineItems?: boolean;
    /**
     * Generate value helps (Common.ValueList annotation for Value Helps).
     */
    addValueHelps?: boolean;
};

/**
 * Generate annotations - for usage during app generation.
 *
 * @param fs - In memory file system editor.
 * @param annotationServiceParams - Parameters for creating annotation service instance.
 * @param options - Annotation generation options.
 * @returns true if annotations were generated.
 */
export async function generateAnnotations(
    fs: Editor,
    annotationServiceParams: AnnotationServiceParameters,
    options: GenerateAnnotationsOptions
): Promise<boolean> {
    let annotationsGenerated = false;
    const { entitySetName, annotationFilePath, addFacets, addLineItems, addValueHelps } = options;
    const context = await getContext(fs, entitySetName, annotationFilePath, annotationServiceParams);
    if (addFacets) {
        const generated = await generateDefaultFacets(context);
        annotationsGenerated = annotationsGenerated || generated;
    }
    if (addLineItems) {
        const generated = await generateDefaultLineItem(context);
        annotationsGenerated = annotationsGenerated || generated;
    }
    if (addValueHelps) {
        const generated = await generateValueHelps(context);
        annotationsGenerated = annotationsGenerated || generated;
    }
    return annotationsGenerated;
}
interface Context {
    annotationService: FioriAnnotationService;
    annotationFilePath: string;
    project: Project;
    metadataService: MetadataService;
    convertedSchema: ConvertedMetadata;
    entityTypeName: string;
    entityType: EntityType;
}

async function adaptProject(projectOrRoot: string | Project): Promise<Project> {
    if (typeof projectOrRoot === 'string') {
        // On Windows platform when called from the Application Wizard the root path may contain lowercase drive letter
        // This causes annotation generation error in Fiori annotation API, thus needs adaptation
        const root = adaptFilePath(projectOrRoot);
        return await getProject(root);
    } else {
        return projectOrRoot;
    }
}

async function getContext(
    fs: Editor,
    entitySetName: string,
    annotationFilePath: string,
    annotationServiceParams: AnnotationServiceParameters
): Promise<Context> {
    const { project, serviceName, appName, writeSapAnnotations = false } = annotationServiceParams;
    const projectInstance = await adaptProject(project);
    const annotationService = await FioriAnnotationService.createService(
        projectInstance,
        serviceName,
        appName ?? '',
        fs,
        {
            commitOnSave: false,
            clearFileResolutionCache: true,
            writeSapAnnotations
        }
    );

    await annotationService.sync();
    const convertedSchema = convert(annotationService.getSchema());
    const metadataService = annotationService.getMetadataService();
    const { entityType, entityTypeName } = findEntityType(convertedSchema, entitySetName);

    return {
        annotationService,
        annotationFilePath,
        project: projectInstance,
        metadataService,
        convertedSchema,
        entityTypeName,
        entityType
    };
}

/**
 * Generate UI.Facets annotation:
 *  - containing single ReferenceFacet referencing a UI.FieldGroup
 *  - the UI.FieldGroup contains a list of UI.DataFields determined based on some heuristics
 *
 * For an V4 Object Page this will result in a Form Section containing these Fields.
 *
 * @param context - Generation context.
 * @returns True if annotations were generated successfully and false if they already exist.
 */
async function generateDefaultFacets(context: Context): Promise<boolean> {
    let exception: Error;

    try {
        const { annotationService, annotationFilePath, project, entityType, entityTypeName } = context;
        const existingFacets = entityType.annotations.UI?.Facets;
        if (existingFacets) {
            return false; // UI.Facets already exist
        }

        const fieldGroup = generateFieldGroup(context);

        const facetsAnnotation: RawAnnotation = {
            term: UIAnnotationTerms.Facets,
            collection: []
        };
        // add new facet to UI.Facets
        const facet: AnnotationRecord = {
            type: UIAnnotationTypes.ReferenceFacet,
            propertyValues: [
                { name: FACETS_PROP_NAME_ID, value: { type: 'String', String: 'GeneratedFacet1' } },
                { name: FACETS_PROP_NAME_LABEL, value: { type: 'String', String: 'General Information' } },
                {
                    name: FACETS_PROP_NAME_TARGET,
                    value: {
                        type: 'AnnotationPath',
                        AnnotationPath: `@${fieldGroup.term}#${fieldGroup.qualifier}`
                    }
                }
            ]
        };
        (facetsAnnotation.collection as AnnotationRecord[]).push(facet);

        const uri = pathToFileURL(join(project.root, annotationFilePath)).toString();
        const changes: Change[] = [
            {
                uri,
                kind: ChangeType.InsertAnnotation,
                content: {
                    target: entityTypeName,
                    type: 'annotation',
                    value: fieldGroup
                }
            },
            {
                uri,
                kind: ChangeType.InsertAnnotation,
                content: {
                    target: entityTypeName,
                    type: 'annotation',
                    value: facetsAnnotation
                }
            }
        ];
        annotationService.edit(changes);
        await annotationService.save();
        return true;
    } catch (e) {
        exception = e instanceof ApiError ? e : new ApiError(`Generating sections failed. ${e}`);
        throw exception;
    }
}

function findEntitySet(convertedSchema: ConvertedMetadata, entityTypeName: string): string {
    const entitySet = convertedSchema.entitySets.find((entitySet) => {
        return entitySet.entityTypeName === entityTypeName;
    });
    return entitySet?.name ?? '';
}

function findEntityType(convertedSchema: ConvertedMetadata, entitySetName: string) {
    const entityTypeName = convertedSchema.entitySets.by_name(entitySetName)?.entityTypeName ?? '';
    if (!entityTypeName) {
        throw new ApiError(`Entity set not found: ${entitySetName}`, ApiErrorCode.General);
    }
    const entityType = convertedSchema.entityTypes.by_name(entityTypeName)!;
    if (!entityType) {
        throw new ApiError(`Entity type not found: ${entityTypeName}`, ApiErrorCode.General);
    }
    return { entityType, entityTypeName };
}

function generateFieldGroup(context: Context): RawAnnotation {
    const dataFieldRecords = getDataFieldRecordCollection(context);
    const fieldGroupAnnotation: RawAnnotation = {
        term: UIAnnotationTerms.FieldGroup,
        qualifier: '',
        record: {
            type: UIAnnotationTypes.FieldGroupType,
            propertyValues: [
                { name: FIELD_GROUP_PROP_NAME_DATA, value: { type: 'Collection', Collection: dataFieldRecords } }
            ]
        }
    };
    const existingFieldGroupQualifiers = Object.keys(context.entityType?.annotations.UI ?? {})
        .filter((termQualifier) => termQualifier.startsWith('FieldGroup#'))
        .map((termQualifier) => termQualifier.split('#')[1]);
    const generatedQualifier = generateId(existingFieldGroupQualifiers, 'GeneratedGroup');
    fieldGroupAnnotation.qualifier = generatedQualifier;

    return fieldGroupAnnotation;
}

function getDataFieldRecordCollection(context: Context, isListReport = false): AnnotationRecord[] {
    const { project, metadataService, entityType } = context;

    const properties = entityType.entityProperties.filter((property) => !draftSpecificFields.includes(property.name));

    const keyCount = moveKeysToBeginning(isListReport, entityType, properties);

    const recordCollection: AnnotationRecord[] = [];
    for (const property of properties) {
        const targetPath = `${entityType.fullyQualifiedName}/${property.name}`;
        const targetElement: EntityType | Property = property;
        const mdElement = metadataService.getMetadataElement(targetPath);
        const type = mdElement?.edmPrimitiveType;
        if (
            type === 'Edm.Guid' ||
            !type?.startsWith('Edm') ||
            // can't use nullish coalescing for boolean values
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            mdElement?.isCollectionValued ||
            // for CDS: no fields from sap.cds.common
            ((project.projectType === 'CAPJava' || project.projectType === 'CAPNodejs') &&
                isPropertyFromCommonNodeModule(property.name, mdElement?.location?.uri))
        ) {
            continue;
        }

        const annotations = getAnnotations(project, entityType, property, targetPath, targetElement, mdElement);
        const annotationHidden = (annotations as PropertyAnnotations).UI?.Hidden;
        if (isHidden(annotationHidden)) {
            continue;
        }

        const annotationLabel = annotations.Common?.Label;
        const annotationTitle = (annotations as unknown as any)?.['title'];
        const hasLabel = annotationLabel ?? annotationTitle;
        const record: AnnotationRecord = {
            type: UIAnnotationTypes.DataField,
            propertyValues: []
        };
        if (!hasLabel) {
            record.propertyValues.push({
                name: DATA_FIELD_PROP_NAME_LABEL,
                value: { type: 'String', String: property.name }
            });
        }
        record.propertyValues.push({
            name: DATA_FIELD_PROP_NAME_VALUE,
            value: { type: 'Path', Path: property.name }
        });
        recordCollection.push(record);

        if (isListReport && recordCollection.length >= Math.max(keyCount, 5)) {
            break;
        }
    }
    return recordCollection;
}

function getAnnotations(
    project: Project,
    entityType: EntityType,
    property: Property,
    targetPath: string,
    targetElement: Property,
    mdElement?: MetadataElement
): PropertyAnnotations | EntityTypeAnnotations {
    let target: Property | EntityType = targetElement;
    if (project.projectType === 'CAPJava' || project.projectType === 'CAPNodejs') {
        const generatedProperty = property.name.split('_');
        if (generatedProperty.length > 1) {
            const assocName = (mdElement?.originalName ?? '').split('.').pop();
            targetPath = `${entityType.fullyQualifiedName}/${assocName}`;
            const associationElement = entityType.navigationProperties.by_name(assocName ?? '');
            if (associationElement) {
                target = associationElement.targetType;
            }
        }
    }
    if (!target) {
        throw new ApiError(`Path target not found: ${targetPath}`);
    }
    return target.annotations;
}

function moveKeysToBeginning(isListReport: boolean, entityType: EntityType, properties: Property[]): number {
    // for list report: move all key properties to the beginning
    let keys: string[] = []; // contains semantic key properties and entities primary keys
    if (isListReport) {
        keys = entityType.keys.filter((key) => key.isKey).map((key) => key.name);
        entityType.annotations.Common?.SemanticKey?.forEach((key) => (key.value ? keys.push(key.value) : undefined));
        keys = Array.from(new Set([...keys])); // to remove duplicates?
        keys.forEach((key) => {
            const index = properties.map((sE) => sE.name).indexOf(key);
            const element = properties.splice(index, 1);
            properties.unshift(element[0]);
        });
    }
    return keys.length;
}

/**
 * Checks if the property belongs to common fields: 'createdAt', 'createdBy', 'modifiedAt', 'modifiedBy'.
 *
 * @param propName - Metadata element property name
 * @param locationUri - location uri of property
 * @returns True if property is one of the "managed" aspects properties.
 */
function isPropertyFromCommonNodeModule(propName: string, locationUri?: string): boolean {
    if (!propName || !locationUri) {
        return false;
    }
    return managedProperties.includes(propName) && locationUri.endsWith(commonNodeModulePath);
}

function isHidden(hiddenAnno?: Omit<RawAnnotation, 'annotations'>): boolean {
    if (!hiddenAnno || hiddenAnno.qualifier) {
        return false;
    }
    return !hiddenAnno.value || (hiddenAnno.value.type === 'Bool' && hiddenAnno.value.Bool !== false);
}

/**
 * Generate UI.LineItem annotation:
 *  - the UI.LineItem contains a list of UI.DataFields determined based on some heuristics
 *
 * For an V4 Object Page this will result in a List containing these Fields.
 *
 * @param context - Generation context.
 * @returns True if annotations were generated successfully and false if they already exist.
 */
async function generateDefaultLineItem(context: Context): Promise<boolean> {
    let exception: Error;

    try {
        const { annotationService, project, annotationFilePath, entityType, entityTypeName } = context;
        const existingList = entityType.annotations.UI?.LineItem;
        if (existingList) {
            return false; // UI.LineItem already exists
        }

        const lineItem = generateLineItem(context);

        const uri = pathToFileURL(join(project.root, annotationFilePath)).toString();
        const change: Change = {
            uri,
            kind: ChangeType.InsertAnnotation,
            content: {
                target: entityTypeName,
                type: 'annotation',
                value: lineItem
            }
        };
        annotationService.edit(change);
        await annotationService.save();
        return true;
    } catch (e) {
        exception = e instanceof ApiError ? e : new ApiError(`Generating LineItem failed. ${e}`);
        throw exception;
    }
}

function generateLineItem(context: Context): RawAnnotation {
    const dataFieldRecords = getDataFieldRecordCollection(context, true);
    return {
        term: UIAnnotationTerms.LineItem,
        qualifier: '',
        collection: [...dataFieldRecords]
    } as RawAnnotation;
}

/**
 * Generate Common.ValueList annotation:
 *  - the Common.ValueList contains CollectionPath and Common.ValueListParameterInOut
 *
 * For an V4 Object Page this will result in a List containing these Fields.
 *
 * @param context - Generation Context.
 * @returns True if annotations were generated successfully and false if they already exist.
 */
async function generateValueHelps(context: Context): Promise<boolean> {
    let exception: Error;

    try {
        const { project, entityType } = context;
        if (project.projectType === 'EDMXBackend') {
            return false;
        }
        const navProperties = entityType.navigationProperties.filter((navProp) => {
            return canGenerateValueListAnnotationForNavigationProperty(context, entityType, navProp);
        });
        if (navProperties.length === 0) {
            return false;
        }
        await generateValueList(context, navProperties);
        return true;
    } catch (e) {
        exception = e instanceof ApiError ? e : new ApiError(`Generating ValueList failed. ${e}`);
        throw exception;
    }
}

async function generateValueList(context: Context, navProperties: NavigationProperty[]): Promise<void> {
    const { annotationService, project, convertedSchema, annotationFilePath } = context;
    navProperties.forEach((navProp) => {
        const collectionPath = findEntitySet(convertedSchema, navProp.targetTypeName);
        const { record: inOutParameter, key } = getValueListParameterInOut(context, navProp);
        const valueListValue: AnnotationRecord = {
            type: CommonAnnotationTypes.ValueListType,
            propertyValues: [
                {
                    name: VALUE_LIST_PROP_NAME_COLLECTION_PATH,
                    value: { type: ExpressionType.String, String: collectionPath }
                },
                {
                    name: VALUE_LIST_PROP_NAME_PARAMETERS,
                    value: {
                        type: ExpressionType.Collection,
                        Collection: [
                            inOutParameter,
                            //limit the vhp to 5 including mandatory, If associated entity has a lot of properties, this crashes the app at runtime.
                            ...getValueListParameterDisplayOnly(context, navProp.targetType, key).slice(0, 4)
                        ]
                    }
                }
            ]
        };

        const annotation: RawAnnotation = { term: CommonAnnotationTerms.ValueList, record: valueListValue };

        const uri = pathToFileURL(join(project.root, annotationFilePath)).toString();
        const changes: Change[] = [
            {
                uri,
                kind: ChangeType.InsertAnnotation,
                content: {
                    target: navProp.fullyQualifiedName,
                    type: 'annotation',
                    value: annotation
                }
            }
        ];
        annotationService.edit(changes);
    });
    await annotationService.save();
}

function getValueListParameterInOut(
    context: Context,
    navProp: NavigationProperty
): { record: AnnotationRecord; key: string } {
    const { metadataService } = context;
    const mdElement = metadataService.getMetadataElement(navProp.fullyQualifiedName)!;
    const { elementName, key } = getLocalDataPropertyName(context, mdElement);
    return {
        record: {
            type: CommonAnnotationTypes.ValueListParameterInOut,
            propertyValues: [
                {
                    name: VALUE_LIST_PROP_NAME_LOCAL_DATA_PROPERTY,
                    value: {
                        type: ExpressionType.PropertyPath,
                        PropertyPath: elementName
                    }
                },
                { name: VALUE_LIST_PROP_NAME_VALUE_LIST_PROPERTY, value: { type: 'String', String: key } }
            ]
        },
        key
    };
}
/**
 * Get value lust parameters to display only
 *  - managed properties, complex type properties or properties which are already used in InOut parameter should be omitted
 *  - also exclude the following properties
 *     - Properties of type Edm.Guid.
 *     - Draft specific properties such as IsActiveEntity, HasActiveEntity, HasDraftEntity.
 *     - Technical properties defined as managed in node_modules/@sap/cds/common.cds of CAP projects.
 *     - Properties annotated with UI.Hidden.
 *
 * @param context - Generation context.
 * @param targetType - Target entity type.
 * @param valueListParameterInOutPropName - Parameter property name.
 * @returns DisplayOnly properties.
 */
function getValueListParameterDisplayOnly(
    context: Context,
    targetType: EntityType,
    valueListParameterInOutPropName: string
): AnnotationRecord[] {
    const { metadataService } = context;
    const targetEntityTypeName = targetType.name;
    const mdElement = metadataService.getMetadataElement(targetEntityTypeName)!;
    return mdElement.content
        .filter((prop) => {
            const convertedProp = targetType.entityProperties.by_name(prop.name);
            const annotationHidden = convertedProp?.annotations.UI?.Hidden;
            const hidden = isHidden(annotationHidden);
            const isOmit =
                prop.name === valueListParameterInOutPropName ||
                // can't use nullish coalescing for boolean values
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                prop.isEntityType ||
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                prop.isCollectionValued ||
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                prop.isComplexType ||
                hidden ||
                prop.edmPrimitiveType === 'Edm.Guid' ||
                draftSpecificFields.includes(prop.name) ||
                isPropertyFromCommonNodeModule(prop.name, prop.location?.uri);

            return !isOmit;
        })
        .map((prop) => ({
            type: CommonAnnotationTypes.ValueListParameterDisplayOnly,
            propertyValues: [
                {
                    name: VALUE_LIST_PROP_NAME_VALUE_LIST_PROPERTY,
                    value: { type: 'String', String: prop.name }
                }
            ]
        }));
}

function canGenerateValueListAnnotationForNavigationProperty(
    context: Context,
    entityType: EntityType,
    navProp: NavigationProperty
): boolean {
    if (navProp.isCollection) {
        return false;
    }
    const { metadataService, convertedSchema } = context;
    const mdElement = metadataService.getMetadataElement(navProp.fullyQualifiedName)!;
    const { elementName, key } = getLocalDataPropertyName(context, mdElement);
    // in CDS managed entity type must have local autogenerated property which contains associated key value, and remote key field must exist
    if (!key || !entityType.entityProperties.by_name(elementName)) {
        return false;
    }

    // It might be that an entitySet (collectionPath in value help annotation) does not exist for the entityType (e.g. for associations representing compositions)
    const entitySet = findEntitySet(convertedSchema, navProp.targetTypeName);
    if (!entitySet) {
        return false;
    }

    const associatedEntityType = convertedSchema.entityTypes.by_name(navProp.targetTypeName)!;
    const existingValueList = isValueListAlreadyExist(associatedEntityType, navProp);
    // can generate ValueList if navigation property is not yet carrying valuelist annotation
    return !existingValueList;
}

function getLocalDataPropertyName(
    context: Context,
    mdElement: MetadataElement
): {
    elementName: string;
    key: string;
} {
    const { metadataService } = context;
    let currentElementName = mdElement.name;
    let keyName = '';
    if (mdElement.isEntityType && mdElement.structuredType) {
        // build generated element name by adding first key field name of associated entity
        keyName = metadataService.getMetadataElement(mdElement.structuredType)?.keys?.[0] ?? '';
        currentElementName = keyName ? `${currentElementName}_${keyName}` : currentElementName;
    }
    return {
        elementName: currentElementName,
        key: keyName
    };
}

function isValueListAlreadyExist(navPropTargetEntityType: EntityType, navProp: NavigationProperty): boolean {
    const existingAnnotations = navProp.annotations as PropertyAnnotations;
    const existingCommonValueList = existingAnnotations.Common?.ValueList;
    const existingCDSValueList = (navPropTargetEntityType.annotations as any)?.['cds.odata']?.['valuelist'];
    return !!existingCommonValueList || !!existingCDSValueList;
}

function generateId(existingIds: string[] = [], label: string = ''): string {
    // add integer number as postfix until unique
    let id = label;
    let postfix = 0;
    const base = id;
    while (existingIds.includes(id)) {
        postfix++;
        id = base + postfix;
    }
    return id;
}
