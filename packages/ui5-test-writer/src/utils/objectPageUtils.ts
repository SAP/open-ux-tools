import type { Logger } from '@sap-ux/logger';
import type { ApplicationModel } from '@sap/ux-specification/dist/types/src/parser/index.js';
import type {
    ActionButtonState,
    ContactCardField,
    FormField,
    SectionFormField,
    BodySectionFeatureData,
    BodySubSectionFeatureData,
    HeaderSectionFeatureData,
    ObjectPageFeatures,
    ObjectPageNavigationParents
} from '../types.js';
import type { PageWithModelV4 } from '@sap/ux-specification/dist/types/src/parser/application.js';
import {
    type AggregationItem,
    type BodySectionItem,
    type FieldItem,
    type HeaderSectionItem,
    type SectionItem,
    getAggregations,
    parseDataFieldForAnnotationName
} from './modelUtils.js';
import { extractContactCardColumnsFromNode, extractTableColumnsFromNode } from './tableUtils.js';
import { PageTypeV4 } from '@sap/ux-specification/dist/types/src/common/page.js';
import { parse } from '@sap-ux/edmx-parser';
import { convert } from '@sap-ux/annotation-converter';
import type { ConvertedMetadata, EntityType } from '@sap-ux/vocabularies-types';
import { buildActionStateFromSpecModelKey, safeCheckButtonVisibility, safeCheckEditVisibility } from './actionUtils.js';

/**
 * Extracts feature data for object pages from the application model.
 *
 * @param objectPages - the array of object pages extracted from the application model
 * @param listReportPageKey - the key of the List Report page in the application model, used to find navigation routes to object pages
 * @param log - optional logger instance
 * @param metadata - optional metadata for the OPA test generation
 * @returns a record of object page feature data
 */
export async function getObjectPageFeatures(
    objectPages: PageWithModelV4[],
    listReportPageKey?: string,
    log?: Logger,
    metadata?: string
): Promise<ObjectPageFeatures[]> {
    const objectPageFeatures: ObjectPageFeatures[] = [];
    if (!objectPages || objectPages.length === 0) {
        log?.warn('Object Pages not found in application model. Dynamic tests will not be generated for Object Pages.');
        return objectPageFeatures;
    }

    // attempt to get individual feature data for each object page
    const convertedMetadata = metadata ? convert(parse(metadata)) : undefined;
    const schemaNamespace = convertedMetadata?.namespace ?? '';

    for (const objectPage of objectPages) {
        const pageFeatureData: ObjectPageFeatures = {} as ObjectPageFeatures;

        pageFeatureData.name = objectPage.name!;
        pageFeatureData.navigationParents = getObjectPageNavigationParents(
            objectPage.name!,
            objectPages,
            listReportPageKey
        );
        // extract header sections (facets)
        pageFeatureData.headerSections = extractObjectPageHeaderSectionsData(objectPage);
        // extract body sections (includes section-level actions and standard create/delete buttons)
        pageFeatureData.bodySections = extractObjectPageBodySectionsData(
            objectPage,
            convertedMetadata,
            schemaNamespace,
            metadata,
            log
        );
        // extract header-level actions
        pageFeatureData.headerActions = convertedMetadata
            ? extractHeaderActions(objectPage, convertedMetadata, schemaNamespace)
            : [];
        // determine edit button visibility from UpdateRestrictions on the OP entity set
        if (metadata && objectPage.entitySet) {
            pageFeatureData.editButton = safeCheckEditVisibility(metadata, objectPage.entitySet, log);
        }
        objectPageFeatures.push(pageFeatureData);
    }

    return objectPageFeatures;
}

/**
 * Retrieves all Object Page definitions from the given application model, as long as the page is reachable via standard navigation routes.
 *
 * @param applicationModel - The application model containing page definitions.
 * @returns An array of Object Page definitions.
 */
