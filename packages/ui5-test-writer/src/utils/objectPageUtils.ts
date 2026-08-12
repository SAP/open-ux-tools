import type { Logger } from '@sap-ux/logger';
import type { Manifest } from '@sap-ux/project-access';
import type { ApplicationModel } from '@sap/ux-specification/dist/types/src/parser/index.js';
import type {
    ActionButtonState,
    MenuActionState,
    ContactCardField,
    FormField,
    SectionFormField,
    BodySectionFeatureData,
    BodySubSectionFeatureData,
    HeaderSectionFeatureData,
    ObjectPageFeatures,
    ObjectPageNavigationParent,
    ObjectPageNavigationParents
} from '../types.js';
import type { PageWithModelV4 } from '@sap/ux-specification/dist/types/src/parser/application.js';
import {
    type AggregationItem,
    type BodySectionItem,
    type FieldItem,
    type HeaderItem,
    type HeaderSectionItem,
    type SectionItem,
    getAggregations,
    parseDataFieldForAnnotationName
} from './modelUtils.js';
import { type I18nLabelResolver, passthroughLabelResolver } from './i18nUtils.js';
import { extractContactCardColumnsFromNode, extractTableColumnsFromNode } from './tableUtils.js';
import { PageTypeV4 } from '@sap/ux-specification/dist/types/src/common/page.js';
import { parse } from '@sap-ux/edmx-parser';
import { convert } from '@sap-ux/annotation-converter';
import type { ConvertedMetadata, EntityType } from '@sap-ux/vocabularies-types';
import { buildActionStateFromSpecModelKey, safeCheckButtonVisibility, safeCheckEditVisibility } from './actionUtils.js';
import { getListReportViews } from './listReportUtils.js';

/**
 * Extracts feature data for object pages from the application model.
 *
 * @param objectPages - the array of object pages extracted from the application model
 * @param listReportPageKey - the key of the List Report page in the application model, used to find navigation routes to object pages
 * @param log - optional logger instance
 * @param metadata - optional metadata for the OPA test generation
 * @param manifest - optional application manifest, used to resolve the parent List Report's default table tab
 * @param listReportEntitySet - entity set of the parent List Report, used to resolve the originating view
 * @param resolveLabel - resolver for i18n placeholder labels (`{i18n>key}` → translated text)
 * @returns a record of object page feature data
 */
