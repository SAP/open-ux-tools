import { Prompts } from '@sap-devx/yeoman-ui-types';
import type { IPrompt } from '@sap-devx/yeoman-ui-types';

import { getWizardPages, getFlpPages, getDeployPage, updateWizardSteps } from '../../../src/utils/steps';
import { initI18n, t } from '../../../src/utils/i18n';

describe('Wizard Steps Utility', () => {
    let prompts: Prompts;

    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        prompts = new Prompts(getWizardPages());
    });

    it('should add a new step when it does not exist', () => {
        const flpStep = getFlpPages(false, 'TestProject')[0];
        updateWizardSteps(prompts, flpStep, t('yuiNavSteps.projectAttributesName'), true);

        const steps = (prompts as any).items as IPrompt[];
        expect(steps.map((s) => s.name)).toContain(flpStep.name);
    });

    it('should not add the step twice if it already exists', () => {
        const flpStep = getFlpPages(false, 'TestProject')[0];
        updateWizardSteps(prompts, flpStep, t('yuiNavSteps.projectAttributesName'), true);
        updateWizardSteps(prompts, flpStep, t('yuiNavSteps.projectAttributesName'), true);

        const steps = (prompts as any).items as IPrompt[];
        const count = steps.filter((s) => s.name === flpStep.name).length;
        expect(count).toBe(1);
    });

    it('should remove an existing step', () => {
        const flpStep = getFlpPages(false, 'TestProject')[0];
        updateWizardSteps(prompts, flpStep, '', true); // Add
        updateWizardSteps(prompts, flpStep, '', false); // Remove

        const steps = (prompts as any).items as IPrompt[];
        expect(steps.find((s) => s.name === flpStep.name)).toBeUndefined();
    });

    it('should move an existing step to a new position', () => {
        const deployStep = getDeployPage();
        updateWizardSteps(prompts, deployStep, t('yuiNavSteps.configurationName'), true); // Insert after Configuration
        updateWizardSteps(prompts, deployStep, t('yuiNavSteps.projectAttributesName'), true); // Move after Attributes

        const steps = (prompts as any).items as IPrompt[];
        const names = steps.map((s) => s.name);
        expect(names.indexOf(deployStep.name)).toBeGreaterThan(names.indexOf(t('yuiNavSteps.projectAttributesName')));
    });

    it('should move an existing step from end to middle', () => {
        const deployStep = getDeployPage();
        const flpStep = getFlpPages(false, 'TestProject')[0];

        // Add FLP first → step order: Configuration, Project Attributes, FLP
        updateWizardSteps(prompts, flpStep, t('yuiNavSteps.projectAttributesName'), true);

        // Add Deploy after FLP → now it's at the end
        updateWizardSteps(prompts, deployStep, flpStep.name, true);

        // Now move Deploy to after Configuration
        updateWizardSteps(prompts, deployStep, t('yuiNavSteps.configurationName'), true);

        const steps = (prompts as any).items as IPrompt[];
        const names = steps.map((s) => s.name);

        const configIdx = names.indexOf(t('yuiNavSteps.configurationName'));
        const deployIdx = names.indexOf(deployStep.name);
        const flpIdx = names.indexOf(flpStep.name);

        expect(deployIdx).toBe(configIdx + 1); // Moved to right after Configuration
        expect(flpIdx).toBeGreaterThan(deployIdx); // FLP stays after Deploy
    });
});
