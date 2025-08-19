import { ObjectAggregation } from '../ObjectAggregation';
import { FieldAggregation } from './FieldAggregation';
import { AggregationCreationForm } from '../types';
import type { PageAnnotations } from '../types';

export class FieldsAggregation extends ObjectAggregation {
    sortableList = true;
    childClass = FieldAggregation;
    allowedAnnotationCreationForms = [
        AggregationCreationForm.NativeField,
        AggregationCreationForm.NativeContactField,
        AggregationCreationForm.NativeConnectedFields
    ];
    sortableCollection: string | undefined = 'fields';
    i18nKey = 'FIELDS';

    /**
     * Refreshes internal data based on annotation node data.
     * Overwritten to keep child nodes order the same as they defined in connected fields template.
     *
     * @param annotations Page annotations.
     */
    public updateAnnotationData(annotations: PageAnnotations | undefined): void {
        super.updateAnnotationData(annotations);

        if (this.path[0] === 'header') {
            this.allowedAnnotationCreationForms.splice(
                this.allowedAnnotationCreationForms.indexOf(AggregationCreationForm.NativeConnectedFields)
            );
        }
    }
}
