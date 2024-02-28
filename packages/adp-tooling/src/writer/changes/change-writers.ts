import { sep } from 'path';
import type { Editor } from 'mem-fs-editor';

import type {
    AnnotationsData,
    ComponentUsagesData,
    DataSourceData,
    DataSourceItem,
    IWriter,
    InboundContent,
    InboundData,
    NewModelData
} from '../../types';
import { AnnotationFileSelectType, ChangeTypes, FolderTypes } from '../../types';
import {
    getGenericChange,
    writeAnnotationChange,
    parseStringToObject,
    writeChangeToFolder,
    findChangeWithInboundId,
    writeChangeToFile,
    getParsedPropertyValue
} from '../../base/change-utils';

/**
 * Handles constructing and writing changes to the project's workspace.
 */
export class AnnotationsWriter implements IWriter<AnnotationsData> {
    /**
     * @param {Editor} fs - The filesystem editor instance.
     * @param {string} projectPath - The root path of the project.
     */
    constructor(private fs: Editor, private projectPath: string) {}

    /**
     * Constructs the content for an annotation change based on provided data.
     *
     * @param {AnnotationsData} data - The data object containing information needed to construct the content property.
     * @returns {object} The constructed content object for the annotation change.
     */
    private constructContent(data: AnnotationsData): object {
        const { isInternalUsage, annotationFileName } = data;
        const annotationFileNameWithoutExtension = annotationFileName?.toLocaleLowerCase().replace('.xml', '');
        const annotationNameSpace = isInternalUsage
            ? `annotation.${annotationFileNameWithoutExtension}`
            : `customer.annotation.${annotationFileNameWithoutExtension}`;
        return {
            dataSourceId: `${data.oDataSource}`,
            annotations: [annotationNameSpace],
            annotationsInsertPosition: 'END',
            dataSource: {
                [annotationNameSpace]: {
                    uri: `../annotations/${annotationFileName}`,
                    type: 'ODataAnnotation'
                }
            }
        };
    }

    /**
     * Determines the appropriate filename for the annotation file based on user answers.
     *
     * @param {AnnotationsData} data - The answers object containing user choices.
     * @returns {string | undefined} The determined filename for the annotation file.
     */
    private getAnnotationFileName(data: AnnotationsData): string | undefined {
        return data.annotationFileSelectOption === AnnotationFileSelectType.NewEmptyFile
            ? `annotation_${Date.now()}.xml`
            : data.annotationFilePath.split(sep).pop();
    }

    /**
     * Writes the annotation change to the project based on the provided data.
     *
     * @param {AnnotationsData} data - The annotations data containing all the necessary information to construct and write the change.
     * @returns {Promise<void>} A promise that resolves when the change writing process is completed.
     */
    async write(data: AnnotationsData): Promise<void> {
        data.annotationFileName = this.getAnnotationFileName(data);
        const content = this.constructContent(data);
        const change = getGenericChange(data, content, ChangeTypes.ADD_ANOTATIONS_TO_DATA);
        writeAnnotationChange(this.projectPath, data, change, this.fs);
    }
}

/**
 * Handles constructing and writing changes to the project's workspace.
 */
export class ComponentUsagesWriter implements IWriter<ComponentUsagesData> {
    /**
     * @param {Editor} fs - The filesystem editor instance.
     * @param {string} projectPath - The root path of the project.
     */
    constructor(private fs: Editor, private projectPath: string) {}

    /**
     * Constructs the content for an component usages change based on provided data.
     *
     * @param {ComponentUsagesData} data - The answers object containing information needed to construct the content property.
     * @returns {object} The constructed content object for the component usages change.
     */
    private constructContent(data: ComponentUsagesData): object {
        const componentUsages = {
            [data.componentUsageID]: {
                name: data.componentName,
                lazy: data.isLazy === 'true',
                settings: parseStringToObject(data.componentSettings),
                componentData: parseStringToObject(data.componentData)
            }
        };

        return {
            componentUsages
        };
    }

    /**
     * Constructs the content for an library reference change based on provided data.
     *
     * @param {ComponentUsagesData} data - The answers object containing information needed to construct the content property.
     * @returns {object | undefined} The constructed content object for the library reference change.
     */
    private constructLibContent(data: ComponentUsagesData): object | undefined {
        if (!data.shouldAddComponentLibrary) {
            return undefined;
        }

        return {
            libraries: {
                [data.componentLibraryReference]: {
                    lazy: data.libraryReferenceIsLazy === 'true'
                }
            }
        };
    }

