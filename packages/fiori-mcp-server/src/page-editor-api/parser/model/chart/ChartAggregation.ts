import i18next from 'i18next';
import { ObjectAggregation } from '../ObjectAggregation';
import { AggregationActions } from '../types';
import type { SupportedAggregationAction, PageData, PageAnnotations, PropertyPath } from '../types';
import { RootAggregation } from '../RootAggregation';
import type { PageConfig, PageType } from '@sap/ux-specification/dist/types/src';
interface DeletionSupport {
    deletionEnabled?: boolean;
    deletionTooltip?: string;
}

/**
 * Represents an aggregation for analytical chart objects.
 */
export class ChartAggregation extends ObjectAggregation {
    /**
     * Refreshes internal data based on latest annotation node data.
     *
     * @param annotations
     */
    public updateAnnotationData(annotations: PageAnnotations | undefined): void {
        const chartDefs = annotations?.dialogsContext?.analyticalChartSupport;
        this.actions = [];
        if (chartDefs) {
            const deletionSupport = this.getDeletionSupport(chartDefs);
            const action: SupportedAggregationAction = {
                type: AggregationActions.Delete,
                title: deletionSupport.deletionTooltip
            };
            action.disabled = !deletionSupport.deletionEnabled;
            this.actions.push(action);
        }
        super.updateAnnotationData(annotations);
    }

    /**
     * Overwritten method for data update.
     * Is used to detect if we need hide aggregation depending on received data.
     * Method should be removed after action status fulfilled would consider full sync flow(18990).
     *
     * @param data Data which should be used for value population.
     * @param page Page config data.
     * @param pageType Page type.
     * @param path Aggregation path.
     * @param annotations Page annotations.
     */
    public updatePropertiesValues(
        data: PageData,
        page: PageConfig,
        pageType: PageType,
        path: PropertyPath,
        annotations?: PageAnnotations
    ): void {
        super.updatePropertiesValues(data, page, pageType, path, annotations);
        // Can be removed after webview action status "fulfilled" would considers full sync flow(18990).
        const hasAnnotationPathProperty = !!this.schema?.properties?.['annotationPath'];
        if (hasAnnotationPathProperty && !data?.annotationPath) {
            this.hidden = true;
        }
    }

    /**
     * Method checks if deletion is supported depending on if spec support complex deletion or not.
     *
     * @param support Deletion support received from annotation.
     * @returns Deletion support based on spec check.
     */
    private getDeletionSupport(support: DeletionSupport = {}): DeletionSupport {
        if (support?.deletionEnabled) {
            const root = this.findMatchingParent(RootAggregation);
            // Check if old spec
            const isSpecSupportComplexDeletion = root?.schema?.properties?.['defaultTemplateAnnotationPath'];
            if (!isSpecSupportComplexDeletion && root) {
                // Check if complex scenario unsuported by old spec
                const table = root.aggregations['table']?.value;
                if (typeof table === 'object') {
                    const annotationPath = (table as { annotationPath: string })?.annotationPath;
                    if (this.isComplexScenario(annotationPath)) {
                        support = {
                            deletionEnabled: false,
                            deletionTooltip: i18next.t('CHART_DELETION_UNSUPPORTED_BY_SPEC')
                        };
                    }
                }
            }
        }
        return support;
    }

    /**
     * Method checks if passed target annotation is considered as complex scenario and unsupported by older spec.
     *
     * @param value Value to check.
     * @returns Is complex scenario.
     */
    private isComplexScenario(value: string): boolean {
        const parts = value.split('.');
        const annotationTerm = parts[parts.length - 1] || '';
        return (
            annotationTerm.startsWith('SelectionPresentationVariant') ||
            annotationTerm.startsWith('PresentationVariant#')
        );
    }
}
