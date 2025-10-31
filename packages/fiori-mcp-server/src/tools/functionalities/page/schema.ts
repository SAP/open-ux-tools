import * as zod from 'zod';
import { PageTypeV4, FioriElementsVersion } from '@sap/ux-specification/dist/types/src';
import type { AllowedNavigationOptions, PageDef } from './types';
import { EXTENSION_FILE_NAME_PATTERN } from '../../../constant';

/**
 * Enum of allowed page types.
 */
const PageTypeEnumV4 = zod.enum([PageTypeV4.ListReport, PageTypeV4.ObjectPage, PageTypeV4.CustomPage]);
const PageTypeEnumV2 = zod.enum([PageTypeV4.ObjectPage]);

/**
 * Schema factory for the very first page creation.
 *
 * @param entities - Allowed entity options for new page.
 * @param version - Fiori elements version of application.
 * @returns A Zod schema for the very first page creation.
 */
const firstPageSchema = (entities: AllowedNavigationOptions[], version: FioriElementsVersion) => {
    const pageTypeEntries = version === FioriElementsVersion.v2 ? PageTypeEnumV2 : PageTypeEnumV4;
    return zod.object({
        pageType: pageTypeEntries.describe(
            `Type of page to be created. First try to extract page type from user input, if not possible suggest content defined in options.`
        ),
        entitySet: zod
            .enum(entities.map((entity) => entity.name))
            .describe(
                `Entity set for the new page. First try to extract entity from user input, if not possible suggest content defined in options.`
            )
    });
};

/**
 * Schema factory for creating a child page.
 *
 * @param page - The parent page ID.
 * @param navigations - Allowed navigation options for the parent page.
 * @param version - Fiori elements version of application.
 * @returns A Zod schema for validating child page creation input.
 */
const childPageSchema = (page: string, navigations: AllowedNavigationOptions[], version: FioriElementsVersion) => {
    const pageTypeEntries = version === FioriElementsVersion.v2 ? PageTypeEnumV2 : PageTypeEnumV4;
    const zodObject: {
        parentPage: zod.ZodLiteral<string>;
        pageNavigation: zod.ZodEnum;
        pageType: zod.ZodEnum<{
            ObjectPage: PageTypeV4.ObjectPage;
            ListReport?: PageTypeV4.ListReport;
            CustomPage?: PageTypeV4.CustomPage;
        }>;
        pageViewName?: zod.ZodOptional<zod.ZodString>;
    } = {
        parentPage: zod
            .literal(page)
            .describe(
                'Parent page is id/name of parent page. First try to extract parent page from user input, if not possible suggest content defined in options'
            ),
        pageNavigation: zod.enum(navigations.map((n) => n.name)),
        pageType: pageTypeEntries.describe(
            `Type of page to be created. First try to extract page type from user input, if not possible suggest content defined in options.`
        )
    };
    if (version === FioriElementsVersion.v4) {
        // V4 support custom view creation
        zodObject.pageViewName = zod
            .string()
            .regex(EXTENSION_FILE_NAME_PATTERN)
            .optional()
            .describe(
                `Required if pageType is "CustomPage". Name of custom view file. First try to extract view name from user input that satisfies the pattern, if not possible ask user to provide view name`
            );
    }
    let schema = zod.object(zodObject);
    if (version === FioriElementsVersion.v4) {
        // Additional validation for v4 schema
        schema = schema.refine((data) => !(data.pageType === PageTypeV4.CustomPage && !data.pageViewName), {
            path: ['pageViewName'],
            message: 'A pageViewName must be provided when using PageTypeV4.CustomPage'
        });
    }
    return schema;
};

/**
 * Builds a Zod schema for page creation input.
 * - If `navigations` has entries, a union schema is returned for creating child pages.
 * - If `navigations` is empty, a schema for creating the very first page is returned.
 *
 * @param navigations - Mapping of parent page IDs to allowed navigation options.
 * @param entities - Entity options available when creating the very first page.
 * @param version - Fiori elements version of application.
 * @returns A Zod schema that validates either child page creation or first page creation.
 */
export function buildPageCreationSchema(
    navigations: { [key: string]: AllowedNavigationOptions[] },
    entities: AllowedNavigationOptions[] = [],
    version: FioriElementsVersion = FioriElementsVersion.v4
) {
    const pages = Object.keys(navigations);

    if (pages.length) {
        return zod.union(pages.map((page) => childPageSchema(page, navigations[page], version)));
    }

    return firstPageSchema(entities, version);
}

/**
 * Builds a Zod schema for deleting an existing page.
 *
 * @param pages - List of available pages from which a `pageId` can be selected.
 * @returns A Zod schema validating a deletion request with a `pageId`.
 */
export function buildPageDeletionSchema(pages: PageDef[] = []) {
    const pageIds = pages.map((page) => page.pageId);
    return zod.object({
        pageId: zod
            .enum(pageIds)
            .describe(
                'Page id to be deleted. First try to extract page id from user input, if not possible suggest content defined in options'
            )
    });
}

export type PageDeletionInput = zod.infer<ReturnType<typeof buildPageDeletionSchema>>;
export type PageCreationInput = zod.infer<ReturnType<typeof buildPageCreationSchema>>;
