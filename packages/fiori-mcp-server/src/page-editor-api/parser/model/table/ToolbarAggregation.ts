import type { PageAnnotations, UINode } from '../types';
import { ObjectAggregation } from '../ObjectAggregation';
import { updateTableChildNodeLocations } from './utils';

/**
 * Represents an aggregation for table toolbar objects.
 */
export class ToolbarAggregation extends ObjectAggregation {
    /**
     * Refreshes node locations based on the annotation node data.
     *
     * @param annotations All page annotation nodes.
     * @param currentUINode Current annotation node.
     */
    protected updateLocations(annotations: PageAnnotations | undefined, currentUINode?: UINode): void {
        super.updateLocations(annotations, currentUINode);
        updateTableChildNodeLocations(this);
    }
}
