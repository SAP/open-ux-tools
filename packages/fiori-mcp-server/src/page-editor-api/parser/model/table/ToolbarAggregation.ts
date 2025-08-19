import type { PageAnnotations, UINode } from '../types';
import { ObjectAggregation } from '../ObjectAggregation';
import { updateTableChildNodeLocations } from './utils';

/**
 * Represents an aggregation for table toolbar objects.
 */
export class ToolbarAggregation extends ObjectAggregation {
    /**
     *
     * @param annotations
     * @param currentUINode
     */
    protected updateLocations(annotations: PageAnnotations | undefined, currentUINode?: UINode): void {
        super.updateLocations(annotations, currentUINode);
        updateTableChildNodeLocations(this);
    }
}
