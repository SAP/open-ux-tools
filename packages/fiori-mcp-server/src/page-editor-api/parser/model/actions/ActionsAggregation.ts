import type { JSONSchema4 } from 'json-schema';
import type { PageConfig, PageType } from '@sap/ux-specification/dist/types/src';
import { ObjectAggregation } from '../ObjectAggregation';
import type { PageEditAggregationData } from '../ObjectAggregation';
import { AggregationCreationForm, SCHEMA_CREATION_FORM, SortingOptions } from '../types';
import type { PageData, CreationFormOptions, PropertyPath, PageAnnotations, AllowedMoveRange } from '../types';
import { ActionAggregation } from './ActionAggregation';

// Remove when latest '@sap/ux-specification/dist/types/src' is released
export enum ActionType {
    Annotation = 'Annotation',
    Copy = 'Copy',
    Criticality = 'Criticality',
    Custom = 'Custom',
    Standard = 'Standard',
    StandardWithoutAnnotation = 'StandardWithoutAnnotation'
}

export interface ActionsContainers {
    top: AllowedMoveRange;
    bottom: AllowedMoveRange;
}

export class ActionsAggregation extends ObjectAggregation {
    sortableList = true;
    childClass = ActionAggregation;
    allowedAnnotationCreationForms = [AggregationCreationForm.NativeAction, AggregationCreationForm.NativeNavigation];
    sortableCollection: string | undefined = 'actions';
    i18nKey = 'ACTIONS';

    constructor(data?: PageEditAggregationData, schema?: JSONSchema4) {
        super(data, schema);
        // Custom creation form - check schema if supported
        if (schema?.properties && this.schema?.additionalProperties && this.schema?.metadata?.type !== 'Aggregation') {
            this.schemaCreationForms = [
                {
                    name: AggregationCreationForm.CustomAction,
                    kind: SCHEMA_CREATION_FORM,
                    title: 'PAGE_EDITOR_OUTLINE_ADD_CUSTOM_ACTIONS_TITLE',
                    disabled: false
                }
            ];
        }
    }

    /**
     * Method adds aggregation object.
     * Overwritten to mark standard action.
     * @param {string} name Name of aggregation.
     * @param {ObjectAggregation} aggregation Aggregation to add.
     * @param {PropertyPath} path Array of path to aggregation.
     * @param {number} [order] Order index.
     * @param {number} [overwrite] Overwrite existing aggregation.
     * @return {ObjectAggregation} Added aggregation.
     */
    public addAggregation(
        name: string,
        aggregation: ObjectAggregation,
        path: PropertyPath,
        order?: number,
        overwrite?: boolean
    ): ObjectAggregation {
        aggregation = super.addAggregation(name, aggregation, path, order, overwrite);
        if (aggregation instanceof ActionAggregation && aggregation.name) {
            switch (aggregation.schema?.actionType) {
                case ActionType.Standard: {
                    aggregation.markAsStandardAction();
                    break;
                }
                case ActionType.Copy: {
                    aggregation.sortableItem = SortingOptions.Readonly;
                    break;
                }
            }
        }
        return aggregation;
    }

    /**
     * Overwritten method for data update of object page actions
     * Method receives current values for actions and detects custom actions.
     * @param {PageData} data Data which should be used for value population.
     * @param {PageConfig} page Page config data.
     * @param {PageType} pageType Page type.
     * @param {PropertyPath} path Aggregation path.
     * @param {PageAnnotations} annotations Annotations data.
     */
    public updatePropertiesValues(
        data: PageData,
        page: PageConfig,
        pageType: PageType,
        path: PropertyPath,
        annotations: PageAnnotations
    ): void {
        super.updatePropertiesValues(data, page, pageType, path, annotations);
        this.formSchema = this.additionalProperties?.aggregations['actions'];
        const actions = data || {};
        for (const id in actions) {
            const action = this.aggregations[id] as ActionAggregation;
            if (action?.name && action.schema?.actionType === 'Standard') {
                action.markAsStandardAction();
            } else if (action?.schema && (action.schema.actionType === 'Custom' || !action.schema.annotationPath)) {
                action.markAsCustomAction();
            }
        }
    }

    /**
     * Method provides creation options based on its related annotation node
     * @param {PageAnnotations} annotations Page annotations.
     */
    protected getNativeNodeCreationForms(annotations: PageAnnotations | undefined): CreationFormOptions[] {
        if (this.parent) {
            if (this.parent.name === 'footer') {
                this.allowedAnnotationCreationForms = [AggregationCreationForm.NativeAction];
            }
        }
        return super.getNativeNodeCreationForms(annotations);
    }

