import type { Editor } from 'mem-fs-editor';

import { ChangeType } from '../../../types';
import { DirName } from '@sap-ux/project-access';
import type { IWriter, ComponentUsagesData } from '../../../types';
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
    private constructContent({ answers }: ComponentUsagesData): object {
        const { data, id, settings, isLazy, name } = answers;
        const componentUsages = {
            [id]: {
                name,
                lazy: isLazy === 'true',
                settings: parseStringToObject(settings),
                data: parseStringToObject(data)
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
    private constructLibContent({ answers }: ComponentUsagesData): object | undefined {
        if (!answers.library) {
            return undefined;
        }

        return {
            libraries: {
                [answers.library]: {
                    lazy: answers.libraryIsLazy === 'true'
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
        const timestamp = Date.now();

        const shouldAddLibRef = libRefContent !== undefined;
        const compUsagesChange = getChange(
            data.variant,
            timestamp,
            componentUsagesContent,
            ChangeType.ADD_COMPONENT_USAGES
        );

        writeChangeToFolder(
            this.projectPath,
            compUsagesChange,
            `id_${timestamp}_addComponentUsages.change`,
            this.fs,
            DirName.Manifest
        );

        if (shouldAddLibRef) {
            const libTimestamp = timestamp + 1;
            const refLibChange = getChange(data.variant, libTimestamp, libRefContent, ChangeType.ADD_LIBRARY_REFERENCE);

            writeChangeToFolder(
                this.projectPath,
                refLibChange,
                `id_${libTimestamp}_addLibraries.change`,
                this.fs,
                DirName.Manifest
            );
        }
    }
}
