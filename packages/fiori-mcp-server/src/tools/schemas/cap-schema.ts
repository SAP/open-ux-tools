import { z } from 'zod';
import { convertToSchema } from '../utils';
import {
    entityConfig,
    floorplan,
    project,
    projectType,
    serviceCap as service,
    telemetryData,
    version
} from './appgen-config-schema-props';

export const generatorConfigCAP = z.object({
    entityConfig,
    floorplan,
    project,
    projectType,
    service,
    telemetryData,
    version
}).describe(`The configuration that will be used for the Application UI generation.
            The configuration **MUST** be a valid JSON object corresponding to the inputSchema of the functionality.`);

// Input type for functionality parameters
export type GeneratorConfigCAP = z.infer<typeof generatorConfigCAP>;

// JSON schema for functionality description
export const generatorConfigCAPJson = convertToSchema(generatorConfigCAP);