export function getObjectPages(applicationModel: ApplicationModel): PageWithModelV4[] {
    const objectPages: PageWithModelV4[] = [];
    for (const pageKey in applicationModel.pages) {
        const page = applicationModel.pages[pageKey];
        if (page.pageType === PageTypeV4.ObjectPage) {
            page.name = pageKey; // store page key as name for later identification
            objectPages.push(page);
        }
    }
    return objectPages;
}

/**
 * Finds parent pages for the object page, and returns their identifiers.
 *
 * @param targetObjectPageKey - key of the target object page
 * @param objectPages - the array of object pages extracted from the application model
 * @param listReportPageKey - the key of the List Report page in the application model, used to find navigation routes to object pages
 * @returns navigation data including parent page identifiers
 */
function getObjectPageNavigationParents(
    targetObjectPageKey: string,
    objectPages: PageWithModelV4[],
    listReportPageKey?: string
): ObjectPageNavigationParents {
    const navigationParents: ObjectPageNavigationParents = {
        parentLRName: listReportPageKey ?? '' // app is possibly malformed if no LR found
    };

    objectPages.forEach((objectPage) => {
        const navigationRoutes = getNavigationRoutes(objectPage);
        const routeToTargetOP = navigationRoutes.find((nav) => nav.route === targetObjectPageKey);
        if (routeToTargetOP) {
            navigationParents.parentOPName = objectPage.name;

            navigationParents.parentOPTableSection = routeToTargetOP.identifier;
        }
    });

    return navigationParents;
}

/**
 *  Extracts header sections data from an object page model.
 *
 * @param objectPage - object page from the application model
 * @returns header sections data
 */
function extractObjectPageHeaderSectionsData(objectPage: PageWithModelV4): HeaderSectionFeatureData[] {
    const headerSections: HeaderSectionFeatureData[] = [];
    if (objectPage.model) {
        const headerAggregation = getAggregations(objectPage.model.root)['header'];
        const sectionsAggregation = getAggregations(headerAggregation)['sections'];
        const sections = getAggregations(sectionsAggregation) as Record<string, HeaderSectionItem>;
        Object.values(sections).forEach((section) => {
            const facetId = getSectionIdentifier(section);
            if (!facetId) {
                // if no identifier can be found for the section, it is not possible to reliably identify it in tests, so skip it
                return;
            }
            const sectionData: HeaderSectionFeatureData = {
                facetId: facetId,
                stashed: getSectionStashedFlag(section),
                custom: section.custom,
                microChart: isSectionMicroChart(section),
                form: isFormSection(section),
                // collection: false // TODO: find out how to identify collection facets
                title: section.title,
                contactCardFields: []
            };
            if (sectionData.form) {
                sectionData.fields = getHeaderSectionFormFields(section);
                sectionData.contactCardFields = pickContactCardFieldsFromHeader(sectionData.fields);
            }
            headerSections.push(sectionData);
        });
    }
    return headerSections;
}

/**
 * Extracts body sections data from an object page model.
 *
 * @param objectPage - object page from the application model
 * @param convertedMetadata - optional converted OData metadata for action extraction
 * @param schemaNamespace - optional OData schema namespace used as service identifier in action assertions
 * @param metadata - optional raw metadata XML for resolving standard button visibility (Create/Delete)
 * @param log - optional logger instance
 * @returns body sections data including sub-sections
 */
