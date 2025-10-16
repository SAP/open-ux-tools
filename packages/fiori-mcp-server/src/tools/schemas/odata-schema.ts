import { z } from 'zod';
import { convertToSchema } from '../utils';
import {
    entityConfig,
    floorplan,
    project,
    projectType,
    serviceOdata as service,
    telemetryData,
    version
} from './appgen-config-schema-props';

export const generatorConfigOData = z.object({
    version,
    floorplan,
    projectType,
    project,
    service,
    entityConfig,
    telemetryData
}).describe(`The configuration that will be used for the Application UI generation.
            The configuration **MUST** be a valid JSON object corresponding to the inputSchema of the functionality.
            The configuration **MUST** be based on the project files in the projectPath (if a project exists).`);

// Input type for functionality parameters
export type GeneratorConfigOData = z.infer<typeof generatorConfigOData>;

// JSON schema for functionality description
export const generatorConfigODataJson = convertToSchema(generatorConfigOData);
