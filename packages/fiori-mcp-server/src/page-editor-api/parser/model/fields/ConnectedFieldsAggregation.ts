import { FieldAggregation } from './FieldAggregation';

export class ConnectedFieldsAggregation extends FieldAggregation {
    sortableList = true;
    childClass = FieldAggregation;
}