function extractObjectPageBodySectionsData(
    objectPage: PageWithModelV4,
    convertedMetadata?: ConvertedMetadata,
    schemaNamespace?: string,
    metadata?: string,
    log?: Logger
): BodySectionFeatureData[] {
    const bodySections: BodySectionFeatureData[] = [];
    if (objectPage.model) {
        const sectionsAggregation = getAggregations(objectPage.model.root)['sections'];
        const sections = getAggregations(sectionsAggregation) as Record<string, BodySectionItem>;
        Object.entries(sections).forEach(([sectionKey, section]) => {
            const sectionId = getSectionIdentifier(section) ?? sectionKey;
            const subSections = extractBodySubSectionsData(section, sectionId, convertedMetadata, objectPage.entitySet);
            const navigationProperty = getNavigationPropertyFromKey(sectionKey);
            const isTable = isTableSection(section);
            const fields =
                section.custom || isTable
                    ? []
                    : extractFormFields(section, convertedMetadata, objectPage.entitySet);
            const tableColumns = section.custom || !isTable ? {} : extractTableColumnsFromNode(section);
            const contactCardColumns = section.custom || !isTable ? [] : extractContactCardColumnsFromNode(section);
            const sectionData: BodySectionFeatureData = {
                id: sectionId,
                navigationProperty,
                isTable,
                custom: !!section.custom,
                order: section?.order ?? -1,
                fields:
                    section.custom || isTable
                        ? []
                        : extractFormFields(section, convertedMetadata, objectPage.entitySet),
                tableColumns: section.custom || !isTable ? {} : extractTableColumnsFromNode(section),
                contactCardFields: pickContactCardFields(fields),
                contactCardColumns,
                subSections,
                actions:
                    !section.custom && convertedMetadata && schemaNamespace
                        ? extractSectionActions(section, convertedMetadata, schemaNamespace)
                        : []
            };
            // For table sections, resolve Create/Delete visibility from target entity set
            if (isTable && navigationProperty && metadata && convertedMetadata) {
                const targetEntitySet = resolveNavigationTargetEntitySet(
                    convertedMetadata,
                    objectPage.entitySet,
                    navigationProperty
                );
                if (targetEntitySet) {
                    const buttonVisibility = safeCheckButtonVisibility(metadata, targetEntitySet, log);
                    sectionData.createButton = buttonVisibility?.create;
                    sectionData.deleteButton = buttonVisibility?.delete;
                }
            }
            bodySections.push(sectionData);
        });
    }

    return bodySections;
}

/**
 * Extracts header-level action button states from an object page model.
 *
 * @param objectPage - object page from the application model
 * @param convertedMetadata - converted OData metadata for resolving action availability
 * @param schemaNamespace - OData schema namespace used as service identifier in action assertions
 * @returns array of action button states for the header toolbar
 */
function extractHeaderActions(
    objectPage: PageWithModelV4,
    convertedMetadata: ConvertedMetadata,
    schemaNamespace: string
): ActionButtonState[] {
    if (!objectPage.model) {
        return [];
    }
    const headerAgg = getAggregations(objectPage.model.root)['header'];
    const actionsAgg = getAggregations(headerAgg)['actions'];
    const actionEntries = getAggregations(actionsAgg) as Record<string, AggregationItem>;
    return Object.entries(actionEntries)
        .map(([key, item]) =>
            buildActionStateFromSpecModelKey(key, item.description, convertedMetadata, schemaNamespace)
        )
        .filter((actionState): actionState is ActionButtonState => actionState !== undefined);
}

/**
 * Extracts section-level action button states from a body section.
 * For table sections, actions are extracted from the table toolbar; for form sections from the form actions aggregation.
 *
 * @param section - body section entry from the application model
 * @param convertedMetadata - converted OData metadata for resolving action availability
 * @param schemaNamespace - OData schema namespace used as service identifier in action assertions
 * @returns array of action button states for the section toolbar
 */
function extractSectionActions(
    section: BodySectionItem,
    convertedMetadata: ConvertedMetadata,
    schemaNamespace: string
): ActionButtonState[] {
    let actionsAgg: AggregationItem | undefined;

    if (isTableSection(section)) {
        const tableAgg = getAggregations(section)['table'];
        const toolBarAgg = getAggregations(tableAgg)['toolBar'];
        actionsAgg = getAggregations(toolBarAgg)['actions'] as AggregationItem;
    } else {
        const formAgg = getAggregations(section)['form'] as AggregationItem;
        actionsAgg = getAggregations(formAgg)['actions'] as AggregationItem;
    }

    if (!actionsAgg) {
        return [];
    }
    const actionEntries = getAggregations(actionsAgg) as Record<string, AggregationItem>;
    return Object.entries(actionEntries)
        .map(([key, item]) =>
            buildActionStateFromSpecModelKey(key, item.description, convertedMetadata, schemaNamespace)
        )
        .filter((actionState): actionState is ActionButtonState => actionState !== undefined);
}

