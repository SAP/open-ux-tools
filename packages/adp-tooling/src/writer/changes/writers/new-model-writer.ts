import type { Editor } from 'mem-fs-editor';

import { ChangeType } from '../../../types';
import { DirName } from '@sap-ux/project-access';
import type { IWriter, NewModelData, DataSourceItem, NewModelAnswers } from '../../../types';
import { parseStringToObject, getChange, writeChangeToFolder } from '../../../base/change-utils';

type NewModelContent = {
    model: {
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
    constructor(private fs: Editor, private projectPath: string) {}

    /**
     * Constructs the content for an new model change based on provided data.
     *
     * @param {NewModelAnswers} data - The answers object containing information needed to construct the content property.
     * @returns {object} The constructed content object for the new model change.
     */
    private constructContent({
        name,
        uri,
        addAnnotationMode,
        dataSourceName,
        modelName,
        modelSettings,
        version,
        dataSourceURI,
        settings
    }: NewModelAnswers): object {
        const content: NewModelContent = {
            dataSource: {
                [name]: {
                    uri,
                    type: 'OData',
                    settings: {
                        odataVersion: version
                    }
                }
            },
            model: {
                [modelName]: {
                    dataSource: name
                }
            }
        };

        if (modelSettings && modelSettings.length !== 0) {
            content.model[modelName].settings = parseStringToObject(modelSettings);
        }

        if (addAnnotationMode) {
            content.dataSource[name].settings.annotations = [`${dataSourceName}`];
            content.dataSource[dataSourceName] = {
                uri: dataSourceURI,
                type: 'ODataAnnotation'
            } as DataSourceItem;

            if (settings && settings.length !== 0) {
                content.dataSource[dataSourceName].settings = parseStringToObject(settings);
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
        const content = this.constructContent(data.answers);
        const change = getChange(data.variant, timestamp, content, ChangeType.ADD_NEW_MODEL);

        writeChangeToFolder(this.projectPath, change, `id_${timestamp}_addNewModel.change`, this.fs, DirName.Manifest);
    }
}
