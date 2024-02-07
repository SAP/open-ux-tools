import { Editor } from 'mem-fs-editor';

import {
    AnnotationsData,
    ChangeTypes,
    ComponentUsagesAnswers,
    ComponentUsagesData,
    DataSourceData,
    FolderTypes,
    GeneratorName,
    GeneratorType,
    IWriter,
    IWriterData,
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
    writeChangeToFile
} from '../../base/change-utils';

export class WriterFactory {
    static createWriter<T extends GeneratorType>(type: T, fs: Editor, projectPath: string): IWriterData<T> {
        switch (type) {
            case GeneratorType.ADD_ANNOTATIONS_TO_ODATA:
                return new AnnotationsWriter(fs, projectPath) as IWriterData<T>;
            case GeneratorType.ADD_COMPONENT_USAGES:
                return new ComponentUsagesWriter(fs, projectPath) as IWriterData<T>;
            case GeneratorType.ADD_NEW_MODEL:
                return new NewModelWriter(fs, projectPath) as IWriterData<T>;
            case GeneratorType.CHANGE_DATA_SOURCE:
                return new DataSourceWriter(fs, projectPath) as IWriterData<T>;
            case GeneratorType.CHANGE_INBOUND:
                return new InboundWriter(fs, projectPath) as IWriterData<T>;
            default:
                throw new Error(`Unsupported generator type: ${type}`);
        }
    }
}

export class AnnotationsWriter implements IWriter<AnnotationsData> {
    constructor(private fs: Editor, private projectPath: string) {}

    private constructContent(data: AnnotationsData) {
        const { annotationFileName, annotationChange, isInternalUsage } = data;
        const annotationFileNameWithoutExtension = annotationFileName.toLocaleLowerCase().replace('.xml', '');
        const annotationNameSpace = isInternalUsage
            ? `annotation.${annotationFileNameWithoutExtension}`
            : `customer.annotation.${annotationFileNameWithoutExtension}`;
        return {
            dataSourceId: `${annotationChange.targetODataSource}`,
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

    async write(data: AnnotationsData): Promise<void> {
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
    constructor(private fs: Editor, private projectPath: string) {}

    private constructContent(answers: ComponentUsagesAnswers) {
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

    private constructLibContent(answers: ComponentUsagesAnswers) {
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
    constructor(private fs: Editor, private projectPath: string) {}

    private constructContent(answers: NewModelAnswers) {
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
    constructor(private fs: Editor, private projectPath: string) {}

    private constructContent(dataSourceId: string, dataSourceUri: string, maxAge?: number) {
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
    constructor(private fs: Editor, private projectPath: string) {}

    private constructContent(answers: InboundAnswers) {
        const content: InboundContent = {
            inboundId: answers.inboundId,
            entityPropertyChange: []
        };

        this.getEnhancedContent(answers, content);

        return content;
    }

    private getEnhancedContent(answers: InboundAnswers, content: InboundContent) {
        const { icon = null, title = null, subTitle = null } = answers;
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

    async write(data: InboundData): Promise<void> {
        const { answers } = data;
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