/**
 * Extracts sub-sections data from a body section.
 *
 * @param section - body section entry from the application model
 * @param parentSectionId - identifier of the parent section (used as fallback key prefix)
 * @param convertedMetadata - optional converted OData metadata for drilling into ConnectedFields / FieldGroup wrappers
 * @param entitySetName - the entity set the section is bound to (used to locate the entity type)
 * @returns array of sub-section feature data
 */
function extractBodySubSectionsData(
    section: SectionItem,
    parentSectionId: string,
    convertedMetadata?: ConvertedMetadata,
    entitySetName?: string
): BodySubSectionFeatureData[] {
    const subSections: BodySubSectionFeatureData[] = [];
    const sectionAggregations = getAggregations(section);
    const subSectionsAggregation = sectionAggregations['subSections'] ?? sectionAggregations['subsections'];
    const subSectionItems = getAggregations(subSectionsAggregation) as Record<string, BodySectionItem>;
    Object.entries(subSectionItems).forEach(([subSectionKey, subSection]) => {
        const subSectionId = getSectionIdentifier(subSection) ?? `${parentSectionId}_${subSectionKey}`;
        const isTable = isTableSection(subSection);
        const fields =
            subSection.custom || isTable ? [] : extractFormFields(subSection, convertedMetadata, entitySetName);
        const tableColumns = subSection.custom || !isTable ? {} : extractTableColumnsFromNode(subSection);
        const contactCardColumns =
            subSection.custom || !isTable ? [] : extractContactCardColumnsFromNode(subSection);
        subSections.push({
            id: subSectionId,
            navigationProperty: getNavigationPropertyFromKey(subSectionKey),
            isTable,
            custom: !!subSection.custom,
            order: subSection?.order ?? -1, // put a negative order number to signal that order was not in spec
            contactCardFields: pickContactCardFields(fields),
            contactCardColumns
            fields: subSection.custom || isTable ? [] : extractFormFields(subSection, convertedMetadata, entitySetName),
            tableColumns: subSection.custom || !isTable ? {} : extractTableColumnsFromNode(subSection)
        });
    });
    return subSections;
}

/**
 * Filters form fields down to those rendered as Contact-card links (`@Communication.Contact`).
 *
 * @param fields - all form fields of a (sub-)section
 * @returns Contact-card fields, addressed via the qualified `<property>/<targetAnnotation>` form
 */
function pickContactCardFields(fields: SectionFormField[]): ContactCardField[] {
    return fields
        .filter((field) => field.targetAnnotation === 'Contact')
        .map((field) => ({ property: field.property }));
}

/**
 * Filters header field-group fields down to Contact-card entries and projects them to
 * the `<property>/Contact` form expected by `onHeader().iClickLink({ property })`.
 *
 * @param fields - header field-group fields with optional `field` and `targetAnnotation`
 * @returns Contact-card descriptors usable as `iClickLink` / `iCheckLink` arguments
 */
function pickContactCardFieldsFromHeader(fields: FormField[] | undefined): ContactCardField[] {
    if (!fields) {
        return [];
    }
    return fields
        .filter((field) => field.targetAnnotation === 'Contact' && field.field)
        .map((field) => ({ property: `${field.field}/${field.targetAnnotation}` }));
}

/**
 * Extracts form field property paths from a body sub-section's form aggregation.
 *
 * @param subSection - body sub-section entry from the application model
 * @param convertedMetadata - optional converted OData metadata for drilling into ConnectedFields / FieldGroup wrappers
 * @param entitySetName - the entity set the sub-section is bound to (used to locate the entity type)
 * @returns array of form field property paths for use with iCheckField({ property })
 */
