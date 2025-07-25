// When deployment generator is bundled the namespacing is relative to the root generator
import { TargetName } from '@sap-ux/deploy-config-generator-shared';
import type { Target } from '../types';

export const generatorNamespace = (bundledRootGeneratorName: string, subGenName: string): string =>
    `${bundledRootGeneratorName}_${subGenName}`;

export const generatorTitle = 'Deployment Configuration Generator';
export const abapChoice: Target = { name: TargetName.ABAP, description: 'ABAP' };
export const cfChoice: Target = { name: TargetName.CF, description: 'Cloud Foundry' };

export enum promptNames {
    targetName = 'targetName'
}
