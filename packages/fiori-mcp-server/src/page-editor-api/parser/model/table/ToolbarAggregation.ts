import type { PageAnnotations, UINode } from '../types';
import { ObjectAggregation } from '../ObjectAggregation';
import { updateTableChildNodeLocations } from './utils';

export class ToolbarAggregation extends ObjectAggregation {
    protected updateLocations(annotations: PageAnnotations | undefined, currentUINode?: UINode): void {
        super.updateLocations(annotations, currentUINode);
        updateTableChildNodeLocations(this);
    }
}
