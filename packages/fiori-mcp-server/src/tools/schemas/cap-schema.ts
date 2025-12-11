import type { PREDEFINED_GENERATOR_VALUES } from './appgen-config-schema-props';

import { z } from 'zod';
import { convertToSchema } from '../../utils';
import { entityConfig, floorplan, project, serviceCap as service } from './appgen-config-schema-props';

export const generatorConfigCAP = z.object({
    entityConfig,
    floorplan,
    project,
    service
}).describe(`The configuration that will be used for the Application UI generation.
            The configuration **MUST** be a valid JSON object corresponding to the inputSchema of the functionality.`);

// Input type for functionality parameters
export type GeneratorConfigCAP = z.infer<typeof generatorConfigCAP>;
export type GeneratorConfigCAPWithAPI = GeneratorConfigCAP & typeof PREDEFINED_GENERATOR_VALUES;

// JSON schema for functionality description
export const generatorConfigCAPJson = convertToSchema(generatorConfigCAP);
