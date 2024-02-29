import type { Editor } from 'mem-fs-editor';

import { ChangeType, FolderTypes } from '../../../types';
import type { IWriter, ComponentUsagesData } from '../../../types';
import { parseStringToObject, getGenericChange, writeChangeToFolder } from '../../../base/change-utils';

/**
 * Handles the creation and writing of component usages data changes for a project.
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
        const compUsagesChange = getGenericChange(data, componentUsagesContent, ChangeType.ADD_COMPONENT_USAGES);

        writeChangeToFolder(
            this.projectPath,
            compUsagesChange,
            `id_${data.timestamp}_addComponentUsages.change`,
            this.fs,
            FolderTypes.MANIFEST
        );

        if (shouldAddLibRef) {
            data.timestamp += 1;
            const refLibChange = getGenericChange(data, libRefContent, ChangeType.ADD_LIBRARY_REFERENCE);

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
