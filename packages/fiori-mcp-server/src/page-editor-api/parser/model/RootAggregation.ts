import { ObjectAggregation } from './ObjectAggregation';
import { AggregationCreationForm, ANNOTATION_CREATION_FORM } from './types';
import type { CreationFormOptions, PageAnnotations } from './types';
import i18next from 'i18next';

export class RootAggregation extends ObjectAggregation {
    public allowedAnnotationCreationForms: AggregationCreationForm[] = [AggregationCreationForm.AnalyticalChart];
    name = 'root';

    /**
     * Method provides creation options based on its related annotation node.
     * Overwritten, return array which was calculated on annotation data refresh.
     */
    public getDefaultNativeCreationForms(): CreationFormOptions[] {
        return this.annotationCreationForms;
    }

    /**
     * Refreshes internal data based on latest annotation node data
     *
     * @param annotations
     */
    public updateAnnotationData(annotations: PageAnnotations | undefined): void {
        this.annotationCreationForms = [];
        super.updateAnnotationData(annotations);
        // Check annotation creations forms
        const isChartAdded = !!this.aggregations['chart']?.isViewNode;
        const isViewsEnabled = !!(this.aggregations['table']?.aggregations['views']?.isViewNode && !isChartAdded);
        if (isViewsEnabled && annotations?.dialogsContext?.analyticalChartSupport !== undefined) {
            const form: CreationFormOptions = {
                name: AggregationCreationForm.AnalyticalChart,
                title: annotations.dialogsContext.analyticalChartSupport.creationTooltip,
                disabled: !annotations.dialogsContext.analyticalChartSupport.creationEnabled,
                kind: ANNOTATION_CREATION_FORM,
                visualizationIcon: 'Add',
                buttonText: i18next.t('ADD_CHART'),
                buttonId: 'add-chart'
            };
            if (form.disabled) {
                form.disabledTitle = form.title;
            }
            this.annotationCreationForms.push(form);
        }
    }
}
