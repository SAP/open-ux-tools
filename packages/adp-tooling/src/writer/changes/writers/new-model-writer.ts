import { join, dirname } from 'node:path';

import type { Editor } from 'mem-fs-editor';
import { ToolsLogger } from '@sap-ux/logger';

import { ChangeType, ServiceType } from '../../../types';
import type { IWriter, NewModelData, DataSourceItem } from '../../../types';
import { parseStringToObject, getChange, writeChangeToFolder } from '../../../base/change-utils';
import { addConnectivityServiceToMta } from '../../../cf/project/yaml';
import { ensureTunnelAppExists, DEFAULT_TUNNEL_APP_NAME } from '../../../cf/services/ssh';

type NewModelContent = {
    model?: {
        [key: string]: {
            settings?: object;
            dataSource: string;
        };
    };
    dataSource: {
        [key: string]: DataSourceItem;
    };
};

/**
 * Handles the creation and writing of new sapui5 model data changes for a project.
 */
export class NewModelWriter implements IWriter<NewModelData> {
    /**
     * @param {Editor} fs - The filesystem editor instance.
     * @param {string} projectPath - The root path of the project.
     */
    constructor(
        private readonly fs: Editor,
        private readonly projectPath: string
    ) {}

    /**
     * Constructs the content for an new model change based on provided data.
     *
     * @param {NewModelData} data - The answers object containing information needed to construct the content property.
     * @returns {object} The constructed content object for the new model change.
     */
    private constructContent(data: NewModelData): object {
        const { service, isCloudFoundry, serviceType } = data;
        const isHttp = serviceType === ServiceType.HTTP;

        const uri = isCloudFoundry ? `${service.name.replaceAll('.', '/')}${service.uri}` : service.uri;

        const dataSourceEntry: DataSourceItem = {
            uri,
            type: isHttp ? 'http' : 'OData',
            settings: {}
        };

        if (service.version) {
            dataSourceEntry.settings.odataVersion = service.version;
        }

        const content: NewModelContent = {
            dataSource: {
                [service.name]: dataSourceEntry
            }
        };

        if (!isHttp && service.modelName) {
            content.model = {
                [service.modelName]: {
                    dataSource: service.name,
                    ...(service.modelSettings?.length ? { settings: parseStringToObject(service.modelSettings) } : {})
                }
            };
        }

        if ('annotation' in data) {
            const { annotation } = data;
            (content.dataSource[service.name].settings as Record<string, unknown>).annotations = [
                `${annotation.dataSourceName}`
            ];
            content.dataSource[annotation.dataSourceName] = {
                uri: annotation.dataSourceURI,
                type: 'ODataAnnotation'
            } as DataSourceItem;

            if (annotation.settings && annotation.settings.length !== 0) {
                content.dataSource[annotation.dataSourceName].settings = parseStringToObject(annotation.settings);
            }
        }

        return content;
    }

    /**
     * Writes the new model change to the project based on the provided data.
     *
     * @param {NewModelData} data - The new model data containing all the necessary information to construct and write the change.
     * @returns {Promise<void>} A promise that resolves when the change writing process is completed.
     */
    async write(data: NewModelData): Promise<void> {
        const timestamp = Date.now();
        const isHttp = data.serviceType === ServiceType.HTTP;
        const content = this.constructContent(data);
        const change = getChange(
            data.variant,
            timestamp,
            content,
            isHttp ? ChangeType.ADD_NEW_DATA_SOURCE : ChangeType.ADD_NEW_MODEL
        );

        await writeChangeToFolder(this.projectPath, change, this.fs);

        if (data.isCloudFoundry) {
            this.writeXsAppRoute(data);
        }

        if (data.isOnPremiseDestination) {
            await addConnectivityServiceToMta(dirname(this.projectPath), this.fs);
            await ensureTunnelAppExists(DEFAULT_TUNNEL_APP_NAME, data.logger ?? new ToolsLogger());
        }
    }

    /**
     * Creates or updates the xs-app.json in the webapp folder with a new AppRouter route
     * for the added OData service.
     *
     * @param {NewModelData} data - The new model data containing service name, URI and destination name.
     */
    private writeXsAppRoute(data: NewModelData): void {
        const xsAppPath = join(this.projectPath, 'webapp', 'xs-app.json');
        const source = `^/${data.service.name.replaceAll('.', '/')}${data.service.uri}(.*)`;
        const newRoute = {
            source,
            target: `${data.service.uri}$1`,
            destination: data.destinationName
        };
        const existing = this.fs.readJSON(xsAppPath, { routes: [] }) as { routes: object[] };
        existing.routes.push(newRoute);
        this.fs.writeJSON(xsAppPath, existing);
    }
}