function extractFormFields(
    subSection: BodySectionItem,
    convertedMetadata?: ConvertedMetadata,
    entitySetName?: string
): SectionFormField[] {
    const fields: SectionFormField[] = [];
    const formAggregation = getAggregations(subSection)['form'] as AggregationItem;
    if (!formAggregation) {
        return fields;
    }
    const fieldsAggregation = getAggregations(formAggregation)['fields'] as AggregationItem;
    const fieldItems = getAggregations(fieldsAggregation) as Record<string, FieldItem>;
    const entityType =
        convertedMetadata && entitySetName ? resolveEntityType(convertedMetadata, entitySetName) : undefined;
    Object.values(fieldItems).forEach((fieldItem) => {
        const annotationParts = parseDataFieldForAnnotationName(fieldItem.name);
        const valueProperty = fieldItem.schema?.keys?.find((key) => key.name === 'Value')?.value;
        const baseProperty = valueProperty ?? annotationParts?.property;
        if (!baseProperty) {
            return;
        }

        if (annotationParts) {
            const qualifier = annotationParts.targetAnnotation;
            if (qualifier === 'Contact') {
                fields.push({
                    property: `${baseProperty}/${qualifier}`,
                    targetAnnotation: qualifier
                });
            } else if (annotationParts.property === 'ConnectedFields' && entityType) {
                resolveConnectedFieldsInnerProperties(entityType, qualifier).forEach((property) => {
                    fields.push({ property, connectedFields: qualifier });
                });
            } else if (annotationParts.property === 'FieldGroup' && entityType) {
                resolveFieldGroupInnerProperties(entityType, qualifier).forEach((property) => {
                    fields.push({ property, fieldGroup: qualifier });
                });
            }
            // ConnectedFields/FieldGroup without metadata: skip
            // Unknown annotation wrapper type: skip
        } else {
            fields.push({ property: baseProperty });
        }
    });
    return fields;
}

/**
 * Resolves the inner `Value` paths of a `@UI.ConnectedFields#<qualifier>` annotation.
 *
 * @param entityType - the entity type carrying the annotation
 * @param qualifier - the annotation qualifier
 * @returns the inner DataField property paths
 */
function resolveConnectedFieldsInnerProperties(entityType: EntityType, qualifier: string): string[] {
    const annotation = entityType.annotations?.UI?.[
        `ConnectedFields#${qualifier}` as keyof typeof entityType.annotations.UI
    ] as { Data?: Record<string, { Value?: { path?: string } }> } | undefined;
    const dictionary = annotation?.Data ?? {};
    return Object.values(dictionary)
        .map((dataField) => dataField?.Value?.path)
        .filter((path): path is string => Boolean(path));
}

/**
 * Resolves the inner `Value` paths of a `@UI.FieldGroup#<qualifier>` annotation.
 *
 * @param entityType - the entity type carrying the annotation
 * @param qualifier - the annotation qualifier
 * @returns the inner DataField property paths
 */
function resolveFieldGroupInnerProperties(entityType: EntityType, qualifier: string): string[] {
    const annotation = entityType.annotations?.UI?.[
        `FieldGroup#${qualifier}` as keyof typeof entityType.annotations.UI
    ] as { Data?: { Value?: { path?: string } }[] } | undefined;
    const dataFields = annotation?.Data ?? [];
    return dataFields.map((dataField) => dataField?.Value?.path).filter((path): path is string => Boolean(path));
}

/**
 * Looks up the entity type for the given entity set name in the converted metadata.
 *
 * @param convertedMetadata - the converted OData metadata
 * @param entitySetName - the entity set name
 * @returns the entity type, or undefined if not found
 */
function resolveEntityType(convertedMetadata: ConvertedMetadata, entitySetName: string): EntityType | undefined {
    return convertedMetadata.entitySets.find((es) => es.name === entitySetName)?.entityType;
}

