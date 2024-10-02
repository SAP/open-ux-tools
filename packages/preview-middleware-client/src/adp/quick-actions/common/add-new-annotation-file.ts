import FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { SimpleQuickActionDefinitionBase } from '../simple-quick-action-base';
import { QuickActionContext, SimpleQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { writeAnnotationFle } from '../../api-handler';
import ODataModel from 'sap/ui/model/odata/v2/ODataModel';

export const ADD_NEW_ANNOTATION_FILE = 'add-new-annotation-file';
const CONTROL_TYPES: string[] = [];

/**
 * Add New Annotation File.
 */
export class AddNewAnnotationFile extends SimpleQuickActionDefinitionBase implements SimpleQuickActionDefinition {
    private data: { datasource: string; namespaces: { namespace: string; alias: string }[]; path: string };
    constructor(context: QuickActionContext) {
        super(ADD_NEW_ANNOTATION_FILE, CONTROL_TYPES, 'QUICK_ACTION_ADD_NEW_ANNOTATION_FILE', context);
        this.data = {
            datasource: '',
            namespaces: [],
            path: ''
        };
    }

    public get isActive(): boolean {
        return true;
    }

    initialize(): void {
        const odataModel = this.context?.view?.getModel() as ODataModel & { sServiceUrl: string };
        if (odataModel.isA('sap.ui.model.odata.v2.ODataModel')) {
            const serviceMetadata = odataModel?.getServiceMetadata() as {
                dataServices: { dataServiceVersion: string; schema: { namespace: string }[] };
            };
            this.data.namespaces = serviceMetadata.dataServices.schema.map((item) => {
                return { namespace: item.namespace, alias: item.namespace };
            });
            this.data.path = odataModel.sServiceUrl;
            const modelsWithDataSource = Object.keys(this.context.manifest['sap.ui5'].models).filter(
                (model: string) =>
                    (this.context.manifest['sap.ui5'].models[model] as { dataSource?: string })?.dataSource
            );
            if (modelsWithDataSource.length) {
                this.data.datasource =
                    (this.context.manifest['sap.ui5'].models[modelsWithDataSource[0]] as { dataSource?: string })
                        ?.dataSource || '';
            }
        }
    }
    async execute(): Promise<FlexCommand[]> {
        await writeAnnotationFle<{
            datasource: string;
            namespaces: { namespace: string; alias: string }[];
            path: string;
        }>(this.data);
        return [];
    }
    // async execute(): Promise<FlexCommand[]> {

    // }
}
