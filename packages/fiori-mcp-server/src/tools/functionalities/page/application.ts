import { CustomExtensionType, PageTypeV4 } from '@sap/ux-specification/dist/types/src';
import type { ApplicationAccess } from '@sap-ux/project-access';
import { SapuxFtfsFileIO, type AppData } from '../../../page-editor-api';
import type { ExecuteFunctionalityOutput, GetFunctionalityDetailsInput } from '../../../types';
import { getService } from './serviceStore';
import type { NewPage, PageDef, AllowedNavigationOptions } from './types';
import { MissingNavigationReason } from './types';
import { generatePageId } from './utils';
import { DirName } from '@sap-ux/project-access';
import { join } from 'path';
import { ADD_PAGE, DELETE_PAGE } from '../../../constant';
import type { Application as ApplicationConfig, CustomExtensionData, v4 } from '@sap/ux-specification/dist/types/src';
import { getDefaultExtensionFolder } from '../../utils';

/**
 * Represents an application instance with its metadata, access configuration and functionality details.
 */
export class Application {
    private readonly serviceName: string;
    private readonly appData: AppData;
    private readonly appId: string;
    private readonly applicationAccess: ApplicationAccess;
    private readonly params: GetFunctionalityDetailsInput;
    /**
     * Creates a new instance of the Application class.
     *
     * @param root0 - The constructor arguments.
     * @param root0.params - Input parameters for functionality details.
     * @param root0.applicationAccess - The application access object.
     * @param root0.appId - The unique identifier of the application.
     * @param root0.serviceName - The service name associated with the application.
     * @param root0.appData - Metadata and configuration data for the application.
     */
    constructor({
        params,
        applicationAccess,
        appId,
        serviceName,
        appData
    }: {
        params: GetFunctionalityDetailsInput;
        applicationAccess: ApplicationAccess;
        appId: string;
        serviceName: string;
        appData: AppData;
    }) {
        this.params = params;
        this.serviceName = serviceName;
        this.appData = appData;
        this.appId = appId;
        this.applicationAccess = applicationAccess;
    }

    /**
     * Generates a string representation of all allowed navigation options.
     *
     * @param navigations - An array of allowed navigation options.
     * @returns A comma-separated string of navigation names.
     */
    private getAllowedNavigationsOutput(navigations: AllowedNavigationOptions[]): string {
        return navigations.map((navigation) => navigation.name).join(', ');
    }

    /**
     * Generates an error message for missing navigation.
     *
     * @param reason - The reason for the missing navigation.
     * @param navigations - An array of allowed navigation options.
     * @param parentPageId - Optional ID of the parent page.
     * @returns An error message string.
     */
    private getMissingNavigationMessage(
        reason: MissingNavigationReason,
        navigations: AllowedNavigationOptions[],
        parentPageId?: string
    ): string {
        let message = '';
        switch (reason) {
            case MissingNavigationReason.NoAnyNavigationsForParent: {
                message = 'page does not have valid navigation for add';
                break;
            }
            case MissingNavigationReason.NotFoundNavigationForParent: {
                message = `provided 'navigation' was not found. ${parentPageId} has following navigations available: ${this.getAllowedNavigationsOutput(
                    navigations
                )}`;
                break;
            }
            case MissingNavigationReason.NoEntityProvided: {
                message = `provide 'entitySet' for very first page`;
                break;
            }
            case MissingNavigationReason.NotFoundEntity: {
                message = `provided 'entitySet' was not found. Following entitySets available: ${this.getAllowedNavigationsOutput(
                    navigations
                )}`;
                break;
            }
        }
        return message;
    }

    /**
     * Calculates the context path for a page.
     *
     * @param parentPage - Optional parent page definition.
     * @param navigationProperty - Optional navigation property.
     * @param entitySet - Optional entity set.
     * @returns The calculated context path or undefined.
     */
    private calculateContextPath(
        parentPage?: PageDef,
        navigationProperty?: string,
        entitySet?: string
    ): string | undefined {
        let contextPath: string | undefined;
        if (!parentPage || parentPage.pageType === PageTypeV4.ListReport) {
            contextPath = `/${entitySet}`;
        } else if (parentPage.contextPath) {
            contextPath =
                navigationProperty && parentPage.routePattern !== ':?query:'
                    ? `${parentPage.contextPath}/${navigationProperty}`
                    : `/${entitySet}`;
        } else if (parentPage.entitySet) {
            contextPath = this.calculateContextPathBasedOnEntitySet(parentPage, navigationProperty);
        }

        return contextPath;
    }

