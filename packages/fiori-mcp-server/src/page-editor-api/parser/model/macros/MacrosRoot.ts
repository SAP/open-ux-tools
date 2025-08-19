import type { JSONSchema4 } from 'json-schema';
import i18next from 'i18next';
import { join } from 'path';
import { ObjectAggregation } from '../ObjectAggregation';
import type { PageEditAggregationData } from '../ObjectAggregation';
import { ANNOTATION_CREATION_FORM, AggregationCreationForm } from '../types';
import type { CreationFormOptions, PageAnnotations } from '../types';
import { DirName } from '@sap-ux/project-access';

interface MacrosForms {
    internal: CreationFormOptions[];
    external: CreationFormOptions[];
}

export class MacrosRootAggregation extends ObjectAggregation {
    public filePath?: string;

    constructor(data?: PageEditAggregationData, schema?: JSONSchema4) {
        super(data, schema);
        this.path = ['macros'];
        this.isViewNode = true;
        this.virtual = true;
        this.allowedAnnotationCreationForms = [];
        // Creatin forms
        const forms = this.getCreationForms();
        this.annotationCreationForms = forms.internal;
        this.schemaCreationForms = forms.external;
        const filePath = this.schema?.metadata?.filePath;
        if (filePath) {
            this.setFilePath(filePath);
        }
    }

    /**
     * Method returns forms(internal/build-in and external/guided-help) based on supported features.
     *
     * @returns Forms(internal/build-in and external/guided-help) based on supported features.
     */
    private getCreationForms(): MacrosForms {
        const forms: MacrosForms = {
            internal: [
                {
                    name: AggregationCreationForm.MacrosChart,
                    kind: ANNOTATION_CREATION_FORM,
                    disabled: false,
                    title: 'ADD_BUILDING_BLOCK_CHART'
                },
                {
                    name: AggregationCreationForm.MacrosFilterBar,
                    kind: ANNOTATION_CREATION_FORM,
                    disabled: false,
                    title: 'ADD_BUILDING_BLOCK_FILTERBAR'
                },
                {
                    name: AggregationCreationForm.MacrosTable,
                    kind: ANNOTATION_CREATION_FORM,
                    disabled: false,
                    title: 'ADD_BUILDING_BLOCK_TABLE'
                }
            ],
            external: []
        };

        return forms;
    }

    /**
     * Public method returns display name of aggregation.
     *
     * @returns Display name of building blocks node.
     */
    public getDisplayName(): string {
        return i18next.t('PAGE_EDITOR_OUTLINE_NODE_BUILDING_BLOCK');
    }

    /**
     * Method provides creation options for macros elements.
     *
     * @param annotations Page annotations.
     * @returns Creation forms for macros node.
     */
    protected getNativeNodeCreationForms(): CreationFormOptions[] {
        return this.annotationNodeId ? this.annotationCreationForms : [];
    }

    /**
     * Method stores passed file path as source of macros node.
     *
     * @param annotations Page annotations.
     * @returns Creation forms for macros node.
     */
    public setFilePath(filePath: string): void {
        this.filePath = join(DirName.Webapp, filePath);
    }

    /**
     * Refreshes internal data based on annotation node data.
     *
     * @param annotations Annotation node data
     */
    public updateAnnotationData(annotations: PageAnnotations | undefined): void {
        super.updateAnnotationData(annotations);
        // Check annotation creations forms
        if (annotations?.dialogsContext?.analyticalChartSupport !== undefined) {
            const form = this.annotationCreationForms.find((form) => form.name === AggregationCreationForm.MacrosChart);
            if (form) {
                form.disabled = !annotations.dialogsContext.analyticalChartSupport.creationEnabled;
                if (form.disabled) {
                    // Add tooltip with disable reason
                    form.tooltip = annotations.dialogsContext.analyticalChartSupport.creationTooltip;
                }
            }
        }
    }
}
