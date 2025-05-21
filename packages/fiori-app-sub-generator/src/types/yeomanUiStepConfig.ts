import type { Prompts as YeomanUiSteps, IPrompt as YeomanUiStep } from '@sap-devx/yeoman-ui-types';

export interface YeomanUiStepConfig {
    activeSteps: YeomanUiSteps;
    dependentMap: { [key: string]: YeomanUiStep[] };
}
// A step in the Fiori specific app wizard
export interface FioriStep extends YeomanUiStep {
    key: string;
    order: number;
    dependency?: string;
}