/**
 * Extracts the OData navigation property from a spec model section key.
 * Section keys for table sections follow the pattern `_NavProperty::@annotation`, so the
 * navigation property is the part before `::` when it starts with an underscore.
 *
 * @param sectionKey - the key of the section in the spec model aggregations
 * @returns navigation property (e.g. '_Booking'), or undefined for non-navigation sections
 */
function getNavigationPropertyFromKey(sectionKey: string): string | undefined {
    const prefix = sectionKey.split('::')[0];
    return prefix.startsWith('_') ? prefix : undefined;
}

/**
 * Resolves the target entity set name for a navigation property by looking up navigation
 * property bindings in the source entity set's metadata.
 *
 * @param convertedMetadata - converted OData metadata
 * @param sourceEntitySetName - the name of the source entity set (the Object Page's entity set)
 * @param navigationProperty - the navigation property name (e.g. '_Booking')
 * @returns the target entity set name, or undefined if resolution fails
 */
function resolveNavigationTargetEntitySet(
    convertedMetadata: ConvertedMetadata,
    sourceEntitySetName: string | undefined,
    navigationProperty: string
): string | undefined {
    if (!sourceEntitySetName) {
        return undefined;
    }
    const sourceEntitySet = convertedMetadata.entitySets.find((es) => es.name === sourceEntitySetName);
    if (!sourceEntitySet?.navigationPropertyBinding) {
        return undefined;
    }
    const navPropName = navigationProperty.startsWith('_') ? navigationProperty.substring(1) : navigationProperty;
    const binding = sourceEntitySet.navigationPropertyBinding[navPropName];
    return binding?.name;
}

/**
 * Gets the identifier of a section for OPA5 tests.
 *
 * @param section - section entry from ux specification
 * @returns identifier of the section for OPA5 tests
 */
function getSectionIdentifier(section: SectionItem): string | undefined {
    return getSectionIdentifierFromKey(section) ?? getSectionIdentifierFromTitle(section);
}

/**
 * Gets the identifier of a section from the 'ID' or 'Key' entry in the schema keys for OPA5 tests.
 * If no such entry is found, undefined is returned.
 *
 * @param section - section entry from ux specification
 * @returns identifier of the section for OPA5 tests; can be undefined if no 'ID' or 'Key' entry is found
 */
function getSectionIdentifierFromKey(section: SectionItem): string | undefined {
    const keyEntry = section?.schema?.keys?.find((key) => key.name === 'ID' || key.name === 'Key');
    return keyEntry ? keyEntry.value.replace('#', '::') : undefined;
}

/**
 * Gets the identifier of a section from its title for OPA5 tests.
 *
 * @param section - section entry from ux specification
 * @returns identifier of the section for OPA5 tests; can be undefined if title is not in expected format
 */
function getSectionIdentifierFromTitle(section: SectionItem): string | undefined {
    return section.title?.slice(section.title?.lastIndexOf('.') + 1).replace('#', '::') ?? undefined;
}

/**
 * Gets the stashed flag of a header section for OPA5 tests.
 *
 * @param headerSection - header section entry from ux specification
 * @returns stashed flag of the header section for OPA5 tests; can be a boolean or a string depending on the specification version
 */
function getSectionStashedFlag(headerSection: HeaderSectionItem): string | boolean {
    return headerSection?.properties?.stashed?.freeText ?? false;
}

/**
 * Gets form fields of a header section for OPA5 tests.
 *
 * @param section - section entry from ux specification
 * @returns an array of form fields with their identifiers and bound properties for OPA5 tests
 */
