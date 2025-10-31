import type { PageDef } from './types';
import { FioriElementsVersion, PageTypeV4 } from '@sap/ux-specification/dist/types/src';

const newPagePrefixForType = new Map<PageTypeV4, string>([
    [PageTypeV4.ListReport, 'List'],
    [PageTypeV4.ObjectPage, PageTypeV4.ObjectPage],
    [PageTypeV4.CustomPage, 'Page'],
    [PageTypeV4.FPMCustomPage, 'Page'],
    [PageTypeV4.AnalyticalListPage, 'ALP']
]);

/**
 * Generates the id for a new V4 page.
 *
 * @param page - page attributes.
 * @param parentPage - parent page; to check if it is a root page.
 * @param navigationProperty - Navigation property (optional).
 * @returns parts = an array of strings that shall be joined to form the page ID.
 */
function generatePageIdV4(page: PageDef, parentPage: string | undefined, navigationProperty?: string): string[] {
    let name = '';
    let parts: string[] = [];
    // Populate with page entity or name
    if (page.pageType === PageTypeV4.CustomPage || page.pageType === PageTypeV4.FPMCustomPage) {
        const viewId = page.viewName ?? '';
        const names = viewId.split('.');
        name = names[names.length - 1];
    } else {
        name = page.contextPath ? page.contextPath.slice(1).replace(/\//g, '_') : page.entitySet;
    }
    parts = [name];
    if (
        parentPage &&
        navigationProperty &&
        (!page.contextPath || page.contextPath.indexOf(navigationProperty) === -1)
    ) {
        parts.push(navigationProperty);
    }
    // Append page type to last part of page id - it places page type at the end of id without separator
    parts[parts.length - 1] += newPagePrefixForType.get(page.pageType as PageTypeV4);
    return parts;
}

/**
 * Generates the id for a new V2 page
 * @param {Page} page - page attributes
 * @returns parts = an array of strings that shall be joined to form the page ID
 */
function generatePageIdV2(page: PageDef): string[] {
    const parts: string[] = [];
    parts.push(page.pageType);
    if (page.entitySet) {
        parts.push(page.entitySet);
    }
    return parts;
}

/**
 * Generates the id for a new page.
 *
 * @param page - page attributes.
 * @param parentPage - parent page.
 * @param pages - Object with existing pages.
 * @param appVersion - fiori elements version.
 * @param navigationProperty - navigation property (optional).
 * @returns Generated page id.
 */
export function generatePageId(
    page: PageDef,
    parentPage: string | undefined,
    pages: PageDef[],
    appVersion: FioriElementsVersion,
    navigationProperty?: string
): string {
    let parts: string[] = [];
    if (appVersion === FioriElementsVersion.v2) {
        // Page generation for V2 page
        parts = generatePageIdV2(page);
    } else {
        // Page generation for V4 page
        parts = generatePageIdV4(page, parentPage, navigationProperty);
    }

    let pageId = parts.join('_');

    const existingPageIds = pages.map((existingPage) => existingPage.pageId);
    let idx = 0;
    while (existingPageIds.indexOf(pageId) > -1) {
        pageId += idx.toString();
        idx++;
    }
    return pageId;
}
