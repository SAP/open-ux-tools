import { ObjectAggregation } from '../ObjectAggregation';
import { getTechnicalIdFromPath } from '../utils';

export class TableAggregation extends ObjectAggregation {
    /**
     * Method parses object path key and returns table source entity name(target).
     * @returns {string | undefined} Table source entity name(target).
     */
    public getTechnicalName(): string | undefined {
        const key = this.parent ? getTechnicalIdFromPath(this.parent.path, true) : undefined;
        return key || super.getTechnicalName();
    }
}