function getHeaderSectionFormFields(section: HeaderSectionItem): HeaderSectionFeatureData['fields'] {
    const formFields: HeaderSectionFeatureData['fields'] = [];
    const formAggregation = getAggregations(section)?.form as AggregationItem;
    const fieldsAggregation = getAggregations(formAggregation)?.fields as AggregationItem;
    const fields = getAggregations(fieldsAggregation) as Record<string, FieldItem>;
    if (fields) {
        Object.keys(fields).forEach((fieldKey) => {
            const field = fields[fieldKey];
            const fieldData = getFormFieldData(field, formAggregation);
            if (fieldData) {
                formFields.push(fieldData);
            }
        });
    }
    return formFields;
}

/**
 * Gets field data for a form field in a header section for OPA5 tests, including its identifier, bound property, and target annotation.
 *
 * @param field - field entry from ux specification
 * @param formAggregation - form aggregation entry from ux specification, used to get field group qualifier for the field
 * @returns field data including its identifier, bound property, and target annotation for OPA5 tests; can be undefined if the field type is not supported or necessary information is missing
 */
function getFormFieldData(field: FieldItem, formAggregation: AggregationItem): FormField | undefined {
    if (!field.name) {
        return undefined;
    }
    let [_, propertyName, targetAnnotation]: (string | undefined)[] = field.name.split('::');

    // fall back to Value property in case of malformed or otherwise irregular field name
    if (!propertyName) {
        propertyName = field.schema.keys.find((key) => key.name === 'Value')?.value;
    }

    const fieldIdentifier = {
        fieldGroupQualifier: getFieldGroupQualifier(formAggregation),
        field: propertyName,
        targetAnnotation: targetAnnotation
    };

    // avoid creating identifier if field property could not be determined
    return fieldIdentifier.field ? fieldIdentifier : undefined;
}

/**
 * Gets the field group qualifier of a form aggregation for OPA5 tests.
 *
 * @param formAggregation - form aggregation entry from ux specification
 * @returns field group qualifier for OPA5 tests; can be undefined if not found
 */
function getFieldGroupQualifier(formAggregation: AggregationItem): string | undefined {
    const fullTarget = formAggregation?.schema?.keys?.find((key) => key.name === 'Target')?.value;
    return fullTarget?.split('#')[1];
}

/**
 * Checks if the section contains a microChart based on it's name.
 *
 * @param section - section entry from ux specification
 * @returns true if the section seems to contain a microChart, false otherwise
 */
function isSectionMicroChart(section: SectionItem): boolean {
    return section?.schema?.dataType === 'ChartDefinition';
}

/**
 * Detects whether a body section represents a table.
 * The spec model exposes the section-level `isTable` flag inconsistently — for OP body sections
 * driven by `_<NavProp>/@UI.LineItem` facets the flag is not set, but the section carries a
 * `table` aggregation. Presence of that aggregation is the authoritative signal.
 *
 * @param section - body section or sub-section entry from ux specification
 * @returns true if the section is a table section
 */
function isTableSection(section: BodySectionItem): boolean {
    return !!section.isTable || !!getAggregations(section).table;
}

/**
 * Checks if the section contains a form based on it's aggregations.
 *
 * @param section - section entry from ux specification
 * @returns true if the section seems to contain a form, false otherwise
 */
function isFormSection(section: SectionItem): boolean {
    return getAggregations(section)?.form !== undefined;
}

/**
 * Retrieves navigation targets from the given page model.
 *
 * @param pageModel - The page model containing navigation definitions.
 * @returns An array of navigation target identifiers.
 */
function getNavigationRoutes(pageModel: PageWithModelV4): { identifier: string; route: string }[] {
    const navigationTargets: { identifier: string; route: string }[] = [];
    if (!pageModel?.navigation) {
        return navigationTargets;
    }

    Object.keys(pageModel.navigation).forEach((navigationKey) => {
        if (pageModel.navigation) {
            const navigationEntry = pageModel.navigation[navigationKey];
            navigationTargets.push({
                identifier: navigationKey,
                route:
                    typeof navigationEntry === 'string' ? navigationEntry : (navigationEntry as { route: string }).route
            });
        }
    });

    return navigationTargets;
}
