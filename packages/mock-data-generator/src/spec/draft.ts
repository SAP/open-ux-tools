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
    isActiveEntity: 'isactiveentity',
    activeUuid: 'activeuuid'
} as const);

/** The draft administration key of a draft-enabled row (OData V2 draft), normalized. */
export const DRAFT_UUID_PROPERTY_NAME = 'draftuuid';

/** The foreign key to the draft administration data that CAP adds to a draft-enabled entity, normalized. */
export const DRAFT_ADMINISTRATIVE_DATA_KEY_NAME = 'draftadministrativedata_draftuuid';

/**
 * The draft key of an active instance in the SAP draft model: an active row has no draft, so its draft UUID is
 * the initial (nil) UUID.
 *
 * @see https://help.sap.com/docs/abap-cloud/abap-rap/draft
 */
export const INITIAL_DRAFT_UUID = '00000000-0000-0000-0000-000000000000';

/**
 * The draft flags of an active row as the SAP Fiori elements mockserver gives every row it loads from a mock data
 * file, and as the SAP Fiori tools data editor writes them: drafts are created at runtime by the Edit action, so
 * mock data holds active instances only.
 *
 * @see https://github.com/SAP/open-ux-odata/blob/main/packages/fe-mockserver-core/src/data/entitySets/entitySet.ts
 */
export const ACTIVE_ROW_DRAFT_FLAGS: Readonly<Record<string, boolean>> = Object.freeze({
    [DRAFT_STATE_PROPERTY_NAMES.isActiveEntity]: true,
    [DRAFT_STATE_PROPERTY_NAMES.hasActive]: true,
    [DRAFT_STATE_PROPERTY_NAMES.hasDraft]: false
});
