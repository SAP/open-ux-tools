import { convert } from '@sap-ux/annotation-converter';
import { parse } from '@sap-ux/edmx-parser';
import type { ConvertedMetadata, EntitySet } from '@sap-ux/vocabularies-types';
import { filterDraftEnabledEntities } from '../../edmx/entity-helper';
import LoggerHelper from '../../logger-helper';
import { t } from '../../../i18n';

/**
 * If any of the draft root annotated entity sets have the share action property, then collaborative draft is enabled.
 *
 * @param draftEnabledEntitySets entity sets with draft enabled property `HasDraftEntity`
 * @returns
 */
function hasCollaborativeDraft(draftEnabledEntitySets: EntitySet[]): boolean {
    const entitySetWithDraftRootAndShareAction = draftEnabledEntitySets.find((entitySet) =>
        entitySet.annotations?.Common?.DraftRoot ? !!entitySet.annotations.Common.DraftRoot.ShareAction : false
    );
    return !!entitySetWithDraftRootAndShareAction;
}
/**
 * Determines if the collaborative draft warning should be shown.
 *
 * @param edmx metadata string or converted metadata can also be provided to prevent re-parsing
 * @returns true if the warning should be shown
 */
export function showCollabDraftWarning(edmx: string | ConvertedMetadata): boolean {
    let showWarning = false;
    try {
        let convertedMetadata: ConvertedMetadata;
        if (typeof edmx === 'string') {
            convertedMetadata = convert(parse(edmx));
        } else {
            convertedMetadata = edmx;
        }
        const draftEnabledEntitySets = filterDraftEnabledEntities(convertedMetadata.entitySets) ?? [];

        if (draftEnabledEntitySets?.length > 0) {
            showWarning = !hasCollaborativeDraft(draftEnabledEntitySets);
        }
    } catch (err) {
        LoggerHelper.logger.error(t('errors.unparseableMetadata', { error: err.message }));
    }
    return showWarning;
}