    /**
     * Method returns action type of passed action aggregation.
     * @param action Action aggregation.
     * @returns Action type of passed action aggregation.
     */
    private getActionType(action: ObjectAggregation): ActionType {
        const actionType: ActionType | undefined = action.schema?.actionType;
        if (actionType) {
            if (actionType === ActionType.Standard && !action.schema?.annotationPath) {
                return ActionType.StandardWithoutAnnotation;
            }
            return actionType;
        }
        return action.custom ? ActionType.Custom : ActionType.Annotation;
    }

    /**
     * Method calculates edge position for two containers - above and below standard actions.
     * @param aggregationKeys Array of actions aggregation keys.
     * @param sourceType Movable source type.
     * @returns Drop range edges.
     */
    private calculateDropRangeEdges(
        aggregationKeys: string[],
        sourceType: ActionType
    ): { bottom: number; top: number } {
        const edges = {
            top: -1,
            bottom: -1
        };
        const breakConditions = {
            top: [ActionType.Standard, ActionType.Copy, ActionType.Annotation],
            bottom: [ActionType.Criticality, ActionType.Standard, ActionType.Copy]
        };
        // Get top container range. Resolve end index by finding first index of Standard, Copy, Annotation
        for (let i = 0; i < aggregationKeys.length; i++) {
            const key = aggregationKeys[i];
            const aggregation = this.aggregations[key];
            const actionType = this.getActionType(aggregation);
            if (actionType && breakConditions.top.includes(actionType)) {
                edges.top = i;
                break;
            }
        }
        // Get bottom container range. Resolve start index by finding last index of Criticality, Standard, Copy
        if (sourceType !== ActionType.Custom) {
            for (let i = 0; i < aggregationKeys.length; i++) {
                const key = aggregationKeys[i];
                const aggregation = this.aggregations[key];
                const actionType = this.getActionType(aggregation);
                if (actionType && breakConditions.bottom.includes(actionType)) {
                    edges.bottom = i + 1;
                }
            }
        } else {
            edges.bottom = edges.top;
        }
        return edges;
    }

    /**
     * Method returns allowed drop ranges within action for passed action type.
     * @param sourceType Action type.
     * @returns Allowed drop ranges of top and bottom containers.
     */
    private getActionsContainers(sourceType: ActionType): ActionsContainers | undefined {
        const aggregationKeys = this.getAggregationKeys(true);
        // Disallowed drops at the end
        let restrictedCount = 0;
        for (let i = aggregationKeys.length - 1; i >= 0; i--) {
            const key = aggregationKeys[i];
            const aggregation = this.aggregations[key];
            const actionType = this.getActionType(aggregation);
            if (actionType !== ActionType.StandardWithoutAnnotation) {
                break;
            }
            restrictedCount++;
        }
        if (sourceType === ActionType.Custom && restrictedCount === 0) {
            // No limitation for custom actions if there is no Related Apps button(it is not supported to drop after Related Apps button)
            return undefined;
        }
        const edges = this.calculateDropRangeEdges(aggregationKeys, sourceType);
        if (edges.top === -1) {
            edges.top = edges.bottom;
        }
        if (edges.bottom === -1) {
            edges.bottom = edges.top;
        }
        if (edges.top === -1 || edges.bottom === -1) {
            return undefined;
        }

        return {
            top: {
                from: 0,
                to: edges.top
            },
            bottom: {
                from: edges.bottom,
                to: aggregationKeys.length - restrictedCount
            }
        };
    }

    /**
     * Method returns allowed drop ranges for passed source aggregation.
     * @param source Source aggregation.
     * @returns Allowed drop ranges for passed source aggregation.
     */
    public getAllowedDropRange(source: ObjectAggregation): AllowedMoveRange[] | undefined {
        const sourceActionType = this.getActionType(source);
        const dropContainers = this.getActionsContainers(sourceActionType);
        let range: AllowedMoveRange[] | undefined;
        if (dropContainers) {
            switch (sourceActionType) {
                case ActionType.Custom: {
                    // Custom actions can be moved across both groups
                    range = [dropContainers.top, dropContainers.bottom];
                    break;
                }
                case ActionType.Copy:
                case ActionType.Standard:
                case ActionType.StandardWithoutAnnotation: {
                    // Copy can not be moved
                    range = [];
                    break;
                }
                case ActionType.Criticality: {
                    range = [dropContainers.top];
                    break;
                }
                case ActionType.Annotation: {
                    // Custom actions can be moved across both groups
                    range = [dropContainers.bottom];
                    break;
                }
            }
        }
        return range;
    }
}
