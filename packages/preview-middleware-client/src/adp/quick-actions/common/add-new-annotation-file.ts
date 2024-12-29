import FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { QuickActionContext, NestedQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { getDataSourceAnnotationFileMap, writeAnnotationFile } from '../../api-handler';
import {
    NESTED_QUICK_ACTION_KIND,
    NestedQuickAction,
    NestedQuickActionChild
} from '@sap-ux-private/control-property-editor-common';
import { DialogFactory, DialogNames } from '../../dialog-factory';
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import { QuickActionDefinitionBase } from '../quick-action-base';
import { DIALOG_ENABLEMENT_VALIDATOR } from '../dialog-enablement-validator';

export const ADD_NEW_ANNOTATION_FILE = 'add-new-annotation-file';

/**
 * Add New Annotation File.
 */
export class AddNewAnnotationFile
    extends QuickActionDefinitionBase<typeof NESTED_QUICK_ACTION_KIND>
    implements NestedQuickActionDefinition
{
    public children: NestedQuickActionChild[] = [];
    readonly kind = NESTED_QUICK_ACTION_KIND;
    readonly type = ADD_NEW_ANNOTATION_FILE;
    readonly forceRefreshAfterExecution = true;
    public get id(): string {
        return `${this.context.key}-${this.type}`;
    }
    constructor(protected readonly context: QuickActionContext) {
        super(ADD_NEW_ANNOTATION_FILE, NESTED_QUICK_ACTION_KIND, 'QUICK_ACTION_ADD_NEW_ANNOTATION_FILE', context, [
            DIALOG_ENABLEMENT_VALIDATOR
        ]);
    }
    public get isApplicable(): boolean {
        return true;
    }
    async initialize(): Promise<void> {
        const dataSourceAnnotationFileMap = await getDataSourceAnnotationFileMap();
        if (!dataSourceAnnotationFileMap) {
            throw new Error('No data sources found in the manifest');
        }
        for (const key in dataSourceAnnotationFileMap) {
            const source = dataSourceAnnotationFileMap[key];
            this.children.push({
                enabled: true,
                label: source.annotationDetails.annotationExistsInWS
                    ? this.context.resourceBundle.getText('SHOW_ANNOTATION_FILE', [key])
                    : this.context.resourceBundle.getText('ODATA_SORUCE', [key]),
                children: []
            });
        }
    }
    async execute(path: string): Promise<FlexCommand[]> {
        const index = Number(path);
        if (index >= 0) {
            // Do not cache the result of getDataSourceAnnotationFileMap api , as annotation file or datasource can be added outside using create command/So refresh would be required for the cache to be updated.
            const dataSourceAnnotationFileMap = await getDataSourceAnnotationFileMap();
            const dataSourceId = Object.keys(dataSourceAnnotationFileMap)[index];
            const dataSource = dataSourceAnnotationFileMap?.[dataSourceId];
            if (dataSource?.annotationDetails.annotationExistsInWS) {
                const annotationFileDetails = dataSource.annotationDetails;
                const { annotationPath, annotationPathFromRoot, isRunningInBAS } = annotationFileDetails;
                await DialogFactory.createDialog(
                    OverlayRegistry.getOverlay(this.context.view), // this passed only because, for method param is required.
                    this.context.rta, // same as above
                    DialogNames.FILE_EXISTS,
                    undefined,
                    {
                        fileName: annotationPathFromRoot,
                        filePath: annotationPath,
                        isRunningInBAS
                    }
                );
            }
            // Create annotation file only, if no file exists already for datasource id or if the change file exist and but no annotation file exists in file system.
            else if (dataSource) {
                await writeAnnotationFile({
                    dataSource: dataSourceId,
                    serviceUrl: dataSource.serviceUrl
                });
            }
        }
        return [];
    }

    /**
     * Prepares nested quick action object
     * @returns action instance
     */
    getActionObject(): NestedQuickAction {
        return {
            kind: NESTED_QUICK_ACTION_KIND,
            id: this.id,
            enabled: this.isApplicable,
            title: this.context.resourceBundle.getText('QUICK_ACTION_ADD_NEW_ANNOTATION_FILE'),
            children: this.children
        };
    }
}
