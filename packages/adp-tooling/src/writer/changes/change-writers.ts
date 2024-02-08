import { Editor } from 'mem-fs-editor';

import {
    AnnotationChangeAnswers,
    AnnotationFileSelectType,
    AnnotationsData,
    ChangeTypes,
    ComponentUsagesAnswers,
    ComponentUsagesData,
    DataSourceData,
    FolderTypes,
    GeneratorName,
    IWriter,
    InboundAnswers,
    InboundContent,
    InboundData,
    NewModelAnswers,
    NewModelData
} from '../..';
import {
    getGenericChange,
    writeAnnotationChange,
    parseStringToObject,
    writeChangeToFolder,
    findChangeWithInboundId,
    writeChangeToFile,
    getParsedPropertyValue
} from '../../base/change-utils';

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
        const { answers, isInternalUsage, annotationFileName } = data;
        const annotationFileNameWithoutExtension =
            annotationFileName && annotationFileName.toLocaleLowerCase().replace('.xml', '');
        const annotationNameSpace = isInternalUsage
            ? `annotation.${annotationFileNameWithoutExtension}`
            : `customer.annotation.${annotationFileNameWithoutExtension}`;
        return {
            dataSourceId: `${answers.targetODataSource}`,
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
     * @param {AnnotationChangeAnswers} answers - The answers object containing user choices.
     * @returns {string | undefined} The determined filename for the annotation file.
     */
    private getAnnotationFileName(answers: AnnotationChangeAnswers): string | undefined {
        return answers.targetAnnotationFileSelectOption === AnnotationFileSelectType.NewEmptyFile
            ? `annotation_${Date.now()}.xml`
            : answers.targetAnnotationFilePath.split('/').pop();
    }

    /**
     * Writes the annotation change to the project based on the provided data.
     *
     * @param {AnnotationsData} data - The annotations data containing all the necessary information to construct and write the change.
     * @returns {Promise<void>} A promise that resolves when the change writing process is completed.
     */
    async write(data: AnnotationsData): Promise<void> {
        data.annotationFileName = this.getAnnotationFileName(data.answers);
        const content = this.constructContent(data);
        const change = getGenericChange<AnnotationsData>(
            data,
            content,
            GeneratorName.ADD_ANNOTATIONS_TO_ODATA,
            ChangeTypes.ADD_ANOTATIONS_TO_DATA
        );
        writeAnnotationChange(this.projectPath, data, change, this.fs);
    }
}

export class ComponentUsagesWriter implements IWriter<ComponentUsagesData> {
    /**
     * @param {Editor} fs - The filesystem editor instance.
     * @param {string} projectPath - The root path of the project.
     */
    constructor(private fs: Editor, private projectPath: string) {}

    /**
     * Constructs the content for an component usages change based on provided data.
     *
     * @param {ComponentUsagesAnswers} answers - The answers object containing information needed to construct the content property.
     * @returns {object} The constructed content object for the component usages change.
     */
    private constructContent(answers: ComponentUsagesAnswers): object {
        const componentUsages = {
            [answers.targetComponentUsageID]: {
                name: answers.targetComponentName,
                lazy: answers.targetIsLazy === 'true',
                settings: parseStringToObject(answers.targetComponentSettings),
                componentData: parseStringToObject(answers.targetComponentData)
            }
        };

        return {
            componentUsages
        };
    }