    /**
     * Writes the component usages change to the project based on the provided data.
     *
     * @param {ComponentUsagesData} data - The component usages data containing all the necessary information to construct and write the change.
     * @returns {Promise<void>} A promise that resolves when the change writing process is completed.
     */
    async write(data: ComponentUsagesData): Promise<void> {
        const componentUsagesContent = this.constructContent(data);
        const libRefContent = this.constructLibContent(data);

        const shouldAddLibRef = libRefContent !== undefined;
        const compUsagesChange = getGenericChange(data, componentUsagesContent, ChangeTypes.ADD_COMPONENT_USAGES);

        writeChangeToFolder(
            this.projectPath,
            compUsagesChange,
            `id_${data.timestamp}_addComponentUsages.change`,
            this.fs,
            FolderTypes.MANIFEST
        );

        if (shouldAddLibRef) {
            data.timestamp += 1;
            const refLibChange = getGenericChange(
                data,
                libRefContent,
                ChangeTypes.ADD_COMPONENT_USAGE_LIBRARY_REFERENCE
            );

            writeChangeToFolder(
                this.projectPath,
                refLibChange,
                `id_${data.timestamp}_addLibraries.change`,
                this.fs,
                FolderTypes.MANIFEST
            );
        }
    }
}

/**
 * Handles constructing and writing changes to the project's workspace.
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
     * @param {NewModelData} data - The answers object containing information needed to construct the content property.
     * @returns {object} The constructed content object for the new model change.
     */
    private constructContent(data: NewModelData): object {
        const content: {
            model: {
                [key: string]: {
                    settings?: object;
                    dataSource: string;
                };
            };
            dataSource: {
                [key: string]: DataSourceItem;
            };
        } = {
            dataSource: {
                [data.oDataServiceName]: {
                    uri: data.oDataServiceURI,
                    type: 'OData',
                    settings: {
                        odataVersion: data.oDataVersion
                    }
                }
            },
            model: {
                [data.oDataServiceModelName]: {
                    dataSource: data.oDataServiceName
                }
            }
        };

        if (data.oDataServiceModelSettings && data.oDataServiceModelSettings.length !== 0) {
            content.model[data.oDataServiceModelName].settings = parseStringToObject(data.oDataServiceModelSettings);
        }

        if (data.addAnnotationMode) {
            content.dataSource[data.oDataServiceName].settings.annotations = [`${data.oDataAnnotationDataSourceName}`];
            content.dataSource[data.oDataAnnotationDataSourceName] = {
                uri: data.oDataAnnotationDataSourceURI,
                type: 'ODataAnnotation'
            } as DataSourceItem;

            if (data.oDataAnnotationSettings && data.oDataAnnotationSettings.length !== 0) {
                content.dataSource[data.oDataAnnotationDataSourceName].settings = parseStringToObject(
                    data.oDataAnnotationSettings
                );
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
        const content = this.constructContent(data);
        const change = getGenericChange(data, content, ChangeTypes.ADD_NEW_MODEL);
        writeChangeToFolder(
            this.projectPath,
            change,
            `id_${data.timestamp}_addNewModel.change`,
            this.fs,
            FolderTypes.MANIFEST
        );
    }
}

/**
 * Handles constructing and writing changes to the project's workspace.
 */
export class DataSourceWriter implements IWriter<DataSourceData> {
    /**
     * @param {Editor} fs - The filesystem editor instance.
     * @param {string} projectPath - The root path of the project.
     */
    constructor(private fs: Editor, private projectPath: string) {}

    /**
     * Constructs content for a data source change.
     *
     * @param {string} dataSourceId - The ID of the data source being modified.
     * @param {string} dataSourceUri - The new URI to update the data source with.
     * @param {number} [maxAge] - Optional maximum age.
     * @returns {object} The constructed content object for the change data source change.
     */
    private constructContent(dataSourceId: string, dataSourceUri: string, maxAge?: number): object {
        const content: {
            dataSourceId: string;
            entityPropertyChange: { propertyPath: string; operation: string; propertyValue: string | number }[];
        } = {
            dataSourceId: dataSourceId,
            entityPropertyChange: [
                {
                    propertyPath: 'uri',
                    operation: 'UPDATE',
                    propertyValue: dataSourceUri
                }
            ]
        };

        if (maxAge) {
            content.entityPropertyChange.push({
                propertyPath: 'settings/maxAge',
                operation: 'UPSERT',
                propertyValue: Number(maxAge)
            });
        }

        return content;
    }

    /**
     * Writes the change data source change to the project based on the provided data.
     *
     * @param {DataSourceData} data - The change data source data containing all the necessary information to construct and write the change.
     * @returns {Promise<void>} A promise that resolves when the change writing process is completed.
     */
    async write(data: DataSourceData): Promise<void> {
        const { dataSourcesDictionary } = data;
        const content = this.constructContent(data.oDataSource, data.oDataSourceURI, data.maxAge);
        const change = getGenericChange(data, content, ChangeTypes.CHANGE_DATA_SOURCE);

        writeChangeToFolder(
            this.projectPath,
            change,
            `id_${data.timestamp}_changeDataSource.change`,
            this.fs,
            FolderTypes.MANIFEST
        );

        const shouldAddAnnotation = data.oDataAnnotationSourceURI && data.oDataAnnotationSourceURI.length > 0;
        if (shouldAddAnnotation) {
            data.timestamp += 1;
            const annotationContent = this.constructContent(
                dataSourcesDictionary[data.oDataSource],
                data.oDataAnnotationSourceURI
            );
            const annotationChange = getGenericChange(data, annotationContent, ChangeTypes.CHANGE_DATA_SOURCE);

            writeChangeToFolder(
                this.projectPath,
                annotationChange,
                `id_${data.timestamp}_changeDataSource.change`,
                this.fs,
                FolderTypes.MANIFEST
            );
        }
    }
}

/**
 * Handles constructing and writing changes to the project's workspace.
 */
export class InboundWriter implements IWriter<InboundData> {
    /**
     * @param {Editor} fs - The filesystem editor instance.
     * @param {string} projectPath - The root path of the project.
     */
    constructor(private fs: Editor, private projectPath: string) {}

    /**
     * Constructs the content for an inbound data change based on provided data.
     *
     * @param {InboundData} data - The answers object containing information needed to construct the content property.
     * @returns {object} The constructed content object for the inbound data change.
     */
    private constructContent(data: InboundData): object {
        const content: InboundContent = {
            inboundId: data.inboundId,
            entityPropertyChange: []
        };

        this.getEnhancedContent(data, content);

        return content;
    }

    /**
     * Enhances the provided content object based on the values provided in answers.
     *
     * @param {InboundData} data - An object containing potential values for title, subTitle, and icon.
     * @param {InboundContent} content - The initial content object to be enhanced.
     * @returns {void}
     */
    private getEnhancedContent(data: InboundData, content: InboundContent): void {
        const { icon, title, subTitle } = data;
        if (title) {
            content.entityPropertyChange.push({
                propertyPath: 'title',
                operation: 'UPSERT',
                propertyValue: title
            });
        }

        if (subTitle) {
            content.entityPropertyChange.push({
                propertyPath: 'subTitle',
                operation: 'UPSERT',
                propertyValue: subTitle
            });
        }

        if (icon) {
            content.entityPropertyChange.push({
                propertyPath: 'icon',
                operation: 'UPSERT',
                propertyValue: icon
            });
        }
    }

    /**
     * Processes the provided answers object to parse its properties into the correct format.
     *
     * @param {InboundData} data - An object containing raw answers for inboundId, title, subTitle, and icon.
     * @returns {InboundData} A new answers object with properties modified
     *                           to ensure they are in the correct format for use in content construction.
     */
    private getModifiedData(data: InboundData): InboundData {
        const { inboundId, title, subTitle, icon } = data;

        return {
            ...data,
            inboundId,
            title: getParsedPropertyValue(title),
            subTitle: getParsedPropertyValue(subTitle),
            icon: getParsedPropertyValue(icon)
        };
    }

    /**
     * Writes the inbound data change to the project based on the provided data.
     *
     * @param {InboundData} data - The inbound data containing all the necessary information to construct and write the change.
     * @returns {Promise<void>} A promise that resolves when the change writing process is completed.
     */
    async write(data: InboundData): Promise<void> {
        const answers = this.getModifiedData(data);
        const { changeWithInboundId, filePath } = findChangeWithInboundId(this.projectPath, answers.inboundId);

        if (!changeWithInboundId) {
            const content = this.constructContent(answers);
            const change = getGenericChange(data, content, ChangeTypes.CHANGE_INBOUND);

            writeChangeToFolder(
                this.projectPath,
                change,
                `id_${data.timestamp}_changeInbound.change`,
                this.fs,
                FolderTypes.MANIFEST
            );
        } else {
            if (changeWithInboundId.content) {
                this.getEnhancedContent(answers, changeWithInboundId.content);
            }
            writeChangeToFile(filePath, changeWithInboundId, this.fs);
        }
    }
}
