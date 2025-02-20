import FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { QuickActionContext, NestedQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import type { AnnotationDataSourceResponse } from '../../api-handler';
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
const ADD_NEW_ANNOTATION_FILE_TITLE = 'QUICK_ACTION_ADD_NEW_ANNOTATION_FILE';

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
    private annotationDataSourceData: AnnotationDataSourceResponse;
    constructor(protected readonly context: QuickActionContext) {
        super(ADD_NEW_ANNOTATION_FILE, NESTED_QUICK_ACTION_KIND, '', context, [DIALOG_ENABLEMENT_VALIDATOR]);
    }

    async initialize(): Promise<void> {
        const version = await getUi5Version();
        if (isLowerThanMinimalUi5Version(version, { major: 1, minor: 108, patch: 27 })) {
            this.isApplicable = false;
            return;
        }
        this.annotationDataSourceData = await getDataSourceAnnotationFileMap();
        const { annotationDataSourceMap } = this.annotationDataSourceData;
        if (!Object.keys(this.annotationDataSourceData.annotationDataSourceMap).length) {
            throw new Error('No data sources found in the manifest');
        }
        for (const key in annotationDataSourceMap) {
            if (Object.prototype.hasOwnProperty.call(annotationDataSourceMap, key)) {
                const source = annotationDataSourceMap[key];
                const { annotationExistsInWS } = source.annotationDetails;
                this.children.push({
                    enabled: true,
                    label: annotationExistsInWS
                        ? this.context.resourceBundle.getText('SHOW_ANNOTATION_FILE', [key])
                        : this.context.resourceBundle.getText('ADD_ANNOTATION_FILE', [key]),
                    children: []
                });
            }
        }
    }
    protected get textKey() {
        let result = ADD_NEW_ANNOTATION_FILE_TITLE;
        const dataSourceIds = Object.keys(this.annotationDataSourceData.annotationDataSourceMap);
        if (dataSourceIds.length === 1) {
            const details = this.annotationDataSourceData.annotationDataSourceMap[dataSourceIds[0]];
            if (details.annotationDetails.annotationExistsInWS) {
                result = 'QUICK_ACTION_SHOW_ANNOTATION_FILE';
            }
        }
        return result;
    }
    async execute(path: string): Promise<FlexCommand[]> {
        const { annotationDataSourceMap, isRunningInBAS } = this.annotationDataSourceData;
        const index = Number(path);
        if (index >= 0) {
            const dataSourceId = Object.keys(annotationDataSourceMap)[index];
            const dataSource = annotationDataSourceMap[dataSourceId];
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
                        isRunningInBAS: isRunningInBAS
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
                const parameters = {
                    dataSourceId: dataSourceId,
                    annotations: [annotationNameSpace],
                    annotationsInsertPosition: 'END',
                    dataSource: {
                        [annotationNameSpace]: {
                            uri: `annotations/${annotationFileName}`,
                            type: 'ODataAnnotation'
                        }
                    }
                };
                const modifiedValue = {
                    changeType: 'appdescr_app_addAnnotationsToOData',
                    generator: this.context.flexSettings.generator,
                    reference: this.context.flexSettings.projectId,
                    parameters,
                    serviceUrl: dataSource.serviceUrl
                };
                const command = await CommandFactory.getCommandFor<FlexCommand>(
                    this.context.view,
                    'appDescriptor',
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
            title: this.context.resourceBundle.getText(this.textKey),
            children: this.children
        };
    }
}
