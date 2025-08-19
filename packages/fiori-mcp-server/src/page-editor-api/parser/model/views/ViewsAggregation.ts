import { ObjectAggregation } from '../ObjectAggregation';
import type { PageAggregations } from '../ObjectAggregation';
import type {
    SupportedAggregationAction,
    CreationFormOptions,
    PageData,
    PageAnnotations,
    PropertyPath,
    SchemaNodesMove
} from '../types';
import {
    CUSTOM_VIEW_PREFIX,
    SCHEMA_CREATION_FORM,
    AggregationActions,
    AggregationCreationForm,
    NODE_MOVE_CONFIG
} from '../types';
import { ViewAggregation } from './ViewAggregation';
import i18next from 'i18next';
import { isArrayEqual } from '../utils';
import type { PageConfig, PageType } from '@sap/ux-specification/dist/types/src';

export class ViewsAggregation extends ObjectAggregation {
    sortableList = true;
    childClass = ViewAggregation;
    allowedAnnotationCreationForms = [
        AggregationCreationForm.TableView,
        AggregationCreationForm.AnalyticalChartView,
        AggregationCreationForm.CustomViewV4
    ];
    sortableCollection: string | undefined = 'views';
    sortableConfigOnly = true;
    // i18n key
    i18nKey = 'VIEWS';

    /**
     * Refreshes internal data based on latest annotation node data.
     *
     * @param annotations
     */
    public updateAnnotationData(annotations: PageAnnotations | undefined): void {
        super.updateAnnotationData(annotations);
        if (annotations) {
            this.toggleChartForm(this.annotationCreationForms, annotations);
            for (const view in this.aggregations) {
                const viewAggregation = this.aggregations[view];
                const deleteAction = this.getViewDeleteAction(viewAggregation, annotations);
                const actions = viewAggregation.actions || [];
                actions.push(deleteAction);
                viewAggregation.actions = actions;
            }
        }
    }

    public updatePropertiesValues(
        data: PageData,
        page: PageConfig,
        pageType: PageType,
        path: PropertyPath,
        annotations: PageAnnotations | undefined
    ): void {
        super.updatePropertiesValues(data, page, pageType, path, annotations);
        this.formSchema = this.additionalProperties?.aggregations['views'];
        // Custom creation form - check schema if supported
        if (this.formSchema?.properties?.template) {
            this.schemaCreationForms = [
                {
                    name: AggregationCreationForm.CustomViewV4,
                    kind: SCHEMA_CREATION_FORM,
                    title: 'PAGE_EDITOR_OUTLINE_ADD_CUSTOM_VIEW_TITLE',
                    disabled: false
                }
            ];
        }

        const views = data || {};
        if (Object.keys(views).length !== 0) {
            for (const id in views) {
                const viewAggregation = this.aggregations[id] as ViewAggregation;
                if (
                    viewAggregation?.schema &&
                    !viewAggregation?.schema.properties?.['annotationPath'] &&
                    (!viewAggregation.schema.annotationPath ||
                        viewAggregation.schema.annotationPath.startsWith(CUSTOM_VIEW_PREFIX))
                ) {
                    viewAggregation.markAsCustomView();
                }
            }
        }
    }

    /**
     * Determines the delete action configuration for a given view aggregation.
     *
     * @param viewAggregation - The view aggregation to evaluate.
     * @param annotations - The current page annotations context.
     * @returns The delete action configuration for the view.
     */
    private getViewDeleteAction(
        viewAggregation: ObjectAggregation,
        annotations: PageAnnotations
    ): SupportedAggregationAction {
        const id = viewAggregation.annotationNodeId;
        let disableViewDeletion = true;
        const annotationViewsCount = this.getAnnotationViewCount();
        if (id) {
            disableViewDeletion = isArrayEqual(annotations.dialogsContext?.suppressTableViewDeletionNodeId || [], id);
        } else if (annotationViewsCount > 1 || (annotationViewsCount === 1 && viewAggregation.custom)) {
            // Allow annotation view deletion if there are at least two annotation views, else deletion only available for custom views
            disableViewDeletion = false;
        }
        return {
            type: AggregationActions.Delete,
            disabled: disableViewDeletion,
            title: i18next.t(
                disableViewDeletion ? 'TABLE_VIEW_DELETE_DISABLED_TOOLTIP' : 'PAGE_EDITOR_OUTLINE_DELETE_TOOLTIP'
            )
        };
    }

    /**
     * Overwritten method which handles sort.
     *
     * @param order New order of all nodes.
     * @param aggregations Mapped object containing all aggregations for new sorting
     * - it can contain new element if there was drop from outside.
     * @returns Schema based node moves for move action.
     */
    protected onMultiSort(order: string[], aggregations: PageAggregations): SchemaNodesMove[] {
        const moves: SchemaNodesMove[] = [];
        for (let i = 0; i < order.length; i++) {
            const id = order[i];
            const value = aggregations[id].value as { index?: number };
            if (!value || value.index === undefined) {
                continue;
            }
            const oldIndex = value.index;
            moves.push({
                oldIndex,
                newIndex: i,
                path: this.path,
                type: NODE_MOVE_CONFIG
            });
        }
        return moves;
    }

    /**
     * Enables/Disables the chart form based on the annotations.
     *
     * @param forms Array of creation forms
     * @param annotations Page annotations
     */
    private toggleChartForm(forms: CreationFormOptions[], annotations: PageAnnotations): void {
        const chartForm = forms.find(
            (form: CreationFormOptions) => form.name === AggregationCreationForm.AnalyticalChartView
        );
        if (chartForm && annotations.dialogsContext?.analyticalChartSupport) {
            if (!annotations.dialogsContext.analyticalChartSupport.addToMultiViewEnabled) {
                chartForm.disabled = true;
                chartForm.disabledTitle = annotations.dialogsContext.analyticalChartSupport.addToMultiViewTooltip;
            } else {
                chartForm.disabled = false;
                delete chartForm.disabledTitle;
            }
        }
    }

    /**
     * Method returns count of annotations views.
     *
     * @returns Count of annotations views.
     */
    private getAnnotationViewCount(): number {
        let count = 0;
        for (const view in this.aggregations) {
            const aggregation = this.aggregations[view];
            if (aggregation instanceof ViewAggregation && aggregation.isAnnotationView()) {
                count++;
            }
        }
        return count;
    }
}
