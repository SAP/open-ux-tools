import { CustomExtensionType, PageTypeV4 } from '@sap/ux-specification/dist/types/src';
import type { ApplicationAccess } from '@sap-ux/project-access';
import { SapuxFtfsFileIO, type AppData } from '../../../page-editor-api';
import type {
    ExecuteFunctionalityOutput,
    GetFunctionalityDetailsInput,
    GetFunctionalityDetailsOutput
} from '../../../types';
import { getService } from './serviceStore';
import type { NewPage, PageDef, AllowedNavigationOptions } from './types';
import { MissingNavigationReason } from './types';
import { generatePageId } from './utils';
import { DirName } from '@sap-ux/project-access';
import { join } from 'path';
import { ADD_PAGE, DELETE_PAGE } from '../../../constant';
import type { Application as ApplicationConfig, v4 } from '@sap/ux-specification/dist/types/src';
import { getDefaultExtensionFolder } from '../../utils';

export const ADD_PAGE_FUNCTIONALITY: GetFunctionalityDetailsOutput = {
    id: ADD_PAGE,
    name: 'Add new page to application by updating manifest.json',
    description: 'Create new fiori elements page like ListReport, ObjectPage, CustomPage',
    parameters: []
};
export const DELETE_PAGE_FUNCTIONALITY: GetFunctionalityDetailsOutput = {
    id: DELETE_PAGE,
    name: 'Delete page from application by updating manifest.json',
    description: 'Remove existing fiori elements page from the application',
    parameters: []
};

export class Application {
    private serviceName: string;
    private appData: AppData;
    private appId: string;
    private applicationAccess: ApplicationAccess;
    private params: GetFunctionalityDetailsInput;
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

    private getAllowedNavigationsName(navigation: AllowedNavigationOptions) {
        return navigation.name;
    }

    private getAllowedNavigationsOutput(navigations: AllowedNavigationOptions[]): string {
        return navigations.map((navigation) => this.getAllowedNavigationsName(navigation)).join(', ');
    }

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

    private calculateContextPath(
        parentPage?: PageDef,
        navigationProperty?: string,
        entitySet?: string
    ): string | undefined {
        let contextPath: string | undefined;
        if (!parentPage || parentPage.pageType === PageTypeV4.ListReport) {
            contextPath = `/${entitySet}`;
        } else {
            if (parentPage.contextPath) {
                contextPath =
                    navigationProperty && parentPage.routePattern !== ':?query:'
                        ? `${parentPage.contextPath}/${navigationProperty}`
                        : `/${entitySet}`;
            } else if (parentPage.entitySet) {
                contextPath = this.calculateContextPathBasedOnEntitySet(parentPage, navigationProperty);
            }
        }

        return contextPath;
    }

    private calculateContextPathBasedOnEntitySet(parentPage: PageDef, navigationProperty?: string): string | undefined {
        let contextPath: string | undefined;
        const routePattern = parentPage.routePattern;
        const convertedParentPattern = routePattern && routePattern.replace(':?query:', '').replace(/\({[^}]*}\)/g, '');
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

