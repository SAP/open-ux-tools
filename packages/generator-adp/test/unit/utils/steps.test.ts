import { Prompts } from '@sap-devx/yeoman-ui-types';
import type { IPrompt } from '@sap-devx/yeoman-ui-types';
import { GeneratorTypes } from '../../../src/types';

import {
    getWizardPages,
    getFlpPages,
    getDeployPage,
    updateWizardSteps,
    updateFlpWizardSteps,
    getSubGenErrorPage,
    getSubGenAuthPages,
    adpPackageName,
    flpPackageName
} from '../../../src/utils/steps';
import { initI18n, t } from '../../../src/utils/i18n';
import { WizardPageFactory, type IPage } from '@sap-ux/adp-tooling';

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
        updateWizardSteps(prompts, flpStep, { localId: 'projectAttributes', packageName: adpPackageName }, true);

        const steps = prompts['items'] as IPage[];
        expect(steps.map((s) => s.id)).toContain(flpStep.id);
    });

    it('should not add the step twice if it already exists', () => {
        const flpStep = getFlpPages(false, 'TestProject')[0];
        updateWizardSteps(prompts, flpStep, { localId: 'projectAttributes', packageName: adpPackageName }, true);
        updateWizardSteps(prompts, flpStep, { localId: 'projectAttributes', packageName: adpPackageName }, true);

        const steps = prompts['items'] as IPage[];
        const count = steps.filter((s) => s.id === flpStep.id).length;
        expect(count).toBe(1);
    });

    it('should remove an existing step', () => {
        const flpStep = getFlpPages(false, 'TestProject')[0];
        updateWizardSteps(prompts, flpStep); // Add
        updateWizardSteps(prompts, flpStep, undefined, false); // Remove

        const steps = prompts['items'] as IPage[];
        expect(steps.find((s) => s.id === flpStep.id)).toBeUndefined();
    });

    it('should move an existing step to a new position', () => {
        const deployStep = getDeployPage();
        updateWizardSteps(prompts, deployStep, { localId: 'configuration', packageName: adpPackageName }, true); // Insert after Configuration
        updateWizardSteps(prompts, deployStep, { localId: 'projectAttributes', packageName: adpPackageName }, true); // Move after Attributes

        const steps = prompts['items'] as IPage[];
        const names = steps.map((s) => s.name);
        expect(names.indexOf(deployStep.name)).toBeGreaterThan(names.indexOf(t('yuiNavSteps.projectAttributesName')));
    });

    it('should move an existing step from end to middle', () => {
        const deployStep = getDeployPage();
        const flpStep = getFlpPages(false, 'TestProject')[0];

        // Add FLP first → step order: Configuration, Project Attributes, FLP
        updateWizardSteps(prompts, flpStep, { localId: 'projectAttributes', packageName: adpPackageName }, true);

        // Add Deploy after FLP → now it's at the end
        updateWizardSteps(prompts, deployStep, { localId: 'flpConfig', packageName: flpPackageName }, true);

        // Now move Deploy to after Configuration
        updateWizardSteps(prompts, deployStep, { localId: 'configuration', packageName: adpPackageName }, true);

        const steps = prompts['items'] as IPage[];
        const names = steps.map((s) => s.name);

        const configIdx = names.indexOf(t('yuiNavSteps.configurationName'));
        const deployIdx = names.indexOf(deployStep.name);
        const flpIdx = names.indexOf(flpStep.name);

        expect(deployIdx).toBe(configIdx + 1); // Moved to right after Configuration
        expect(flpIdx).toBeGreaterThan(deployIdx); // FLP stays after Deploy
    });
});

