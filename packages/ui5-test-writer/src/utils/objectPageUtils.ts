import type { Logger } from '@sap-ux/logger';
import type { ApplicationModel } from '@sap/ux-specification/dist/types/src/parser';
import type {
    FormField,
    BodySectionFeatureData,
    BodySubSectionFeatureData,
    HeaderSectionFeatureData,
    ObjectPageFeatures,
    ObjectPageNavigationParents
} from '../types';
import type { PageWithModelV4 } from '@sap/ux-specification/dist/types/src/parser/application';
import {
    type AggregationItem,
    type BodySectionItem,
    type FieldItem,
    type HeaderSectionItem,
    type SectionItem,
    getAggregations
} from './modelUtils';
import { PageTypeV4 } from '@sap/ux-specification/dist/types/src/common/page';

/**
 * Extracts feature data for object pages from the application model.
 *
 * @param objectPages - the array of object pages extracted from the application model
 * @param listReportPageKey - the key of the List Report page in the application model, used to find navigation routes to object pages
 * @param log - optional logger instance
 * @returns a record of object page feature data
 */
export async function getObjectPageFeatures(
    objectPages: PageWithModelV4[],
    listReportPageKey?: string,
    log?: Logger
): Promise<ObjectPageFeatures[]> {
    const objectPageFeatures: ObjectPageFeatures[] = [];
    if (!objectPages || objectPages.length === 0) {
        log?.warn('Object Pages not found in application model. Dynamic tests will not be generated for Object Pages.');
        return objectPageFeatures;
    }

    // attempt to get individual feature data for each object page
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
        // extract body sections
        pageFeatureData.bodySections = extractObjectPageBodySectionsData(objectPage);
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
                title: section.title
            };
            if (sectionData.form) {
                sectionData.fields = getHeaderSectionFormFields(section);
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
 * @returns body sections data including sub-sections
 */
function extractObjectPageBodySectionsData(objectPage: PageWithModelV4): BodySectionFeatureData[] {
    const bodySections: BodySectionFeatureData[] = [];
    if (objectPage.model) {
        const sectionsAggregation = getAggregations(objectPage.model.root)['sections'];
        const sections = getAggregations(sectionsAggregation) as Record<string, BodySectionItem>;
        Object.entries(sections).forEach(([sectionKey, section]) => {
            const sectionId = getSectionIdentifier(section) ?? sectionKey;
            const subSections = extractBodySubSectionsData(section, sectionId);
            bodySections.push({
                id: sectionId,
                isTable: !!section.isTable,
                custom: !!section.custom,
                order: section?.order ?? -1, // put a negative order number to signal that order was not in spec
                subSections
            });
        });
    }

    return bodySections;
}

/**
 * Extracts sub-sections data from a body section.
 *
 * @param section - body section entry from the application model
 * @param parentSectionId - identifier of the parent section (used as fallback key prefix)
 * @returns array of sub-section feature data
 */
function extractBodySubSectionsData(section: SectionItem, parentSectionId: string): BodySubSectionFeatureData[] {
    const subSections: BodySubSectionFeatureData[] = [];
    const subSectionsAggregation = getAggregations(section)['subSections'];
    const subSectionItems = getAggregations(subSectionsAggregation) as Record<string, BodySectionItem>;
    Object.entries(subSectionItems).forEach(([subSectionKey, subSection]) => {
        const subSectionId = getSectionIdentifier(subSection) ?? `${parentSectionId}_${subSectionKey}`;
        subSections.push({
            id: subSectionId,
            isTable: !!subSection.isTable,
            custom: !!subSection.custom,
            order: subSection?.order ?? -1 // put a negative order number to signal that order was not in spec
        });
    });
    return subSections;
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
