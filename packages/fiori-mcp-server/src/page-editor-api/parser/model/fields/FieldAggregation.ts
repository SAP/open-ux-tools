import { ObjectAggregation } from '../ObjectAggregation';
import { SortingOptions, AggregationActions } from '../types';
import { getTechnicalIdFromPath } from '../utils';

/**
 * Represents an aggregation for field objects.
 */
export class FieldAggregation extends ObjectAggregation {
    public actions = [AggregationActions.Delete];
    public sortableItem: SortingOptions | undefined = SortingOptions.Enabled;
    public isViewNode = true;
    public sortableCollection: string | undefined = 'fields';

    /**
     * Method returns display name of aggregation without applying i18n translation.
     * Overwritten for column handling.
     *
     * @returns Display name of aggregation.
     */
    protected getRawDisplayName(): string {
        const displayName = super.getRawDisplayName();
        if (!displayName) {
            // Fallback when no label presented
            const fieldName = this.getTechnicalName();
            if (fieldName) {
                return fieldName;
            }
        }
        return displayName;
    }

    /**
     * Method parses object path key and returns field name / technical id.
     *
     * @returns Field name / technical id.
     */
    public getTechnicalName(): string | undefined {
        return getTechnicalIdFromPath(this.path);
    }
}
