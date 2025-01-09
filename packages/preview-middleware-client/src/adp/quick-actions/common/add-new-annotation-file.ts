import FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { QuickActionContext, NestedQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import type { DataSourceAnnotationMap } from '../../api-handler';
import { getDataSourceAnnotationFileMap } from '../../api-handler';
import {
    NESTED_QUICK_ACTION_KIND,
    NestedQuickAction,
    NestedQuickActionChild
} from '@sap-ux-private/control-property-editor-common';
import { DialogFactory, DialogNames } from '../../dialog-factory';
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import { QuickActionDefinitionBase } from '../quick-action-base';
import { DIALOG_ENABLEMENT_VALIDATOR } from '../dialog-enablement-validator';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';
import { getUi5Version, isLowerThanMinimalUi5Version } from '../../../utils/version';

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
    public isApplicable = true;
    public get id(): string {
        return `${this.context.key}-${this.type}`;
    }
    private dataSourceAnnotationFileMap: DataSourceAnnotationMap;
    constructor(protected readonly context: QuickActionContext) {
        super(ADD_NEW_ANNOTATION_FILE, NESTED_QUICK_ACTION_KIND, 'QUICK_ACTION_ADD_NEW_ANNOTATION_FILE', context, [
            DIALOG_ENABLEMENT_VALIDATOR
        ]);
    }

    async initialize(): Promise<void> {
        const version = await getUi5Version();
        if (isLowerThanMinimalUi5Version(version, { major: 1, minor: 132, patch: 0 })) {
            this.isApplicable = false;
            return;
        }
        this.dataSourceAnnotationFileMap = await getDataSourceAnnotationFileMap();
        if (!this.dataSourceAnnotationFileMap) {
            throw new Error('No data sources found in the manifest');
        }
        for (const key in this.dataSourceAnnotationFileMap) {
            if (Object.prototype.hasOwnProperty.call(this.dataSourceAnnotationFileMap, key)) {
                const source = this.dataSourceAnnotationFileMap[key];
                this.children.push({
                    enabled: true,
                    label: source.annotationDetails.annotationExistsInWS
                        ? this.context.resourceBundle.getText('SHOW_ANNOTATION_FILE', [key])
                        : this.context.resourceBundle.getText('ODATA_SOURCE', [key]),
                    children: []
                });
            }
        }
    }
    async execute(path: string): Promise<FlexCommand[]> {
        const index = Number(path);
        if (index >= 0) {
            const dataSourceId = Object.keys(this.dataSourceAnnotationFileMap)[index];
            const dataSource = this.dataSourceAnnotationFileMap?.[dataSourceId];
            if (dataSource?.annotationDetails.annotationExistsInWS) {
                const annotationFileDetails = dataSource.annotationDetails;
                const { annotationPath, annotationPathFromRoot } = annotationFileDetails;
                await DialogFactory.createDialog(
                    OverlayRegistry.getOverlay(this.context.view), // this passed only because, for method param is required.
                    this.context.rta, // same as above
                    DialogNames.FILE_EXISTS,
                    undefined,
                    {
                        fileName: annotationPathFromRoot,
                        filePath: annotationPath,
                        isRunningInBAS: dataSource.isRunningInBAS
                    }
                );
            }
            // Create annotation file only, if no file exists already for datasource id or if the change file exist and but no annotation file exists in file system.
            else if (dataSource) {
                const timestamp = Date.now();
                const annotationFileNameWithoutExtension = `annotation_${timestamp}`;
                const annotationFileName = `${annotationFileNameWithoutExtension}.xml`;
                const annotationNameSpace =
                    this.context.flexSettings.layer === 'CUSTOMER_BASE'
                        ? `customer.annotation.${annotationFileNameWithoutExtension}`
                        : `annotation.${annotationFileNameWithoutExtension}`;
                const content = {
                    dataSourceId: dataSourceId,
                    annotations: [annotationNameSpace],
                    annotationsInsertPosition: 'END',
                    dataSource: {
                        [annotationNameSpace]: {
                            uri: `../annotations/${annotationFileName}`,
                            type: 'ODataAnnotation'
                        }
                    }
                };
                const modifiedValue = {
                    changeType: 'appdescr_app_addAnnotationsToOData',
                    generator: this.context.flexSettings.generator,
                    reference: this.context.flexSettings.projectId,
                    fileName: `id_${timestamp}_addAnnotationsToOData`,
                    content: content,
                    serviceUrl: dataSource.serviceUrl
                };
                const command = await CommandFactory.getCommandFor<FlexCommand>(
                    this.context.view,
                    'annotation',
                    modifiedValue,
                    null,
                    this.context.flexSettings
                );
                return [command];
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