    /**
     * Calculates the context path based on the entity set of the parent page.
     *
     * @param parentPage - The parent page definition.
     * @param navigationProperty - Optional navigation property.
     * @returns The calculated context path or undefined.
     */
    private calculateContextPathBasedOnEntitySet(parentPage: PageDef, navigationProperty?: string): string | undefined {
        let contextPath: string | undefined;
        const routePattern = parentPage.routePattern;
        const convertedParentPattern = routePattern?.replace(':?query:', '').replace(/\({[^}]*}\)/g, '');
        if (!convertedParentPattern) {
            contextPath =
                navigationProperty && navigationProperty !== ''
                    ? `/${parentPage.entitySet}/${navigationProperty}`
                    : `/${parentPage.entitySet}`;
        } else {
            contextPath =
                navigationProperty && navigationProperty !== ''
                    ? `/${convertedParentPattern}/${navigationProperty}`
                    : `/${convertedParentPattern}`;
        }
        return contextPath;
    }
    /**
     * Creates an error response object.
     *
     * @param message - The error message.
     * @returns An ExecuteFunctionalityOutput object with error details.
     */
    private createErrorResponse(message: string): ExecuteFunctionalityOutput {
        return {
            functionalityId: ADD_PAGE,
            status: 'Failed',
            message,
            parameters: [],
            appPath: this.params.appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Validates the input for page creation.
     *
     * @param newPage - The new page details.
     * @param pages - Existing pages in the application.
     * @param viewName - Optional view name for custom pages.
     * @returns A promise that resolves to an ExecuteFunctionalityOutput object if there's an error, or null if validation passes.
     */
    private async validatePageCreationInput(
        newPage: NewPage,
        pages: PageDef[],
        viewName?: string
    ): Promise<ExecuteFunctionalityOutput | null> {
        if (pages.length && !newPage.parent) {
            return this.createErrorResponse('Provide "parentPage" for page creation');
        }

        if (newPage.pageType === PageTypeV4.CustomPage) {
            const validationError = this.validateCustomPageViewName(viewName);
            if (validationError) {
                return validationError;
            }
        }

        return null;
    }

    /**
     * Validates the view name for a custom page.
     *
     * @param viewName - The view name to validate.
     * @returns An ExecuteFunctionalityOutput object if there's an error, or null if validation passes.
     */
    private validateCustomPageViewName(viewName?: string): ExecuteFunctionalityOutput | null {
        const standardEnding = '.view.xml';
        const cleanViewName = viewName?.endsWith(standardEnding) ? viewName.slice(0, -standardEnding.length) : viewName;

        if (!cleanViewName) {
            return this.createErrorResponse('Provide "viewName" for CustomPage');
        }

        if (!/^[a-z][a-z0-9_-]*$/i.exec(cleanViewName)) {
            return this.createErrorResponse(
                `'viewName' must not contain spaces, must start with an upper-case letter, and may contain letters, digits, and underscores.`
            );
        }

        return null;
    }

    /**
     * Validates the navigation input for page creation.
     *
     * @param parentPage - The parent page definition, if any.
     * @param navigation - Optional navigation string.
     * @param entitySet - Optional entity set.
     * @param pages - Array of existing page definitions.
     * @returns A promise that resolves to an ExecuteFunctionalityOutput object if there's an error, or null if validation passes.
     */
    private async validateNavigationInput(
        parentPage: PageDef | undefined,
        navigation?: string,
        entitySet?: string,
        pages: PageDef[] = []
    ): Promise<ExecuteFunctionalityOutput | null> {
        if (pages.length && !parentPage) {
            return this.createErrorResponse('provided "parentPage" was not found');
        }

        const navigations = await this.getAllowedNavigations(parentPage);

        if (parentPage && !navigations.length) {
            const message = this.getMissingNavigationMessage(
                MissingNavigationReason.NoAnyNavigationsForParent,
                navigations
            );
            return this.createErrorResponse(message);
        }

        const targetNavigation = this.findTargetNavigation(navigations, navigation, entitySet);

        if (parentPage && !targetNavigation) {
            const message = this.getMissingNavigationMessage(
                MissingNavigationReason.NotFoundNavigationForParent,
                navigations,
                parentPage.pageId
            );
            return this.createErrorResponse(message);
        }

        if (!parentPage && !entitySet) {
            const message = this.getMissingNavigationMessage(MissingNavigationReason.NoEntityProvided, navigations);
            return this.createErrorResponse(message);
        }

        if (!parentPage && !targetNavigation) {
            const message = this.getMissingNavigationMessage(MissingNavigationReason.NotFoundEntity, navigations);
            return this.createErrorResponse(message);
        }

        return null;
    }

    /**
     * Finds the target navigation option based on the provided navigation or entity set.
     *
     * @param navigations - Array of allowed navigation options.
     * @param navigation - Optional navigation string to search for.
     * @param entitySet - Optional entity set to search for.
     * @returns The matching AllowedNavigationOptions object or undefined if not found.
     */
    private findTargetNavigation(
        navigations: AllowedNavigationOptions[],
        navigation?: string,
        entitySet?: string
    ): AllowedNavigationOptions | undefined {
        return navigations.find((checkNavigation) => {
            const name = checkNavigation.name.toLocaleLowerCase();
            return name === navigation?.toLocaleLowerCase() || name === entitySet?.toLocaleLowerCase();
        });
    }

    /**
     * Generates a new page using the FPM writer.
     *
     * @param newPage - The new page details.
     * @param parentPage - The parent page, if any.
     * @param targetNavigation - The target navigation option.
     * @param pages - Existing pages in the application.
     * @param viewName - Optional view name for custom pages.
     * @param entitySet - Optional entity set for the new page.
     * @returns A promise that resolves to an object containing the new page ID and changes made.
     */
    private async generatePageWithFPMWriter(
        newPage: NewPage,
        parentPage: PageDef | undefined,
        targetNavigation: AllowedNavigationOptions | undefined,
        pages: PageDef[],
        viewName?: string,
        entitySet?: string
    ): Promise<{ pageID: string; changes: string[] }> {
        const fpnNavigation = parentPage
            ? {
                  sourceEntity: parentPage.entitySet,
                  sourcePage: parentPage.pageId,
                  navEntity: targetNavigation?.name,
                  navKey: true
              }
            : undefined;

        const contextPath = this.calculateContextPath(
            parentPage,
            targetNavigation?.name,
            targetNavigation?.entitySet ?? entitySet
        );

        const id = generatePageId(
            {
                entitySet: targetNavigation?.entitySet ?? entitySet ?? '',
                pageId: '',
                pageType: newPage.pageType,
                contextPath: contextPath,
                viewName
            },
            parentPage?.pageId,
            pages,
            targetNavigation?.name
        );

        const pageApi = {
            id,
            entity: targetNavigation?.entitySet ?? entitySet ?? '',
            navigation: fpnNavigation,
            contextPath,
            name: newPage.pageType === PageTypeV4.CustomPage ? viewName : undefined
        };

        const changes = await this.writeFPM(newPage.pageType, pageApi, viewName);
        return { pageID: id, changes };
    }

    /**
     * Writes the Flexible Programming Model (FPM) configuration.
     *
     * @param pageType - The type of the page.
     * @param fpmData - The page API configuration.
     * @param viewName - Optional view name for custom pages.
     * @returns A promise that resolves to an array of strings representing the changes made.
     */
    private async writeFPM(pageType: string, fpmData: CustomExtensionData, viewName?: string): Promise<string[]> {
        const ftfsFileIo = new SapuxFtfsFileIO(this.applicationAccess);
        let customExtension = CustomExtensionType.ListReport;
        if (pageType === PageTypeV4.ObjectPage) {
            customExtension = CustomExtensionType.ObjectPage;
        }

        if (pageType === PageTypeV4.CustomPage && viewName) {
            customExtension = CustomExtensionType.CustomPage;
        }
        const folder = getDefaultExtensionFolder(DirName.View);

        return ftfsFileIo.writeFPM({
            customExtension,
            basePath: join(this.applicationAccess.project.root, this.appId),
            data: { ...fpmData, folder }
        });
    }
    /**
     * Deletes navigation links for a given page.
     *
     * @param navigation - The navigation object containing links.
     * @param pageName - The name of the page to remove links for.
     */
    private deleteNavigationLinks(
        navigation: {
            [property: string]: string | object;
        },
        pageName: string
    ): void {
        if (navigation) {
            for (const key in navigation) {
                const navigationPage = this.findPageByNavigation(navigation, key);
                if (navigationPage === pageName) {
                    delete navigation[key];
                    break;
                }
            }
        }
    }
    /**
     * Function to evaluate the navigation entry of a page.
     * Old format (spec version <=3): <target page name>: <route name>.
     * New format (spec version >=4): <route name>: { route: <target page name>}.
     *
     * @param pageObjNavigation - Page data.
     * @param key - key in schema for the route definition.
     * @returns the target page name from the route definition.
     */
    private findPageByNavigation(
        pageObjNavigation: {
            [property: string]: string | object;
        },
        key: string
    ): string | undefined {
        const navigationEntry = pageObjNavigation?.[key];
        return typeof navigationEntry === 'string' ? key : (navigationEntry as { route?: string })?.route;
    }

    /**
     * Method which deletes pages recursively by looping through navigation.
     *
     * @param app - Content of 'app.json'.
     * @param pageName - page's name to remove
     */
    private deletePageRecursively(app: ApplicationConfig, pageName?: string): void {
        if (!pageName) {
            return;
        }
        const { pages } = app;
        const settings: v4.AppSettings = app.settings ?? {};
        if (pages?.[pageName]) {
            const page: v4.Page = pages?.[pageName] as v4.Page;
            delete pages[pageName];
            // Delete controller extension of page
            const extensionId = `${page.pageType}#${pageName}`;
            if (settings.controllerExtensions?.[extensionId]) {
                delete settings.controllerExtensions[extensionId];
            }
            // Delete child pages
            if (page.navigation) {
                for (const key in page.navigation) {
                    const subPage = this.findPageByNavigation(page.navigation, key);
                    this.deletePageRecursively(app, subPage);
                }
            }
        }
    }

    /**
     * Retrieves all pages defined in the application.
     *
     * @returns An array of PageDef objects representing the pages in the application.
     */
    public getPages(): PageDef[] {
        const { config } = this.appData;
        const { pages = {} } = config;
        const result: PageDef[] = [];
        for (const pageId in pages) {
            const page = pages[pageId];
            result.push({
                pageId,
                pageType: page.pageType ?? PageTypeV4.ListReport,
                entitySet: page.entitySet ?? '',
                contextPath: page.contextPath,
                routePattern:
                    'routePattern' in page && typeof page.routePattern === 'string' ? page.routePattern : undefined
            });
        }
        return result;
    }
    /**
     * Retrieves allowed navigation options for a given parent page.
     *
     * @param parentPage - Optional parent page definition.
     * @param refresh - Whether to refresh the data from the service.
     * @returns A promise that resolves to an array of AllowedNavigationOptions.
     */
    public async getAllowedNavigations(parentPage?: PageDef, refresh = false): Promise<AllowedNavigationOptions[]> {
        if (!parentPage || parentPage?.pageType === 'ListReport') {
            // Entities from zero page or from list report
            return this.getRootPageNavigationOptions(refresh);
        }
        // Navigation from object page or custom page
        const service = await getService({
            appName: this.appId,
            project: this.applicationAccess.project,
            serviceName: this.serviceName
        });
        return (await service.getAllowedNavigations(parentPage?.entitySet, parentPage?.entitySet, refresh)).map(
            (navigation) => ({ ...navigation, isNavigation: true })
        );
    }
    /**
     * Retrieves navigation options for the root page.
     *
     * @param refresh - Whether to refresh the data from the service.
     * @returns A promise that resolves to an array of AllowedNavigationOptions.
     */
    public async getRootPageNavigationOptions(refresh = false): Promise<AllowedNavigationOptions[]> {
        const service = await getService({
            appName: this.appId,
            project: this.applicationAccess.project,
            serviceName: this.serviceName
        });
        const entities = await service.getAllowedEntities(refresh);
        return entities.map((entity) => {
            return {
                entitySet: entity.entitySet,
                name: entity.entitySet
            };
        });
    }

    /**
     * Retrieves the available navigation options for each page and available entities for very first page creation.
     *
     * @returns A promise that resolves to an object containing navigations and entities.
     */
    public async getCreationNavigationOptions(): Promise<{
        navigations: { [key: string]: AllowedNavigationOptions[] };
        entities?: AllowedNavigationOptions[];
    }> {
        const options: {
            navigations: { [key: string]: AllowedNavigationOptions[] };
            entities?: AllowedNavigationOptions[];
        } = {
            navigations: {}
        };
        const pages = this.getPages();
        if (pages.length) {
            let refreshNavigations = true;
            for (const page of pages) {
                options.navigations[page.pageId] = await this.getAllowedNavigations(page, refreshNavigations);
                // Pass with refresh only once
                refreshNavigations = false;
            }
        } else {
            options.entities = await this.getAllowedNavigations();
        }

        return options;
    }

    /**
     * Creates a new page in the application.
     *
     * @param newPage - Details of the new page to be created.
     * @returns A promise that resolves to ExecuteFunctionalityOutput containing the result of the page creation.
     */
    public async createPage(newPage: NewPage): Promise<ExecuteFunctionalityOutput> {
        const { parent, navigation, pageType, entitySet } = newPage;
        const viewName = newPage.pageType === PageTypeV4.CustomPage ? newPage.viewName : undefined;
        const pages = this.getPages();

        // Validate input parameters
        const validationError = await this.validatePageCreationInput(newPage, pages, viewName);
        if (validationError) {
            return validationError;
        }

        // Find parent page and validate navigation
        const parentPage = pages.find((page) => page.pageId === parent);
        const navigationValidationError = await this.validateNavigationInput(parentPage, navigation, entitySet, pages);
        if (navigationValidationError) {
            return navigationValidationError;
        }

        // Generate the page
        const navigations = await this.getAllowedNavigations(parentPage);
        const targetNavigation = this.findTargetNavigation(navigations, navigation, entitySet);
        const { pageID, changes } = await this.generatePageWithFPMWriter(
            newPage,
            parentPage,
            targetNavigation,
            pages,
            viewName,
            entitySet
        );

        return {
            functionalityId: ADD_PAGE,
            status: changes.length ? 'success' : 'skipped',
            message: changes.length
                ? `Page with id '${pageID}' of type '${pageType}' was created successfully in application '${this.appId}'`
                : `No changes were made for '${pageType}'`,
            parameters: [],
            appPath: this.params.appPath,
            changes,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Deletes a page from the application.
     *
     * @param page - The page to be deleted.
     * @param page.pageId - The ID of the page to be deleted.
     * @returns A promise that resolves to ExecuteFunctionalityOutput containing the result of the page deletion.
     */
    public async deletePage(page: { pageId: string }): Promise<ExecuteFunctionalityOutput> {
        const { pageId } = page;
        const appData = structuredClone(this.appData);
        const { config } = appData;
        let deleteHappened = false;
        const { pages = {} } = config;
        if (pages?.[pageId]) {
            // Remove reference in 'navigation' to page from parent
            for (const parentPage in pages) {
                if (pages[parentPage].navigation) {
                    this.deleteNavigationLinks(pages[parentPage].navigation, pageId);
                }
            }
            // Delete page recursively together with all child pages
            this.deletePageRecursively(config, pageId);
            deleteHappened = true;
        }

        // delete home property if last page has been deleted
        if (Object.keys(pages).length === 0) {
            delete (config as { home?: string }).home;
        }

        if (deleteHappened) {
            const ftfsFileIo = new SapuxFtfsFileIO(this.applicationAccess);
            await ftfsFileIo.writeApp(appData);

            return {
                functionalityId: DELETE_PAGE,
                status: 'success',
                message: `Page with id '${pageId}' was deleted successfully in application '${this.appId}'`,
                parameters: [],
                appPath: this.params.appPath,
                changes: [],
                timestamp: new Date().toISOString()
            };
        }

        return {
            functionalityId: DELETE_PAGE,
            status: 'unchanged',
            message: `Page with id '${pageId}' was not found in application '${this.appId}'`,
            parameters: [],
            appPath: this.params.appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }
}
