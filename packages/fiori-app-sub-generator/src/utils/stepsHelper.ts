import type { IPrompt as YeomanUiStep } from '@sap-devx/yeoman-ui-types';
import { Prompts as YeomanUiSteps } from '@sap-devx/yeoman-ui-types';
import { t } from '../utils/i18n';
import type { FioriStep, YeomanUiStepConfig } from '../types/yeomanUiStepConfig';

/**
 *
 * @param stepName The name (title) of the step to check. Not the step key.
 * @param prompts
 * @returns
 */
function getStepIndex(stepName: string, prompts: YeomanUiSteps): number {
    const steps = (prompts as unknown as { items: YeomanUiStep[] }).items as { name: string; description: string }[];
    return steps?.findIndex((step: { name: string; description: string }) => {
        return step.name === t(stepName);
    });
}

/**
 *
 * @param currentStepName The name (title) of the step that is being toggled. Not the step key.
 * @param stepConfigList
 * @param action Add dependent step if true, remove if false.
 * @param dependentStepName
 */
export function updateDependentStep(
    currentStepName: string,
    stepConfigList: YeomanUiStepConfig[],
    action: boolean,
    dependentStepName?: string
): void {
    stepConfigList.forEach((stepConfig) => {
        const dependentSteps = stepConfig.dependentMap[currentStepName];
        const indexOfdependentSteps = [] as number[];
        dependentSteps.forEach((dependentStep) => {
            const index = getStepIndex(dependentStep.name, stepConfig.activeSteps);
            indexOfdependentSteps.push(index);
        });

        const currentStepIndex = getStepIndex(currentStepName, stepConfig.activeSteps);
        // We turn on/off all the dependent steps together, check only index 0 is sufficient
        if (!dependentStepName) {
            if (indexOfdependentSteps.length > 0 && indexOfdependentSteps[0] >= 0 && !action) {
                // If user doens't want to add deployment config, remove them from active steps.
                // For each dependent step at index i we remove, the next dependent step will be at index i.
                // So we keep removing dependent steps at indexOfdependentSteps[0].
                indexOfdependentSteps.forEach(() => {
                    stepConfig.activeSteps.splice(indexOfdependentSteps[0], 1, []);
                });
            }
            if (indexOfdependentSteps.length > 0 && indexOfdependentSteps[0] < 0 && action) {
                // If user doens't want to add deployment config, add them to active steps.
                for (let i = 0; i < indexOfdependentSteps.length; i++) {
                    const dependentStep = dependentSteps[i];
                    // If the dependency step is at index currentStepIndex, the dependent steps
                    // are added to index currentStepIndex + 1, currentStepIndex + 2, etc.
                    stepConfig.activeSteps.splice(currentStepIndex + i + 1, 0, [
                        { name: dependentStep.name, description: dependentStep.description }
                    ]);
                }
            }
        } else if (!action) {
            const dependentStepIndex = getStepIndex(dependentStepName, stepConfig.activeSteps);
            if (dependentStepIndex >= 0) {
                stepConfig.activeSteps.splice(dependentStepIndex, 1, []);
            }
        } else {
            // Count number of dependent steps that are active
            let count = 0;
            let dependentStepToAdd: YeomanUiStep | undefined;
            for (let i = 0; i < dependentSteps.length; i++) {
                const dependentStep = dependentSteps[i];
                if (dependentStep.name === dependentStepName) {
                    dependentStepToAdd = dependentStep;
                    break;
                }
                const index = getStepIndex(dependentStep.name, stepConfig.activeSteps);
                if (index >= 0) {
                    count++;
                }
            }
            if (dependentStepToAdd) {
                const index = getStepIndex(dependentStepToAdd.name, stepConfig.activeSteps);
                if (index < 0) {
                    stepConfig.activeSteps.splice(currentStepIndex + count + 1, 0, [
                        { name: dependentStepToAdd.name, description: dependentStepToAdd.description }
                    ]);
                }
            }
        }
    });
}

/**
 *
 * @param stepName The name (title) of the step to check. Not the step key.
 * @param yuiSteps
 * @returns
 */
export function hasActiveStep(stepName: string, yuiSteps: YeomanUiSteps): boolean {
    return getStepIndex(stepName, yuiSteps) > -1;
}

/**
 *
 * @param steps
 * @param stepKey
 * @returns
 */
export function hasStep(steps: FioriStep[], stepKey: string): boolean {
    return !!steps.find((step) => step.key === stepKey);
}

/**
 *
 * @param stepsArr
 * @returns
 */
export function getYeomanUiStepConfig(stepsArr: YeomanUiStep[]): YeomanUiStepConfig {
    const activeStepsArr: YeomanUiStep[] = [];
    const dependentMap: { [key: string]: YeomanUiStep[] } = {};
    stepsArr.forEach((step: YeomanUiStep, index: number) => {
        if ((step as FioriStep)['dependency']) {
            if (index - 1 < 0) {
                throw t('error.invalidYUIStepConfig');
            }
            const dependencyStepName = (step as FioriStep)['dependency'];
            if (dependencyStepName) {
                if (!dependentMap[dependencyStepName]) {
                    dependentMap[dependencyStepName] = [];
                }
                dependentMap[dependencyStepName].push(step);
            }
        } else {
            activeStepsArr.push(step);
        }
    });

    const stepConfig: YeomanUiStepConfig = {
        activeSteps: new YeomanUiSteps(activeStepsArr),
        dependentMap: dependentMap
    };

    return stepConfig;
}

/**
 *
 * @param addDependentStep
 * @param currentStepName
 * @param appGenStepConfigList
 * @param dependentStepName
 * @returns
 */
export function validateNextStep(
    addDependentStep: boolean,
    currentStepName: string,
    appGenStepConfigList?: YeomanUiStepConfig[],
    dependentStepName?: string
): boolean {
    if (appGenStepConfigList) {
        updateDependentStep(currentStepName, appGenStepConfigList, addDependentStep, dependentStepName);
    }
    return true;
}
