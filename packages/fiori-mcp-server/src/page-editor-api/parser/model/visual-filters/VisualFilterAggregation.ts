import { ObjectAggregation } from '../ObjectAggregation';
import { AggregationActions } from '../types';

/**
 * Represents an aggregation for visual filter objects.
 */
export class VisualFilterAggregation extends ObjectAggregation {
    public sortableCollection: string | undefined = 'visualFilters';
    public actions = [AggregationActions.Delete];
    public isViewNode = true;
}
