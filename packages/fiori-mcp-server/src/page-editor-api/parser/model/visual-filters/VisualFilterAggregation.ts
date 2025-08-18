import { ObjectAggregation } from '../ObjectAggregation';
import { AggregationActions } from '../types';

export class VisualFilterAggregation extends ObjectAggregation {
    public sortableCollection: string | undefined = 'visualFilters';
    public actions = [AggregationActions.Delete];
    public isViewNode = true;
}
