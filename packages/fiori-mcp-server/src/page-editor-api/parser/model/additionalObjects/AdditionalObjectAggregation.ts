import { ObjectAggregation } from '../ObjectAggregation';
import { AggregationActions } from '../types';

// Generic implementation, used for additionalSemanticObjects of related Apps
export class AdditionalObjectAggregation extends ObjectAggregation {
    public actions = [AggregationActions.Delete];

    /**
     * Method returns display name of aggregation.
     * Is used as display name in outline.
     * Overwritten to avoid translation attempt and "startCase" format.
     * @returns Display name of aggregation.
     */
    public getDisplayName(): string {
        if (this.name) {
            return this.name;
        }
        return super.getDisplayName();
    }
}
