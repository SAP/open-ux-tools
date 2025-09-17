import type { IPrompt, Prompts as YeomanUiSteps } from '@sap-devx/yeoman-ui-types';

import { type IPage, WizardPageFactory } from '@sap-ux/adp-tooling';
import { GeneratorTypes } from '../types';
import { t } from './i18n';

type FlpPageLocalId = 'flpConfig' | 'tileSettings';

type AdpPageLocalId =
    | 'addComponentUsages'
    | 'addNewModel'
    | 'configuration'
    | 'projectAttributes'
    | 'deployConfig'
    | 'addLocalAnnotationFile'
    | 'replaceODataService';

type PageLocalId = FlpPageLocalId | AdpPageLocalId;

export const flpPackageName = '@sap-ux/adp-flp-config-sub-generator';
export const adpPackageName = '@sap-ux/generator-adp';

export const adpPageFactory = new WizardPageFactory<AdpPageLocalId>(adpPackageName);
const flpPageFactory = new WizardPageFactory<FlpPageLocalId>(flpPackageName);

/**
 * Returns the list of base wizard pages used in the Adaptation Project.
 *
 * @returns {IPrompt[]} The list of static wizard steps to show initially.
 */
export function getWizardPages(): IPrompt[] {
    return adpPageFactory.createMany([
        {
            localId: 'configuration',
            name: t('yuiNavSteps.configurationName'),
            description: t('yuiNavSteps.configurationDescr')
        },
        {
            localId: 'projectAttributes',
            name: t('yuiNavSteps.projectAttributesName'),
            description: t('yuiNavSteps.projectAttributesDescr')
        }
    ]);
}

/**
 * Returns the FLP configuration page step.
 *
 * @param {boolean} showTileSettingsPage - Flag to determine if the tile settings page should be shown.
 * @param {string} projectName - The name of the project.
 * @returns {IPage} The FLP configuration wizard page.
 */
export function getFlpPages(showTileSettingsPage: boolean, projectName: string): IPage[] {
    return flpPageFactory.createMany([
        ...(showTileSettingsPage
            ? [
                  {
                      localId: 'tileSettings' as FlpPageLocalId,
                      name: t('yuiNavSteps.tileSettingsName', { projectName }),
                      description: ''
                  }
              ]
            : []),
        {
            localId: 'flpConfig',
            name: t('yuiNavSteps.flpConfigName'),
            description: ''
        }
    ]);
}

/**
 * Updates the FLP wizard steps by adding or removing FLP-related pages based on the presence of a base app inbound.
 *
 * @param {boolean} hasBaseAppInbound - Indicates if the base app inbound exists.
 * @param {YeomanUiSteps} prompts - The Yeoman UI Prompts container object.
 * @param {string} projectName - The name of the project.
 * @param {boolean} shouldAdd - Whether to add (`true`) or remove (`false`) the steps.
 */
export function updateFlpWizardSteps(
    hasBaseAppInbound: boolean,
    prompts: YeomanUiSteps,
    projectName: string,
    shouldAdd: boolean
): void {
    const pages = getFlpPages(hasBaseAppInbound, projectName);
    if (pages.length === 2) {
        updateWizardSteps(prompts, pages[0], { localId: 'deployConfig', packageName: adpPackageName }, shouldAdd);
        updateWizardSteps(prompts, pages[1], { localId: 'tileSettings', packageName: flpPackageName }, shouldAdd);
        return;
    }

    updateWizardSteps(prompts, pages[0], { localId: 'deployConfig', packageName: adpPackageName }, shouldAdd);
}

/**
 * Returns the deploy configuration page step.
 *
 * @returns {IPage} The deployment configuration wizard page.
 */
export function getDeployPage(): IPage {
    return adpPageFactory.create({
        localId: 'deployConfig',
        name: t('yuiNavSteps.deployConfigName'),
        description: t('yuiNavSteps.deployConfigDescr')
    });
}

/**
 * Interface representing page id counterparts.
 */
interface PageId {
    localId: PageLocalId;
    packageName: string;
}

/**
 * Dynamically adds or removes a step in the Yeoman UI wizard.
 *
 * If `shouldAdd` is true and the step is not already in the list, it is inserted
 * after the step with name `insertAfter` (or at the end if not found).
 * If the step is already in the list and `shouldAdd` is false, it is removed.
 *
 * If the step exists and needs to be moved (based on desired insertion point),
 * it is repositioned accordingly.
 *
 * If we attempt to add already existing page but which changes in content(name or
 * description) the content gets updated only.
 *
 * @param {YeomanUiSteps} prompts - The Yeoman UI Prompts container object.
 * @param {IPage} page - The page to add or remove.
 * @param {PageId} [insertAfter] - Optional page id counterparts of the step after which to insert.
 * @param {boolean} [shouldAdd] - Whether to add (`true`) or remove (`false`) the step.
 */
