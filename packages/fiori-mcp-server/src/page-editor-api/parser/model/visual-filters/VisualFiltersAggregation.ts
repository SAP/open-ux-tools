import { ObjectAggregation } from '../ObjectAggregation';
import { VisualFilterAggregation } from './VisualFilterAggregation';

export class VisualFiltersAggregation extends ObjectAggregation {
    sortableList = true;
    childClass = VisualFilterAggregation;
    i18nKey = 'VISUAL_FILTERS';
}
