import FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { QuickActionContext, NestedQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { getDataSourceAnnotationFileMap, writeAnnotationFile } from '../../api-handler';
import {
    NESTED_QUICK_ACTION_KIND,
    NestedQuickAction,
    NestedQuickActionChild
} from '@sap-ux-private/control-property-editor-common';
import { DialogNames, handler } from '../../init-dialogs';
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';

export const ADD_NEW_ANNOTATION_FILE = 'add-new-annotation-file';

/**
 * Add New Annotation File.
 */
export class AddNewAnnotationFile implements NestedQuickActionDefinition {
    public children: NestedQuickActionChild[] = [];
    readonly kind = NESTED_QUICK_ACTION_KIND;
    readonly type = ADD_NEW_ANNOTATION_FILE;
    readonly forceRefreshAfterExecution = true;
    public get id(): string {
        return `${this.context.key}-${this.type}`;
    }

    constructor(protected readonly context: QuickActionContext) {}

    public get isActive(): boolean {
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
                label: source.annotationFiles.length
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
            // Create annotation file only, if no file exists already for datasource id or if the change file exist and but no annotation file exists in file system.
            if (
                dataSourceAnnotationFileMap[dataSourceId] &&
                (!dataSourceAnnotationFileMap[dataSourceId].annotationFiles.length ||
                    dataSourceAnnotationFileMap[dataSourceId].annotationFiles.every((item) => !item.annotationExists))
            ) {
                await writeAnnotationFile({
                    dataSource: dataSourceId,
                    serviceUrl: dataSourceAnnotationFileMap[dataSourceId].serviceUrl
                });
            } else {
                const annotationFiles = dataSourceAnnotationFileMap[dataSourceId].annotationFiles;
                const { annotationPath, annotationPathFromRoot, isRunningInBAS } = annotationFiles.find(
                    (item) => item.annotationFileInUse
                )!;
                handler(
                    OverlayRegistry.getOverlay(this.context.view), // this passed only because, for method param is required.
                    this.context.rta, // same as above
                    DialogNames.SHOW_FILE_EXIST_DIALOG,
                    undefined,
                    {
                        fileName: annotationPathFromRoot,
                        filePath: annotationPath,
                        isRunningInBAS
                    }
                );
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
            enabled: this.isActive,
            title: this.context.resourceBundle.getText('QUICK_ACTION_ADD_NEW_ANNOTATION_FILE'),
            children: this.children
        };
    }
}