    private validateCustomPageViewName(viewName?: string): ExecuteFunctionalityOutput | null {
        const standardEnding = '.view.xml';
        const cleanViewName = viewName?.endsWith(standardEnding) ? viewName.slice(0, -standardEnding.length) : viewName;

        if (!cleanViewName) {
            return this.createErrorResponse('Provide "viewName" for CustomPage');
        }

        if (!cleanViewName.match(/^[a-zA-Z][a-zA-Z0-9_-]{0,}$/i)) {
            return this.createErrorResponse(
                `'viewName' must not contain spaces, must start with an upper-case letter, and may contain letters, digits, and underscores.`
            );
        }

        return null;
    }

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
            contextPath
        };

        const changes = await this.writeFPM(newPage.pageType, pageApi, viewName);
        return { pageID: id, changes };
    }

    private async writeFPM(pageType: string, pageApi: any, viewName?: string): Promise<string[]> {
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
            data: { ...pageApi, folder }
        });
    }
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
     * Old format (spec version <=3): <target page name>: <route name>
     * New format (spec version >=4): <route name>: { route: <target page name>}
     * @param {PageNodeModel} pageObj - Page node model
     * @param key - key in schema for the route definition
     * @returns the target page name from the route definition
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
     * Method which deletes pages recursively by looping through navigation
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
    public async getCreationOptions(pageType?: string): Promise<GetFunctionalityDetailsOutput> {
        ADD_PAGE_FUNCTIONALITY.parameters = [];

        const pages = this.getPages();
        if (pages.length) {
            // Validate navigation
            const navigationsMap: { [key: string]: string } = {};
            let refreshNavigations = true;
            for (const page of pages) {
                const navigations = await this.getAllowedNavigations(page, refreshNavigations);
                navigationsMap[page.pageId] = this.getAllowedNavigationsOutput(navigations);
                // Pass with refresh only once
                refreshNavigations = false;
            }
            if (pageType === PageTypeV4.CustomPage) {
                ADD_PAGE_FUNCTIONALITY.parameters.push({
                    id: 'pageViewName',
                    type: 'string',
                    description: `Name of custom view file. First try to extract view name from user input that satisfies the pattern, if not possible ask user to provide view name`,
                    pattern: '/^[a-zA-Z][a-zA-Z0-9_-]{0,}$/i',
                    required: true
                });
            }
            ADD_PAGE_FUNCTIONALITY.parameters = [
                {
                    id: 'parentPage',
                    type: 'string',
                    description: `Parent page is id/name of parent page. First try to extract parent page from user input in a format defined in example, if not possible suggest content defined in options`,
                    options: Object.keys(navigationsMap),
                    required: true,
                    examples: ['parentPage: ' + Object.keys(navigationsMap)[0]]
                },
                {
                    id: 'pageNavigation',
                    type: 'string',
                    description: `Page navigation option for parent page. First try to extract navigation option from user input in a format defined in example, if not possible suggest content defined in options`,
                    options: Object.keys(navigationsMap).map(
                        (item) => `for ${item}: available navigation(s) is/are one of: ${navigationsMap[item]}`
                    ),
                    examples: ['pageNavigation: ' + Object.values(navigationsMap)[0].split(',')[0]],
                    required: true
                },
                {
                    id: 'pageType',
                    type: 'string',
                    description: `Type of page to be created. First try to extract page type from user input in a format defined in example, if not possible suggest content defined in options.`,
                    options: Object.keys(PageTypeV4),
                    examples: ['pageType: ' + Object.keys(PageTypeV4)[0]],
                    required: true
                }
            ];
            return ADD_PAGE_FUNCTIONALITY;
        }
        // Creation of very first page
        const entities = await this.getAllowedNavigations();
        ADD_PAGE_FUNCTIONALITY.parameters = [
            {
                id: 'entitySet',
                type: 'string',
                description: `Entity set for the new page. First try to extract entity from user input in a format defined in example, if not possible suggest content defined in options.`,
                options: entities.map((entity) => this.getAllowedNavigationsName(entity)),
                examples: ['entitySet: ' + entities.map((entity) => this.getAllowedNavigationsName(entity))[0]],
                required: true
            },
            {
                id: 'pageType',
                type: 'string',
                description: `Type of page to be created. First try to extract page type from user input in a format defined in example, if not possible suggest content defined in options.`,
                options: Object.keys(PageTypeV4),
                examples: ['pageType: ' + Object.keys(PageTypeV4)[0]],
                required: true
            }
        ];
        return ADD_PAGE_FUNCTIONALITY;
    }
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

    public async getDeleteOptions(): Promise<GetFunctionalityDetailsOutput> {
        DELETE_PAGE_FUNCTIONALITY.parameters = [];
        const pages = this.getPages();
        DELETE_PAGE_FUNCTIONALITY.parameters.push({
            id: 'pageId',
            type: 'string',
            description: `Page id to be deleted. First try to extract page id from user input in a format defined in example, if not possible suggest content defined in options`,
            options: pages.map((page) => page.pageId),
            examples: ['pageId: ' + pages.map((page) => page.pageId)[0]],
            required: true
        });
        return DELETE_PAGE_FUNCTIONALITY;
    }

    public async deletePage({ pageId }: { pageId: string }): Promise<ExecuteFunctionalityOutput> {
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