export function updateWizardSteps(
    prompts: YeomanUiSteps,
    page: IPage,
    insertAfter: PageId | undefined = undefined,
    shouldAdd: boolean = true
): void {
    const pages: IPage[] = prompts['items'];

    const existingIdx = pages.findIndex((p) => p.id === page.id);

    // If page exists update its name and description only.
    updateExistingPageContentIfNeeded(prompts, page);

    if (shouldAdd) {
        const afterId = insertAfter ? WizardPageFactory.getPageId(insertAfter.packageName, insertAfter.localId) : '';
        // Decide the desired index
        const afterIdx = pages.findIndex((p) => p.id === afterId);
        const targetIdx = afterIdx === -1 ? pages.length : afterIdx + 1;

        // Page already there → move it
        if (existingIdx !== -1) {
            if (existingIdx === targetIdx) {
                return;
            }
            const [existingStep] = pages.splice(existingIdx, 1);
            prompts.splice(targetIdx > existingIdx ? targetIdx - 1 : targetIdx, 0, [existingStep]);
            return;
        }

        // Page not there → insert it
        prompts.splice(targetIdx, 0, [page]);
    } else if (existingIdx !== -1) {
        prompts.splice(existingIdx, 1, []);
    }
}

/**
 * Updates the content of an existing {@link IPage} if there is a change in the content.
 *
 * @param {YeomanUiSteps} prompts - The Yeoman UI Prompts container object.
 * @param {IPage} page - The page to be updated eventually.
 */
function updateExistingPageContentIfNeeded(prompts: YeomanUiSteps, page: IPage): void {
    const pages: IPage[] = prompts['items'];

    const existingPage = pages.find((p) => p.id === page.id);

    if (!existingPage) {
        return;
    }

    if (existingPage.name === page.name && existingPage.description === page.description) {
        return;
    }

    existingPage.name = page.name;
    existingPage.description = page.description;
}

/**
 * Returns the error page for the given sub generator type.
 *
 * @param {GeneratorTypes} subGenType - The type of sub generator.
 * @returns {IPrompt[]} The error page for the given sub generator type.
 */
export function getSubGenErrorPage(subGenType: GeneratorTypes): IPrompt[] {
    switch (subGenType) {
        case GeneratorTypes.ADD_ANNOTATIONS_TO_DATA:
            return adpPageFactory.createMany([
                {
                    localId: 'addLocalAnnotationFile',
                    name: t('yuiNavSteps.addLocalAnnotationFileName'),
                    description: ''
                }
            ]);
        case GeneratorTypes.CHANGE_DATA_SOURCE:
            return adpPageFactory.createMany([
                { localId: 'replaceODataService', name: t('yuiNavSteps.replaceODataServiceName'), description: '' }
            ]);
        default:
            return [];
    }
}

/**
 * Returns the wizard pages for sub-generators that may trigger an ABAP login step.
 *
 * Depending on the destination system's authentication requirements, a
 * credentials page can be shown before the business-specific page.
 *
 * @param {GeneratorTypes} type - The sub-generator type requesting pages.
 * @param {string} destination - ID of the destination system (used only for UI text).
 * @returns {IPrompt[]} The page definitions consumed by Yeoman-UI <Prompts>.
 */
export function getSubGenAuthPages(type: GeneratorTypes, destination: string): IPrompt[] {
    const getCredentialsPageProps = (nameBase: string): { name: string; description: string } => ({
        name: `${nameBase} - Credentials`,
        description: `Enter credentials for your adaptation project's system (${destination})`
    });

    switch (type) {
        case GeneratorTypes.ADD_ANNOTATIONS_TO_DATA:
            return adpPageFactory.createMany([
                {
                    localId: 'addLocalAnnotationFile',
                    ...getCredentialsPageProps(t('yuiNavSteps.addLocalAnnotationFileName'))
                },
                {
                    localId: 'addLocalAnnotationFile',
                    name: t('yuiNavSteps.addLocalAnnotationFileName'),
                    description: t('yuiNavSteps.addLocalAnnotationFileDescr')
                }
            ]);
        case GeneratorTypes.CHANGE_DATA_SOURCE:
            return adpPageFactory.createMany([
                {
                    localId: 'replaceODataService',
                    ...getCredentialsPageProps(t('yuiNavSteps.replaceODataServiceName'))
                },
                {
                    localId: 'replaceODataService',
                    name: t('yuiNavSteps.replaceODataServiceName'),
                    description: t('yuiNavSteps.replaceODataServiceDescr')
                }
            ]);
        default:
            return [];
    }
}
