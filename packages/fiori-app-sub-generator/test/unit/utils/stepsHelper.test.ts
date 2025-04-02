import {
    updateDependentStep,
    getYeomanUiStepConfig,
    hasStep,
    hasActiveStep,
    validateNextStep
} from '../../../src/utils/stepsHelper';
import { initI18nFioriAppSubGenerator, t } from '../../../src/utils/i18n';
import {
    FIORI_STEPS,
    STEP_FLOORPLAN,
    STEP_DATASOURCE_AND_SERVICE,
    STEP_ENTITY,
    STEP_PROJECT_ATTRIBUTES,
    STEP_DEPLOY_CONFIG,
    STEP_FLP_CONFIG
} from '../../../src/types/constants';
import { Prompts as YeomanUiSteps } from '@sap-devx/yeoman-ui-types';
import type { YeomanUiStepConfig } from '../../../src/types';

describe('utils/stepsHelper.ts', () => {
    beforeAll(async () => {
        // load texts
        await initI18nFioriAppSubGenerator();
    });

    const steps = [
        { name: t('LABEL_FLOORPLAN_SELECTION'), description: t('LABEL_CHOOSE_FLOORPLAN') },
        { name: t('DATASOURCE_AND_SERVICE_SELECTION'), description: t('CONFIGURE_DATASOURCE_AND_SERVICE') },
        { name: t('SERVICE_ENTITY_SELECTION'), description: t('LABEL_CONFIGURE_FLOORPLAN_SERVICE') },
        { name: t('PROJECT_ATTRIBUTES'), description: t('CONFIGURE_MAIN_PROJECT_ATTRIBUTES') },
        { name: t('DEPLOYMENT_CONFIG'), description: t('CONFIGURE_DEPLOYMENT'), dependency: t('PROJECT_ATTRIBUTES') }
    ];

    it('getYeomanUiStepConfig returns the expected config', () => {
        const stepConfig = getYeomanUiStepConfig(steps);
        expect(stepConfig).toMatchInlineSnapshot(`
            {
              "activeSteps": Prompts {
                "items": [
                  {
                    "description": "Choose your application template.",
                    "name": "Template Selection",
                  },
                  {
                    "description": "Configure the data source and select a service.",
                    "name": "Data Source and Service Selection",
                  },
                  {
                    "description": "Configure the selected service.",
                    "name": "Entity Selection",
                  },
                  {
                    "description": "Configure the main project attributes.",
                    "name": "Project Attributes",
                  },
                ],
              },
              "dependentMap": {
                "Project Attributes": [
                  {
                    "dependency": "Project Attributes",
                    "description": "Configure deployment settings",
                    "name": "Deployment Configuration",
                  },
                ],
              },
            }
        `);
    });

    it('updateDependentStep updates the step config as expected', () => {
        const output = getYeomanUiStepConfig(steps);
        // Add dependent step if it is not in activeSteps.
        updateDependentStep(t('PROJECT_ATTRIBUTES'), [output], true);
        expect(output.activeSteps.size()).toEqual(5);
        // If dependent step exists, do not add again.
        updateDependentStep(t('PROJECT_ATTRIBUTES'), [output], true);
        expect(output.activeSteps.size()).toEqual(5);
        expect((output.activeSteps as any).items[4].name).toEqual(steps[4].name);

        updateDependentStep(t('PROJECT_ATTRIBUTES'), [output], true, t('DEPLOYMENT_CONFIG'));
        expect(output.activeSteps.size()).toEqual(5);

        expect(hasActiveStep(t('DEPLOYMENT_CONFIG'), output.activeSteps)).toBe(true);
        expect(hasActiveStep(t('FLP_CONFIG'), output.activeSteps)).toBe(false);

        // Remove dependent step if it exists.
        updateDependentStep(t('PROJECT_ATTRIBUTES'), [output], false);
        expect(output.activeSteps.size()).toEqual(4);
        // If dependent step has been removed, no changes.
        updateDependentStep(t('PROJECT_ATTRIBUTES'), [output], false);
        expect(output.activeSteps.size()).toEqual(4);

        [
            STEP_FLOORPLAN,
            STEP_DATASOURCE_AND_SERVICE,
            STEP_ENTITY,
            STEP_PROJECT_ATTRIBUTES,
            STEP_DEPLOY_CONFIG,
            STEP_FLP_CONFIG
        ].forEach((step) => {
            expect(hasStep(FIORI_STEPS, step)).toBe(true);
        });

        expect(hasStep(FIORI_STEPS, 'TEST')).toBe(false);
    });

    it('getYeomanUiStepConfig - invalid step configuration', () => {
        const invalidConfigMissingDependantStep = [
            {
                name: t('DEPLOYMENT_CONFIG'),
                description: t('CONFIGURE_DEPLOYMENT'),
                dependency: t('PROJECT_ATTRIBUTES')
            }
        ];

        try {
            getYeomanUiStepConfig(invalidConfigMissingDependantStep);
        } catch (error) {
            expect(error).toEqual(t('INVALID_YEOMAN_UI_STEP_CONFIG'));
        }
    });

    it('Tests for validateNextStep', async () => {
        let result = validateNextStep(true, 'currentStepName', undefined);
        expect(result).toEqual(true);

        const appGenStepConfig: YeomanUiStepConfig = {
            activeSteps: new YeomanUiSteps([
                { name: t('LABEL_FLOORPLAN_SELECTION'), description: t('LABEL_CHOOSE_FLOORPLAN') },
                { name: t('DATASOURCE_AND_SERVICE_SELECTION'), description: t('CONFIGURE_DATASOURCE_AND_SERVICE') },
                { name: t('SERVICE_ENTITY_SELECTION'), description: t('LABEL_CONFIGURE_FLOORPLAN_SERVICE') },
                { name: t('PROJECT_ATTRIBUTES'), description: t('CONFIGURE_MAIN_PROJECT_ATTRIBUTES') }
            ]),
            dependentMap: {
                [t('PROJECT_ATTRIBUTES')]: [{ name: t('DEPLOYMENT_CONFIG'), description: t('CONFIGURE_DEPLOYMENT') }]
            }
        };
        result = validateNextStep(true, t('PROJECT_ATTRIBUTES'), [appGenStepConfig]);
        expect(result).toEqual(true);
    });
});
