import * as z from 'zod';
import type { ApplicationAccess } from '@sap-ux/project-access';
import { FioriAppSchema, FunctionalityIdSchema, FunctionalitySchema, ParameterSchema } from './basic';
import {
    ExecuteFunctionalityInputSchema,
    GetFunctionalityDetailsInputSchema,
    ListFioriAppsInputSchema,
    ListFunctionalitiesInputSchema
} from './input';
import {
    ExecuteFunctionalityOutputSchema,
    GetFunctionalityDetailsOutputSchema,
    ListFioriAppsOutputSchema,
    ListFunctionalitiesOutputSchema
} from './output';

export type FioriApp = z.infer<typeof FioriAppSchema>;
export type FunctionalityId = z.infer<typeof FunctionalityIdSchema>;
export type Parameter = z.infer<typeof ParameterSchema>;
export type Functionality = z.infer<typeof FunctionalitySchema>;

export type ListFioriAppsInput = z.infer<typeof ListFioriAppsInputSchema>;
export type ListFioriAppsOutput = z.infer<typeof ListFioriAppsOutputSchema>;

export type ListFunctionalitiesInput = z.infer<typeof ListFunctionalitiesInputSchema>;
export type ListFunctionalitiesOutput = z.infer<typeof ListFunctionalitiesOutputSchema>;

export type GetFunctionalityDetailsInput = z.infer<typeof GetFunctionalityDetailsInputSchema>;
export type GetFunctionalityDetailsOutput = z.infer<typeof GetFunctionalityDetailsOutputSchema>;

export type ExecuteFunctionalityInput = z.infer<typeof ExecuteFunctionalityInputSchema>;
export type ExecuteFunctionalityOutput = z.infer<typeof ExecuteFunctionalityOutputSchema>;

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