describe('updateFlpWizardSteps', () => {
    let prompts: Prompts;

    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        prompts = new Prompts(getWizardPages());
    });

    describe('when hasBaseAppInbound is true (2 pages)', () => {
        it('should add both FLP pages when shouldAdd is true', () => {
            updateFlpWizardSteps(true, prompts, 'TestProject', true);

            const steps = prompts['items'] as IPrompt[];
            const stepNames = steps.map((s) => s.name);

            expect(stepNames).toContain(t('yuiNavSteps.tileSettingsName', { projectName: 'TestProject' }));
            expect(stepNames).toContain(t('yuiNavSteps.flpConfigName'));
        });

        it('should remove both FLP pages when shouldAdd is false', () => {
            // First add the pages
            updateFlpWizardSteps(true, prompts, 'TestProject', true);

            // Then remove them
            updateFlpWizardSteps(true, prompts, 'TestProject', false);

            const steps = prompts['items'] as IPrompt[];
            const stepNames = steps.map((s) => s.name);

            expect(stepNames).not.toContain(t('yuiNavSteps.tileSettingsName', { projectName: 'TestProject' }));
            expect(stepNames).not.toContain(t('yuiNavSteps.flpConfigName'));
        });

        it('should insert tile settings page after deploy config name', () => {
            updateWizardSteps(
                prompts,
                getDeployPage(),
                { localId: 'configuration', packageName: adpPackageName },
                true
            );
            updateFlpWizardSteps(true, prompts, 'TestProject', true);

            const steps = prompts['items'] as IPrompt[];
            const stepNames = steps.map((s) => s.name);

            const deployConfigIdx = stepNames.indexOf(t('yuiNavSteps.deployConfigName'));
            const tileSettingsIdx = stepNames.indexOf(
                t('yuiNavSteps.tileSettingsName', { projectName: 'TestProject' })
            );

            expect(tileSettingsIdx).toBe(deployConfigIdx + 1);
        });

        it('should insert FLP config page after tile settings name', () => {
            updateFlpWizardSteps(true, prompts, 'TestProject', true);

            const steps = prompts['items'] as IPrompt[];
            const stepNames = steps.map((s) => s.name);

            const tileSettingsIdx = stepNames.indexOf(
                t('yuiNavSteps.tileSettingsName', { projectName: 'TestProject' })
            );
            const flpConfigIdx = stepNames.indexOf(t('yuiNavSteps.flpConfigName'));

            expect(flpConfigIdx).toBe(tileSettingsIdx + 1);
        });

        it('should handle multiple calls correctly', () => {
            updateFlpWizardSteps(true, prompts, 'TestProject1', true);
            updateFlpWizardSteps(true, prompts, 'TestProject2', true);

            const steps = prompts['items'] as IPrompt[];
            const stepNames = steps.map((s) => s.name);

            // Should only have one instance of each page
            const tileSettingsNames = stepNames.filter(
                (name) =>
                    name === t('yuiNavSteps.tileSettingsName', { projectName: 'TestProject2' }) ||
                    name === t('yuiNavSteps.tileSettingsName', { projectName: 'TestProject1' })
            );
            const tileSettingsCount = tileSettingsNames.length;
            const flpConfigCount = stepNames.filter((name) => name === t('yuiNavSteps.flpConfigName')).length;

            expect(tileSettingsCount).toBe(1);
            expect(flpConfigCount).toBe(1);
            // The second call to updateFlpWizardSteps updates the tileSettings page title only.
            expect(tileSettingsNames[0]).toEqual(t('yuiNavSteps.tileSettingsName', { projectName: 'TestProject2' }));
        });
    });

    describe('when hasBaseAppInbound is false (1 page)', () => {
        it('should add only FLP config page when shouldAdd is true', () => {
            updateFlpWizardSteps(false, prompts, 'TestProject', true);

            const steps = prompts['items'] as IPrompt[];
            const stepNames = steps.map((s) => s.name);

            expect(stepNames).not.toContain(t('yuiNavSteps.tileSettingsName', { projectName: 'TestProject' }));
            expect(stepNames).toContain(t('yuiNavSteps.flpConfigName'));
        });

        it('should remove FLP config page when shouldAdd is false', () => {
            // First add the page
            updateFlpWizardSteps(false, prompts, 'TestProject', true);

            // Then remove it
            updateFlpWizardSteps(false, prompts, 'TestProject', false);

            const steps = prompts['items'] as IPrompt[];
            const stepNames = steps.map((s) => s.name);

            expect(stepNames).not.toContain(t('yuiNavSteps.flpConfigName'));
        });

        it('should insert FLP config page after deploy config name', () => {
            updateWizardSteps(
                prompts,
                getDeployPage(),
                { localId: 'configuration', packageName: adpPackageName },
                true
            );
            updateFlpWizardSteps(false, prompts, 'TestProject', true);

            const steps = prompts['items'] as IPrompt[];
            const stepNames = steps.map((s) => s.name);

            const deployConfigIdx = stepNames.indexOf(t('yuiNavSteps.deployConfigName'));
            const flpConfigIdx = stepNames.indexOf(t('yuiNavSteps.flpConfigName'));

            expect(flpConfigIdx).toBe(deployConfigIdx + 1);
        });

        it('should handle multiple calls correctly', () => {
            updateFlpWizardSteps(false, prompts, 'TestProject', true);
            updateFlpWizardSteps(false, prompts, 'TestProject', true);

            const steps = prompts['items'] as IPrompt[];
            const stepNames = steps.map((s) => s.name);

            // Should only have one instance of the page
            const flpConfigCount = stepNames.filter((name) => name === t('yuiNavSteps.flpConfigName')).length;

            expect(flpConfigCount).toBe(1);
        });
    });

    describe('project name handling', () => {
        it('should use the provided project name in tile settings page', () => {
            updateFlpWizardSteps(true, prompts, 'MyCustomProject', true);

            const steps = prompts['items'] as IPrompt[];
            const stepNames = steps.map((s) => s.name);

            expect(stepNames).toContain(t('yuiNavSteps.tileSettingsName', { projectName: 'MyCustomProject' }));
        });

        it('should handle empty project name', () => {
            updateFlpWizardSteps(true, prompts, '', true);

            const steps = prompts['items'] as IPrompt[];
            const stepNames = steps.map((s) => s.name);

            expect(stepNames).toContain(t('yuiNavSteps.tileSettingsName', { projectName: '' }));
        });
    });

    describe('integration with existing wizard steps', () => {
        it('should preserve existing wizard steps when adding FLP pages', () => {
            const initialSteps = prompts['items'] as IPrompt[];
            const initialStepNames = initialSteps.map((s) => s.name);

            updateFlpWizardSteps(true, prompts, 'TestProject', true);

            const finalSteps = prompts['items'] as IPrompt[];
            const finalStepNames = finalSteps.map((s) => s.name);

            // All initial steps should still be present
            initialStepNames.forEach((stepName) => {
                expect(finalStepNames).toContain(stepName);
            });
        });

        it('should maintain correct order of all steps', () => {
            updateFlpWizardSteps(true, prompts, 'TestProject', true);

            const steps = prompts['items'] as IPrompt[];
            const stepNames = steps.map((s) => s.name);

            const configIdx = stepNames.indexOf(t('yuiNavSteps.configurationName'));
            const attributesIdx = stepNames.indexOf(t('yuiNavSteps.projectAttributesName'));
            const tileSettingsIdx = stepNames.indexOf(
                t('yuiNavSteps.tileSettingsName', { projectName: 'TestProject' })
            );
            const flpConfigIdx = stepNames.indexOf(t('yuiNavSteps.flpConfigName'));

            // Verify order: Configuration -> Project Attributes -> Tile Settings -> FLP Config
            expect(attributesIdx).toBeGreaterThan(configIdx);
            expect(tileSettingsIdx).toBeGreaterThan(attributesIdx);
            expect(flpConfigIdx).toBeGreaterThan(tileSettingsIdx);
        });
    });
});