export async function getObjectPageFeatures(
    objectPages: PageWithModelV4[],
    listReportPageKey?: string,
    log?: Logger,
    metadata?: string,
    manifest?: Manifest,
    listReportEntitySet?: string,
    resolveLabel: I18nLabelResolver = passthroughLabelResolver
): Promise<ObjectPageFeatures[]> {
    const objectPageFeatures: ObjectPageFeatures[] = [];
    if (!objectPages || objectPages.length === 0) {
        log?.warn('Object Pages not found in application model. Dynamic tests will not be generated for Object Pages.');
        return objectPageFeatures;
    }

    // attempt to get individual feature data for each object page
    const convertedMetadata = metadata ? convert(parse(metadata)) : undefined;
    const schemaNamespace = convertedMetadata?.namespace ?? '';
    // Non-custom tabs of the parent List Report with their optional entity set. Used to pick the
    // tab a given Object Page is reached from on multi-view LRs; empty for single-table LRs.
    const listReportViews = getListReportViews(manifest, listReportPageKey);

    for (const objectPage of objectPages) {
        const pageFeatureData: ObjectPageFeatures = {} as ObjectPageFeatures;

        pageFeatureData.name = objectPage.name!;
        pageFeatureData.navigationParents = getObjectPageNavigationParents(
            objectPage.name!,
            objectPages,
            listReportPageKey,
            resolveOriginatingView(listReportViews, objectPage.entitySet, listReportEntitySet)
        );
        // extract header title binding path (for iCheckTitlePath)
        pageFeatureData.headerTitle = getHeaderTitlePath(objectPage);
        // extract header sections (facets)
        pageFeatureData.headerSections = extractObjectPageHeaderSectionsData(objectPage);
        // extract body sections (includes section-level actions and standard create/delete buttons)
        pageFeatureData.bodySections = extractObjectPageBodySectionsData(
            objectPage,
            convertedMetadata,
            schemaNamespace,
            metadata,
            log,
            resolveLabel
        );
        // extract header-level actions
        pageFeatureData.headerActions = convertedMetadata
            ? extractHeaderActions(objectPage, convertedMetadata, schemaNamespace, resolveLabel)
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
 * Finds the chain of parent Object Pages leading from the List Report down to the target page.
 *
 * @param targetObjectPageKey - key of the target object page
 * @param objectPages - the array of object pages extracted from the application model
 * @param listReportPageKey - the key of the List Report page in the application model, used to find navigation routes to object pages
 * @param originatingView - the parent List Report view/tab this Object Page is reached from (undefined for single-table LRs)
 * @returns navigation data including the ordered ancestor Object Page chain
 */
function getObjectPageNavigationParents(
    targetObjectPageKey: string,
    objectPages: PageWithModelV4[],
    listReportPageKey?: string,
    originatingView?: OriginatingView
): ObjectPageNavigationParents {
    const parentOPs: ObjectPageNavigationParent[] = [];
    const visited = new Set<string>([targetObjectPageKey]); // guard against infinite loop in case of invalid manifest entries
    let cursor = targetObjectPageKey;

    while (true) {
        const childKey = cursor;
        let parent: PageWithModelV4 | undefined;
        let parentNavigationProperty: string | undefined;
        for (const objectPage of objectPages) {
            const route = getNavigationRoutes(objectPage).find((navigation) => navigation.route === childKey);
            if (route) {
                parent = objectPage;
                parentNavigationProperty = route.identifier;
                break;
            }
        }
        if (!parent?.name || !parentNavigationProperty || visited.has(parent.name)) {
            break;
        }
        visited.add(parent.name);
        parentOPs.unshift({ name: parent.name, navigationProperty: parentNavigationProperty });
        cursor = parent.name;
    }

    return {
        parentLRName: listReportPageKey ?? '', // app is possibly malformed if no LR found
        parentLRViewKey: originatingView?.key,
        parentLRViewIsDefault: originatingView?.isDefault,
        parentOPs
    };
}

type OriginatingView = { key: string; isDefault: boolean };

/**
 * Resolves which List Report view/tab exposes a given Object Page. A view inherits the List Report's
 * main entity set when it declares none of its own; the first non-custom view is the default tab.
 *
 * @param views - the parent List Report's non-custom views, in manifest order
 * @param objectPageEntitySet - the Object Page's entity set
 * @param listReportEntitySet - the List Report's main entity set
 * @returns the originating view, or undefined for single-table List Reports
 */
export function resolveOriginatingView(
    views: { key: string; entitySet?: string }[],
    objectPageEntitySet?: string,
    listReportEntitySet?: string
): OriginatingView | undefined {
    if (views.length === 0) {
        return undefined;
    }
    // No match falls back to the first (default) view, which is where a main-entity OP belongs — this also covers an undefined listReportEntitySet.
    const matchIndex = objectPageEntitySet
        ? views.findIndex((view) => (view.entitySet ?? listReportEntitySet) === objectPageEntitySet)
        : -1;
    const index = matchIndex >= 0 ? matchIndex : 0;
    return { key: views[index].key, isDefault: index === 0 };
}

/**
 * Returns the OData property path the Object Page header title is bound to, for use with
 * `iCheckTitlePath`. Returns undefined for static titles that expose no binding path.
 *
 * @param objectPage - object page from the application model
 * @returns the title binding path, or undefined
 */
function getHeaderTitlePath(objectPage: PageWithModelV4): string | undefined {
    if (!objectPage.model) {
        return undefined;
    }
    const header = getAggregations(objectPage.model.root)['header'] as HeaderItem | undefined;
    const titlePath = header?.properties?.title?.value;
    if (!titlePath) {
        return undefined;
    }
    return titlePath;
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
            if (isSectionHidden(section)) {
                return;
            }
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
 * @param resolveLabel
 * @returns body sections data including sub-sections
 */
function extractObjectPageBodySectionsData(
    objectPage: PageWithModelV4,
    convertedMetadata?: ConvertedMetadata,
    schemaNamespace?: string,
    metadata?: string,
    log?: Logger,
    resolveLabel: I18nLabelResolver = passthroughLabelResolver
): BodySectionFeatureData[] {
    const bodySections: BodySectionFeatureData[] = [];
    if (objectPage.model) {
        const sectionsAggregation = getAggregations(objectPage.model.root)['sections'];
        const sections = getAggregations(sectionsAggregation) as Record<string, BodySectionItem>;
        Object.entries(sections).forEach(([sectionKey, section]) => {
            if (isSectionHidden(section)) {
                return;
            }
            const sectionId = getSectionIdentifier(section) ?? sectionKey;
            const subSections = extractBodySubSectionsData(section, sectionId, convertedMetadata, objectPage.entitySet);
            const navigationProperty = getNavigationPropertyFromKey(sectionKey);
            const isTable = isTableSection(section);
            const fields =
                section.custom || isTable ? [] : extractFormFields(section, convertedMetadata, objectPage.entitySet);
            const tableColumns = section.custom || !isTable ? {} : extractTableColumnsFromNode(section);
            const contactCardColumns = section.custom || !isTable ? [] : extractContactCardColumnsFromNode(section);
            const sectionData: BodySectionFeatureData = {
                id: sectionId,
                navigationProperty,
                isTable,
                custom: !!section.custom,
                order: section?.order ?? -1,
                fields,
                tableColumns,
                contactCardFields: pickContactCardFields(fields),
                contactCardColumns,
                subSections,
                actions:
                    !section.custom && convertedMetadata && schemaNamespace
                        ? extractSectionActions(section, convertedMetadata, schemaNamespace, resolveLabel)
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
 * Determines whether an action aggregation entry is a menu (drop-down) grouping several actions.
 *
 * @param item - action aggregation entry from the spec model
 * @returns true if the entry represents an annotation menu or a manifest (custom) menu
 */
function isMenuActionItem(item: AggregationItem): boolean {
    return item.menuType !== undefined || item.schema?.dataType === 'DataFieldForActionGroup';
}

/**
 * Builds the individual menu item states contained in a menu action node.
 *
 * @param menuItem - the menu container aggregation entry
 * @param convertedMetadata - converted OData metadata for resolving annotation actions
 * @param schemaNamespace - OData schema namespace used as service identifier
 * @param resolveLabel
 * @returns array of menu item states
 */
function buildMenuItemStates(
    menuItem: AggregationItem,
    convertedMetadata: ConvertedMetadata,
    schemaNamespace: string,
    resolveLabel: I18nLabelResolver
): MenuActionState[] {
    const innerContainer = getAggregations(menuItem)['actions'];
    if (!innerContainer) {
        return [];
    }
    const innerEntries = getAggregations(innerContainer) as Record<string, AggregationItem>;
    return Object.entries(innerEntries).map(([childKey, child]) => {
        const annotationState = buildActionStateFromSpecModelKey(
            childKey,
            child.description,
            convertedMetadata,
            schemaNamespace
        );
        if (annotationState) {
            return {
                label: annotationState.label,
                visible: annotationState.visible,
                service: annotationState.service,
                action: annotationState.action,
                unbound: annotationState.unbound,
                enabled: annotationState.enabled,
                dynamicPath: annotationState.dynamicPath
            };
        }
        const { label, unresolved } = resolveLabel(child.description);
        return { label, visible: true, labelUnresolved: unresolved || undefined };
    });
}

/**
 * Builds a menu action button state from a menu aggregation entry (annotation or custom menu).
 *
 * @param menuItem - the menu container aggregation entry
 * @param convertedMetadata - converted OData metadata for resolving annotation actions
 * @param schemaNamespace - OData schema namespace used as service identifier
 * @param resolveLabel - resolver for i18n placeholder labels
 * @returns the menu action button state
 */
function buildMenuActionState(
    menuItem: AggregationItem,
    convertedMetadata: ConvertedMetadata,
    schemaNamespace: string,
    resolveLabel: I18nLabelResolver
): ActionButtonState {
    const menuType =
        menuItem.menuType === 'Annotation' || menuItem.schema?.dataType === 'DataFieldForActionGroup'
            ? 'Annotation'
            : 'CustomMenu';
    const { label, unresolved } = resolveLabel(menuItem.description);
    return {
        label,
        action: '',
        visible: true,
        enabled: true,
        menuType,
        labelUnresolved: unresolved || undefined,
        menuActions: buildMenuItemStates(menuItem, convertedMetadata, schemaNamespace, resolveLabel)
    };
}

/**
 * Builds an action button state for a custom (manifest-declared) action that has no OData
 * `DataFieldForAction` counterpart. These are matched at runtime by their rendered label.
 *
 * @param item - the custom action aggregation entry
 * @param resolveLabel - resolver for i18n placeholder labels
 * @returns the custom action button state, or undefined if it has no usable label
 */
function buildCustomActionState(item: AggregationItem, resolveLabel: I18nLabelResolver): ActionButtonState | undefined {
    const { label, unresolved } = resolveLabel(item.description);
    if (!label) {
        return undefined;
    }
    return {
        label,
        action: '',
        visible: true,
        enabled: true,
        custom: true,
        labelUnresolved: unresolved || undefined
    };
}

/**
 * Builds an action button state for a single action or a menu from a spec model aggregation entry.
 *
 * @param key - aggregation key
 * @param item - aggregation entry
 * @param convertedMetadata - converted OData metadata
 * @param schemaNamespace - OData schema namespace used as service identifier
 * @param resolveLabel - resolver for i18n placeholder labels
 * @returns the action or menu button state, or undefined if the entry is neither
 */
function buildActionOrMenuState(
    key: string,
    item: AggregationItem,
    convertedMetadata: ConvertedMetadata,
    schemaNamespace: string,
    resolveLabel: I18nLabelResolver
): ActionButtonState | undefined {
    if (isMenuActionItem(item)) {
        return buildMenuActionState(item, convertedMetadata, schemaNamespace, resolveLabel);
    }
    const odataState = buildActionStateFromSpecModelKey(key, item.description, convertedMetadata, schemaNamespace);
    if (odataState) {
        return odataState;
    }
    // Custom (manifest-declared) actions have no OData action; the spec model tags them `actionType: 'Custom'`.
    if (item.schema?.actionType === 'Custom') {
        return buildCustomActionState(item, resolveLabel);
    }
    return undefined;
}

/**
 * Extracts header-level action button states from an object page model.
 *
 * @param objectPage - object page from the application model
 * @param convertedMetadata - converted OData metadata for resolving action availability
 * @param schemaNamespace - OData schema namespace used as service identifier in action assertions
 * @param resolveLabel
 * @returns array of action button states for the header toolbar
 */
function extractHeaderActions(
    objectPage: PageWithModelV4,
    convertedMetadata: ConvertedMetadata,
    schemaNamespace: string,
    resolveLabel: I18nLabelResolver = passthroughLabelResolver
): ActionButtonState[] {
    if (!objectPage.model) {
        return [];
    }
    const headerAgg = getAggregations(objectPage.model.root)['header'];
    const actionsAgg = getAggregations(headerAgg)['actions'];
    const actionEntries = getAggregations(actionsAgg) as Record<string, AggregationItem>;
    return Object.entries(actionEntries)
        .map(([key, item]) => buildActionOrMenuState(key, item, convertedMetadata, schemaNamespace, resolveLabel))
        .filter((actionState): actionState is ActionButtonState => actionState !== undefined);
}

/**
 * Extracts section-level action button states from a body section.
 * For table sections, actions are extracted from the table toolbar; for form sections from the form actions aggregation.
 *
 * @param section - body section entry from the application model
 * @param convertedMetadata - converted OData metadata for resolving action availability
 * @param schemaNamespace - OData schema namespace used as service identifier in action assertions
 * @param resolveLabel
 * @returns array of action button states for the section toolbar
 */
function extractSectionActions(
    section: BodySectionItem,
    convertedMetadata: ConvertedMetadata,
    schemaNamespace: string,
    resolveLabel: I18nLabelResolver = passthroughLabelResolver
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
        .map(([key, item]) => buildActionOrMenuState(key, item, convertedMetadata, schemaNamespace, resolveLabel))
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
    const subSectionItems = getAggregations(getAggregations(section)['subsections']) as Record<string, BodySectionItem>;
    const childEntries = Object.entries(subSectionItems).filter(([, child]) => !isSectionHidden(child));
    // all-FieldGroup CollectionFacet is collapsed into one sub-section with inherited id from parent
    // Table or nested CollectionFacet sub-sections are kept as distinct sub-sections with their own ids
    return isFormOnlyCollectionFacet(childEntries)
        ? [buildMergedFormSubSection(childEntries, parentSectionId, section.order, convertedMetadata, entitySetName)]
        : childEntries.map(([key, child]) =>
              buildSubSection(key, child, parentSectionId, convertedMetadata, entitySetName)
          );
}

/**
 * Checks if a body section is a CollectionFacet that contains only form facets (FieldGroups) and no tables or custom facets.
 *
 * @param childEntries - the section's sub-section aggregation entries
 * @returns true if every child is a plain form facet
 */
function isFormOnlyCollectionFacet(childEntries: [string, BodySectionItem][]): boolean {
    return (
        childEntries.length > 0 &&
        childEntries.every(([, child]) => !child.custom && !isTableSection(child) && isFormSection(child))
    );
}

/**
 * Merges the fields of all FieldGroups of a form-only CollectionFacet into one sub-section keyed by the
 * section id.
 *
 * @param childEntries - the section's sub-section aggregation entries (all form facets)
 * @param parentSectionId - identifier of the parent section, used as the sub-section id
 * @param sectionOrder - order of the parent section, adopted by the collapsed sub-section
 * @param convertedMetadata - optional converted OData metadata
 * @param entitySetName - the entity set the section is bound to
 * @returns the merged sub-section feature data
 */
function buildMergedFormSubSection(
    childEntries: [string, BodySectionItem][],
    parentSectionId: string,
    sectionOrder?: number,
    convertedMetadata?: ConvertedMetadata,
    entitySetName?: string
): BodySubSectionFeatureData {
    const fields = dedupeFormFields(
        childEntries.flatMap(([, child]) => extractFormFields(child, convertedMetadata, entitySetName))
    );
    return {
        id: parentSectionId,
        navigationProperty: undefined,
        isTable: false,
        custom: false,
        order: sectionOrder ?? -1,
        fields,
        contactCardFields: pickContactCardFields(fields),
        contactCardColumns: [],
        tableColumns: {}
    };
}

/**
 * Builds feature data for a single body sub-section (form or table).
 *
 * @param subSectionKey - the sub-section aggregation key
 * @param subSection - the sub-section entry from the application model
 * @param parentSectionId - identifier of the parent section (fallback key prefix)
 * @param convertedMetadata - optional converted OData metadata
 * @param entitySetName - the entity set the section is bound to
 * @returns the sub-section feature data
 */
function buildSubSection(
    subSectionKey: string,
    subSection: BodySectionItem,
    parentSectionId: string,
    convertedMetadata?: ConvertedMetadata,
    entitySetName?: string
): BodySubSectionFeatureData {
    const isTable = isTableSection(subSection);
    const fields = subSection.custom || isTable ? [] : extractFormFields(subSection, convertedMetadata, entitySetName);
    const contactCardColumns = subSection.custom || !isTable ? [] : extractContactCardColumnsFromNode(subSection);
    return {
        id: getSectionIdentifier(subSection) ?? `${parentSectionId}_${subSectionKey}`,
        navigationProperty: getNavigationPropertyFromKey(subSectionKey),
        isTable,
        custom: !!subSection.custom,
        order: subSection?.order ?? -1, // put a negative order number to signal that order was not in spec
        fields,
        // Contact-card fields are kept in `fields` too so the test also asserts `iCheckField` alongside `iClickLink` / `iCheckContactDialog` (dual diagnostic).
        contactCardFields: pickContactCardFields(fields),
        contactCardColumns,
        tableColumns: subSection.custom || !isTable ? {} : extractTableColumnsFromNode(subSection)
    };
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
 * Returns a new field list with duplicates removed, keeping the first occurrence of each identifier.
 *
 * @param fields - the fields to dedupe
 * @returns a new deduped field list
 */
function dedupeFormFields(fields: SectionFormField[]): SectionFormField[] {
    return fields.filter(
        (field, index) =>
            fields.findIndex(
                (candidate) =>
                    candidate.property === field.property &&
                    candidate.connectedFields === field.connectedFields &&
                    candidate.fieldGroup === field.fieldGroup
            ) === index
    );
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
 * Checks whether a section is hidden by a UI.Hidden annotation and should be skipped.
 *
 * @param section - section entry from ux specification
 * @returns true if the section is marked hidden
 */
function isSectionHidden(section: SectionItem): boolean {
    // hideByProperty holds a dynamic hide expression; skip unless it is a static `false` (always visible).
    return (
        section.properties?.hidden?.value === true ||
        (section.properties?.hideByProperty !== undefined && section.properties.hideByProperty.value !== false)
    );
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