    /**
     * Constructs the content for an library reference change based on provided data.
     *
     * @param {ComponentUsagesAnswers} answers - The answers object containing information needed to construct the content property.
     * @returns {object | undefined} The constructed content object for the library reference change.
     */
    private constructLibContent(answers: ComponentUsagesAnswers): object | undefined {
        if (!answers.targetShouldAddComponentLibrary) {
            return undefined;
        }

        return {
            libraries: {
                [answers.targetComponentLibraryReference]: {
                    lazy: answers.targetLibraryReferenceIsLazy === 'true'
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
        const componentUsagesContent = this.constructContent(data.answers);
        const libRefContent = this.constructLibContent(data.answers);

        const shouldAddLibRef = libRefContent !== undefined;
        const compUsagesChange = getGenericChange<ComponentUsagesData>(
            data,
            componentUsagesContent,
            GeneratorName.ADD_COMPONENT_USAGES,
            ChangeTypes.ADD_COMPONENT_USAGES
        );

        writeChangeToFolder(
            this.projectPath,
            compUsagesChange,
            `id_${data.timestamp}_addComponentUsages.change`,
            this.fs,
            FolderTypes.MANIFEST
        );

        if (shouldAddLibRef) {
            data.timestamp += 1;
            const refLibChange = getGenericChange<ComponentUsagesData>(
                data,
                libRefContent,
                GeneratorName.ADD_COMPONENT_USAGES,
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

export class NewModelWriter implements IWriter<NewModelData> {
    /**
     * @param {Editor} fs - The filesystem editor instance.
     * @param {string} projectPath - The root path of the project.
     */
    constructor(private fs: Editor, private projectPath: string) {}

    /**
     * Constructs the content for an new model change based on provided data.
     *
     * @param {NewModelAnswers} answers - The answers object containing information needed to construct the content property.
     * @returns {object} The constructed content object for the new model change.
     */
    private constructContent(answers: NewModelAnswers): object {
        const content: {
            model: {
                [key: string]: {
                    settings?: object;
                    dataSource: string;
                };
            };
            dataSource: {
                [key: string]: any;
            };
        } = {
            dataSource: {
                [answers.targetODataServiceName]: {
                    uri: answers.targetODataServiceURI,
                    type: 'OData',
                    settings: {
                        odataVersion: answers.targetODataVersion
                    }
                }
            },
            model: {
                [answers.targetODataServiceModelName]: {
                    dataSource: answers.targetODataServiceName
                }
            }
        };

        if (answers.targetODataServiceModelSettings && answers.targetODataServiceModelSettings.length !== 0) {
            content.model[answers.targetODataServiceModelName].settings = parseStringToObject(
                answers.targetODataServiceModelSettings
            );
        }

        if (answers.addAnnotationMode) {
            content.dataSource[answers.targetODataServiceName].settings.annotations = [
                `${answers.targerODataAnnotationDataSourceName}`
            ];
            content.dataSource[answers.targerODataAnnotationDataSourceName] = {
                uri: answers.targetODataAnnotationDataSourceURI,
                type: 'ODataAnnotation'
            };

            if (answers.targetODataAnnotationSettings && answers.targetODataAnnotationSettings.length !== 0) {
                content.dataSource[answers.targerODataAnnotationDataSourceName].settings = parseStringToObject(
                    answers.targetODataAnnotationSettings
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
        const content = this.constructContent(data.answers);
        const change = getGenericChange<NewModelData>(
            data,
            content,
            GeneratorName.ADD_NEW_MODEL,
            ChangeTypes.ADD_NEW_MODEL
        );
        writeChangeToFolder(
            this.projectPath,
            change,
            `id_${data.timestamp}_addNewModel.change`,
            this.fs,
            FolderTypes.MANIFEST
        );
    }
}

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
        const { answers, dataSourcesDictionary } = data;
        const content = this.constructContent(answers.targetODataSource, answers.oDataSourceURI, answers.maxAge);
        const change = getGenericChange<DataSourceData>(
            data,
            content,
            GeneratorName.CHANGE_DATA_SOURCE,
            ChangeTypes.CHANGE_DATA_SOURCE
        );

        writeChangeToFolder(
            this.projectPath,
            change,
            `id_${data.timestamp}_changeDataSource.change`,
            this.fs,
            FolderTypes.MANIFEST
        );

        const shouldAddAnnotation = answers.oDataAnnotationSourceURI && answers.oDataAnnotationSourceURI.length > 0;
        if (shouldAddAnnotation) {
            data.timestamp += 1;
            const annotationContent = this.constructContent(
                dataSourcesDictionary[answers.targetODataSource],
                answers.oDataAnnotationSourceURI
            );
            const annotationChange = getGenericChange<DataSourceData>(
                data,
                annotationContent,
                GeneratorName.CHANGE_DATA_SOURCE,
                ChangeTypes.CHANGE_DATA_SOURCE
            );

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

export class InboundWriter implements IWriter<InboundData> {
    /**
     * @param {Editor} fs - The filesystem editor instance.
     * @param {string} projectPath - The root path of the project.
     */
    constructor(private fs: Editor, private projectPath: string) {}

    /**
     * Constructs the content for an inbound data change based on provided data.
     *
     * @param {InboundAnswers} answers - The answers object containing information needed to construct the content property.
     * @returns {object} The constructed content object for the inbound data change.
     */
    private constructContent(answers: InboundAnswers): object {
        const content: InboundContent = {
            inboundId: answers.inboundId,
            entityPropertyChange: []
        };

        this.getEnhancedContent(answers, content);

        return content;
    }

    /**
     * Enhances the provided content object based on the values provided in answers.
     *
     * @param {InboundAnswers} answers - An object containing potential values for title, subTitle, and icon.
     * @param {InboundContent} content - The initial content object to be enhanced.
     *
     * @returns {void}
     */
    private getEnhancedContent(answers: InboundAnswers, content: InboundContent): void {
        const { icon, title, subTitle } = answers;
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
     * @param {InboundAnswers} answers - An object containing raw answers for inboundId, title, subTitle, and icon.
     * @returns {InboundAnswers} A new answers object with properties modified
     *                           to ensure they are in the correct format for use in content construction.
     */
    private getModifiedAnswers(answers: InboundAnswers): InboundAnswers {
        const { inboundId, title, subTitle, icon } = answers;

        return {
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
        const answers = this.getModifiedAnswers(data.answers);
        const { changeWithInboundId, filePath } = findChangeWithInboundId(this.projectPath, answers.inboundId);

        if (!changeWithInboundId) {
            const content = this.constructContent(answers);
            const change = getGenericChange<InboundData>(
                data,
                content,
                GeneratorName.CHANGE_INBOUND,
                ChangeTypes.CHANGE_INBOUND
            );

            writeChangeToFolder(
                this.projectPath,
                change,
                `id_${data.timestamp}_changeInbound.change`,
                this.fs,
                FolderTypes.MANIFEST
            );
        } else {
            this.getEnhancedContent(answers, changeWithInboundId.content);
            writeChangeToFile(filePath, changeWithInboundId, this.fs);
        }
    }
}
