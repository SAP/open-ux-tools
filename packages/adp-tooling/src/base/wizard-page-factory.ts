import type { IPrompt } from '@sap-devx/yeoman-ui-types';

/**
 * An interface representing a page configuration inside a wizard step.
 */
export interface IPage extends IPrompt {
    /**
     * The unique page id.
     */
    id: string;
}

/**
 * A model to a wizard page internally used by the {@link WizardPageFactory}.
 */
interface PageModel<PageLocalId> {
    localId: PageLocalId;
    name: string;
    description: string;
}

/**
 * A factory for creation of wizard pages.
 *
 * @template PageLocalId - The type of the local identifier for each wizard page.
 * Typically a string literal union type representing all possible local page IDs.
 */
export class WizardPageFactory<PageLocalId extends string> {
    /**
     *
     * @param {string} packageName - The name of the package in which we create wizard pages.
     */
    constructor(private readonly packageName: string) {}

    /**
     * Creates a wizard page object with a unique ID, name, and description.
     *
     * @param {PageModel<PageLocalId>} pageModel - The model containing the localId, name, and description for the page.
     * @param {PageLocalId} pageModel.localId - The local id for the page.
     * @param {string} pageModel.name - The name of the page.
     * @param {string} pageModel.description - The page description.
     * @returns {IPage} An {@link IPage}  object representing the wizard page.
     */
    create({ localId, name, description }: PageModel<PageLocalId>): IPage {
        return {
            id: WizardPageFactory.getPageId(this.packageName, localId),
            name,
            description
        };
    }

    /**
     * Helper method for creation a list of pages.
     *
     * @param {PageModel<PageLocalId>[]} pageModels - The list of page models.
     * @returns {IPage[]} A list of {@link IPage} objects.
     */
    createMany(pageModels: PageModel<PageLocalId>[]): IPage[] {
        return pageModels.map((model) => this.create(model));
    }

    /**
     * Constructs an unique page id in the format <paackageName>:<localId>.
     * An example id is '@sap-ux/generator-adp:configuration' for the configuration page
     * inside the adp generator package.
     *
     * @param {str} packageName - The name of the package.
     * @param {string} localId - The page local id.
     * @returns {string} The unique page id.
     */
    static getPageId(packageName: string, localId: string): string {
        return `${packageName}:${localId}`;
    }
}
