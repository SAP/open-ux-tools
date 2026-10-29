/**
 * Draft administration names of the SAP Fiori draft model (OData V4 draft as implemented by SAP CAP
 * `@odata.draft.enabled` and the ABAP RESTful Application Programming Model with draft). The names
 * are fixed by the frameworks; matching is case-insensitive, so every name here is lower case.
 *
 * @see https://cap.cloud.sap/docs/advanced/fiori#draft-support
 * @see https://help.sap.com/docs/abap-cloud/abap-rap/draft
 */

/** Key or flag properties the draft framework adds to a draft-enabled entity. */
export const DRAFT_KEY_PROPERTY_NAMES: ReadonlySet<string> = new Set([
    'draftuuid',
    'isactiveentity',
    'hasactiveentity',
    'hasdraftentity'
]);

/** Navigation properties the draft framework adds; they lead to administration data, not business data. */
export const DRAFT_NAVIGATION_NAMES: ReadonlySet<string> = new Set([
    'draftadministrativedata',
    'siblingentity',
    'draftadministrativedata_draftuuid'
]);

/** The draft administration entity type, matched as a substring of a qualified type name. */
export const DRAFT_ADMINISTRATIVE_DATA_TYPE = 'draftadministrativedata';

/** The draft state flags of one row, by role, as normalized property names (lower case, no separators). */
export const DRAFT_STATE_PROPERTY_NAMES = Object.freeze({
    hasDraft: 'hasdraftentity',
    hasActive: 'hasactiveentity',
    isActive: 'isactiveentity',
    activeUuid: 'activeuuid'
} as const);
