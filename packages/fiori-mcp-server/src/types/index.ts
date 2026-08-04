import type * as zod from 'zod';
import type { ApplicationAccess } from '@sap-ux/project-access';
import type { FioriAppSchema, FunctionalityIdSchema, FunctionalitySchema, ParameterSchema } from './basic.js';
import type {
    ExecuteFunctionalityInputSchema,
    GetFunctionalityDetailsInputSchema,
    ListFioriAppsInputSchema,
    ListFunctionalitiesInputSchema,
    DocSearchInputSchema,
    DownloadODataServiceMetadataInputSchema
} from './input.js';
import type {
    ExecuteFunctionalityOutputSchema,
    GetFunctionalityDetailsOutputSchema,
    ListFioriAppsOutputSchema,
    ListFunctionalitiesOutputSchema,
    FetchServiceMetadataOutputSchema,
    GenerateAppOutputSchema,
    ListSapSystemsOutputSchema
} from './output.js';

export type FioriApp = zod.infer<typeof FioriAppSchema>;
export type FunctionalityId = zod.infer<typeof FunctionalityIdSchema>;
export type Parameter = zod.infer<typeof ParameterSchema>;
export type Functionality = zod.infer<typeof FunctionalitySchema>;

export type ListFioriAppsInput = zod.infer<typeof ListFioriAppsInputSchema>;
export type ListFioriAppsOutput = zod.infer<typeof ListFioriAppsOutputSchema>;

export type ListFunctionalitiesInput = zod.infer<typeof ListFunctionalitiesInputSchema>;
export type ListFunctionalitiesOutput = zod.infer<typeof ListFunctionalitiesOutputSchema>;

export type GetFunctionalityDetailsInput = zod.infer<typeof GetFunctionalityDetailsInputSchema>;
export type GetFunctionalityDetailsOutput = zod.infer<typeof GetFunctionalityDetailsOutputSchema>;

export type ExecuteFunctionalityInput = zod.infer<typeof ExecuteFunctionalityInputSchema>;
export type ExecuteFunctionalityOutput = zod.infer<typeof ExecuteFunctionalityOutputSchema>;

export type DocSearchInput = zod.infer<typeof DocSearchInputSchema>;
export type DownloadODataServiceMetadataInput = zod.infer<typeof DownloadODataServiceMetadataInputSchema>;
export type DownloadODataServiceMetadataOutput = zod.infer<typeof FetchServiceMetadataOutputSchema>;
export type GenerateAppOutput = zod.infer<typeof GenerateAppOutputSchema>;
export type ListSapSystemsOutput = zod.infer<typeof ListSapSystemsOutputSchema>;

/**
 * Interface for functionality handlers
 */
export interface FunctionalityHandlers {
    /** Handler for getting functionality details */
    getFunctionalityDetails: (params: GetFunctionalityDetailsInput) => Promise<GetFunctionalityDetailsOutput>;
    /** Handler for executing functionality */
    executeFunctionality: (params: ExecuteFunctionalityInput) => Promise<ExecuteFunctionalityOutput>;
}

/**
 * Interface representing application details
 */
export interface Appdetails {
    /** Root path of the application */
    root: string;
    /** ID of the application */
    appId: string;
    /** Access details for the application */
    applicationAccess?: ApplicationAccess;
}
