import { ObjectAggregation } from '../ObjectAggregation';
import { VisualFilterAggregation } from './VisualFilterAggregation';

/**
 * Represents an aggregation for visual filters objects.
 */
export class VisualFiltersAggregation extends ObjectAggregation {
    sortableList = true;
    childClass = VisualFilterAggregation;
    i18nKey = 'VISUAL_FILTERS';
}
