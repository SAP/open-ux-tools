import type { Editor } from 'mem-fs-editor';

import { ChangeType } from '../../../types';
import type { IWriter, ComponentUsagesData, ComponentUsagesDataWithLibrary } from '../../../types';
import { parseStringToObject, getChange, writeChangeToFolder } from '../../../base/change-utils';

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
    private constructContent({ component }: ComponentUsagesData): object {
        const { data, usageId, settings, isLazy, name } = component;
        const componentUsages = {
            [usageId]: {
                name,
                lazy: isLazy === 'true',
                settings: parseStringToObject(settings),
                componentData: parseStringToObject(data)
            }
        };
        return {
            componentUsages
        };
    }

    /**
     * Constructs the content for an library reference change based on provided data.
     *
     * @param {ComponentUsagesData} library - The answers object containing information needed to construct the content property.
     * @returns {object} The constructed content object for the library reference change.
     */
    private constructLibContent({ library }: ComponentUsagesDataWithLibrary): object {
        const { reference, referenceIsLazy } = library;
        return {
            libraries: {
                [reference]: {
                    lazy: referenceIsLazy === 'true'
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
        const timestamp = Date.now();

        const compUsagesChange = getChange(
            data.variant,
            timestamp,
            componentUsagesContent,
            ChangeType.ADD_COMPONENT_USAGES
        );

        writeChangeToFolder(this.projectPath, compUsagesChange, this.fs);

        if (!('library' in data)) {
            return;
        }

        const libRefContent = this.constructLibContent(data);
        const libTimestamp = timestamp + 1;
        const refLibChange = getChange(data.variant, libTimestamp, libRefContent, ChangeType.ADD_LIBRARY_REFERENCE);

        writeChangeToFolder(this.projectPath, refLibChange, this.fs);
    }
}