describe('getSubGenErrorPage', () => {
    beforeEach(() => {
        jest.spyOn(WizardPageFactory, 'getPageId').mockImplementation((_: string, localId: string) => localId);
    });

    it('should return error page for ADD_ANNOTATIONS_TO_DATA', () => {
        const result = getSubGenErrorPage(GeneratorTypes.ADD_ANNOTATIONS_TO_DATA);

        expect(result).toEqual([{ id: 'addLocalAnnotationFile', name: 'Add Local Annotation File', description: '' }]);
    });

    it('should return error page for CHANGE_DATA_SOURCE', () => {
        const result = getSubGenErrorPage(GeneratorTypes.CHANGE_DATA_SOURCE);

        expect(result).toEqual([{ id: 'replaceODataService', name: 'Replace OData Service', description: '' }]);
    });

    it('should return empty array for ADD_COMPONENT_USAGES', () => {
        const result = getSubGenErrorPage(GeneratorTypes.ADD_COMPONENT_USAGES);

        expect(result).toEqual([]);
    });

    it('should return empty array for unknown generator type', () => {
        const result = getSubGenErrorPage('UNKNOWN_TYPE' as GeneratorTypes);

        expect(result).toEqual([]);
    });
});

describe('getSubGenAuthPages', () => {
    const system = 'SYS_010';

    beforeEach(() => {
        jest.spyOn(WizardPageFactory, 'getPageId').mockImplementation((_: string, localId: string) => localId);
    });

    it('should return auth pages for ADD_ANNOTATIONS_TO_DATA', () => {
        const result = getSubGenAuthPages(GeneratorTypes.ADD_ANNOTATIONS_TO_DATA, system);

        expect(result).toEqual([
            {
                id: 'addLocalAnnotationFile',
                name: 'Add Local Annotation File - Credentials',
                description: `Enter credentials for your adaptation project's system (${system})`
            },
            {
                id: 'addLocalAnnotationFile',
                name: 'Add Local Annotation File',
                description: t('yuiNavSteps.addLocalAnnotationFileDescr')
            }
        ]);
    });

    it('should return auth pages for CHANGE_DATA_SOURCE', () => {
        const result = getSubGenAuthPages(GeneratorTypes.CHANGE_DATA_SOURCE, system);

        expect(result).toEqual([
            {
                id: 'replaceODataService',
                name: 'Replace OData Service - Credentials',
                description: `Enter credentials for your adaptation project's system (${system})`
            },
            {
                id: 'replaceODataService',
                name: 'Replace OData Service',
                description: t('yuiNavSteps.replaceODataServiceDescr')
            }
        ]);
    });

    it('should return empty array for ADD_COMPONENT_USAGES', () => {
        const result = getSubGenAuthPages(GeneratorTypes.ADD_COMPONENT_USAGES, system);

        expect(result).toEqual([]);
    });
});
