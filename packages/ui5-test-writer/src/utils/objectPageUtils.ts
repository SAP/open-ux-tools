import type { Logger } from '@sap-ux/logger';
import type { ApplicationModel } from '@sap/ux-specification/dist/types/src/parser';
import type { HeaderSectionFeatureData, ObjectPageFeatureData, ObjectPageNavigationParents } from '../types';
import type { PageWithModelV4 } from '@sap/ux-specification/dist/types/src/parser/application';
import {
    type AggregationItem,
    type FieldItem,
    type HeaderSectionItem,
    type SectionItem,
    getAggregations
} from './modelUtils';
import { PageTypeV4 } from '@sap/ux-specification/dist/types/src/common/page';

/**
 * Extracts feature data for object pages from the application model.
 *
 * @param applicationModel - the application model containing page definitions
 * @param log - optional logger instance
 * @returns a record of object page feature data
 */
export async function getObjectPageFeatureData(
    applicationModel: ApplicationModel,
    log?: Logger
): Promise<ObjectPageFeatureData[]> {
    const objectPageFeatureData: ObjectPageFeatureData[] = [];
    const objectPages = getObjectPages(applicationModel);
    if (!objectPages || Object.keys(objectPages).length === 0) {
        log?.warn('Object Pages not found in application model. Dynamic tests will not be generated for Object Pages.');
        return objectPageFeatureData;
    }

    // attempt to get individual feature data for each object page
    for (const objectPageKey of Object.keys(objectPages)) {
        const objectPage = objectPages[objectPageKey];
        const pageFeatureData: ObjectPageFeatureData = {};

        pageFeatureData.name = objectPageKey;
        pageFeatureData.navigationParents = getObjectPageNavigationParents(objectPageKey, applicationModel);
        // extract header sections (facets)
        pageFeatureData.headerSections = extractObjectPageHeaderSectionsData(objectPage as PageWithModelV4);
        objectPageFeatureData.push(pageFeatureData);
    }

    return objectPageFeatureData;
}

/**
 * Retrieves all Object Page definitions from the given application model, as long as the page is reachable via standard navigation routes.
 *
 * @param applicationModel - The application model containing page definitions.
 * @returns An array of Object Page definitions.
 */
function getObjectPages(applicationModel: ApplicationModel): { [key: string]: PageWithModelV4 } {
    const objectPages: { [key: string]: PageWithModelV4 } = {};
    for (const pageKey in applicationModel.pages) {
        const page = applicationModel.pages[pageKey];
        if (page.pageType === PageTypeV4.ObjectPage) {
            objectPages[pageKey] = page;
        }
    }
    return objectPages;
}

/**
 * Finds parent pages for the object page, and returns their identifiers.
 *
 * @param targetObjectPageKey - key of the target object page
 * @param applicationModel  - the application model containing page definitions
 * @returns navigation data including parent page identifiers
 */
function getObjectPageNavigationParents(
    targetObjectPageKey: string,
    applicationModel: ApplicationModel
): ObjectPageNavigationParents {
    const listReportPageKey = getListReportPageKey(applicationModel);
    const objectPages = getObjectPages(applicationModel);
    const navigationParents: ObjectPageNavigationParents = {
        parentLRName: listReportPageKey ?? '' // app is possibly malformed if no LR found
    };

    Object.keys(objectPages).forEach((objectPageKey) => {
        const objectPage = objectPages[objectPageKey];
        const navigationRoutes = getNavigationRoutes(objectPage as PageWithModelV4);
        const routeToTargetOP = navigationRoutes.find((nav) => nav.route === targetObjectPageKey);
        if (routeToTargetOP) {
            navigationParents.parentOPName = objectPageKey;
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
 * Gets the identifier of a section for OPA5 tests.
 *
 * @param section - section entry from ux specification
 * @returns identifier of the section for OPA5 tests
 */
function getSectionIdentifier(section: SectionItem): string | undefined {
    return getSectionIdentifierFromKey(section) ?? getSectionIdentifierFromTitle(section);
}

/**
 * Gets the identifier of a section from the 'ID' entry in the schema keys for OPA5 tests.
 * If no such entry is found, undefined is returned.
 *
 * @param section - section entry from ux specification
 * @returns identifier of the section for OPA5 tests; can be undefined if no 'ID' entry is found
 */
function getSectionIdentifierFromKey(section: SectionItem): string | undefined {
    const keyEntry = section?.schema?.keys?.find((key) => key.name === 'ID');
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
            if (field?.name) {
                formFields.push({
                    fieldGroupQualifier: getFieldGroupQualifier(formAggregation),
                    field: field.schema.keys.find((key) => key.name === 'Value')?.value
                });
            }
        });
    }
    return formFields;
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
 * Retrieves the key of the List Report page from the given application model.
 *
 * @param applicationModel - The application model containing page definitions.
 * @returns The key of the List Report page, or null if not found.
 */
function getListReportPageKey(applicationModel: ApplicationModel): string | null {
    for (const pageKey in applicationModel.pages) {
        const page = applicationModel.pages[pageKey];
        if (page.pageType === PageTypeV4.ListReport) {
            return pageKey;
        }
    }
    return null;
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

    Object.keys(pageModel.navigation).map((navigationKey) => {
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
