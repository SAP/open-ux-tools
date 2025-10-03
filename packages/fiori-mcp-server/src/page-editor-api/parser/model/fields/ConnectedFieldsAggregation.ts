import { FieldAggregation } from './FieldAggregation';

/**
 * Represents an aggregation for connected fields objects.
 */
export class ConnectedFieldsAggregation extends FieldAggregation {
    sortableList = true;
    childClass = FieldAggregation;
}
