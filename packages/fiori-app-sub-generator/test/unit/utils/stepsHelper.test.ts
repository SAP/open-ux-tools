import { Prompts as YeomanUiSteps } from '@sap-devx/yeoman-ui-types';
import type { YeomanUiStepConfig } from '../../../src/types';
import {
    FIORI_STEPS,
    STEP_DATASOURCE_AND_SERVICE,
    STEP_DEPLOY_CONFIG,
    STEP_ENTITY,
    STEP_FLOORPLAN,
    STEP_FLP_CONFIG,
    STEP_PROJECT_ATTRIBUTES
} from '../../../src/types/constants';
import { initI18nFioriAppSubGenerator, t } from '../../../src/utils/i18n';
import {
    getYeomanUiStepConfig,
    hasActiveStep,
    hasStep,
    updateDependentStep,
    validateNextStep
} from '../../../src/utils/stepsHelper';

describe('utils/stepsHelper.ts', () => {
    beforeAll(async () => {
        // load texts
        await initI18nFioriAppSubGenerator();
    });

    const steps = [
        { name: t('steps.templateSelection.title'), description: t('steps.templateSelection.description') },
        {
            name: t('steps.datasourceAndServiceSelection.title'),
            description: t('steps.datasourceAndServiceSelection.description')
        },
        { name: t('steps.entityOrViewConfig.title'), description: t('steps.entityOrViewConfig.description') },
        { name: t('steps.projectAttributesConfig.title'), description: t('steps.projectAttributesConfig.description') },
        {
            name: t('steps.deployConfig.title'),
            description: t('steps.deployConfig.description'),
            dependency: t('steps.projectAttributesConfig.title')
        }
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
                    "description": "Configure deployment settings.",
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
        updateDependentStep(t('steps.projectAttributesConfig.title'), [output], true);
        expect(output.activeSteps.size()).toEqual(5);
        // If dependent step exists, do not add again.
        updateDependentStep(t('steps.projectAttributesConfig.title'), [output], true);
        expect(output.activeSteps.size()).toEqual(5);
        expect((output.activeSteps as any).items[4].name).toEqual(steps[4].name);

        updateDependentStep(t('steps.projectAttributesConfig.title'), [output], true, t('steps.deployConfig.title'));
        expect(output.activeSteps.size()).toEqual(5);

        expect(hasActiveStep(t('steps.deployConfig.title'), output.activeSteps)).toBe(true);
        expect(hasActiveStep(t('steps.flpConfig.title'), output.activeSteps)).toBe(false);

        // Remove dependent step if it exists.
        updateDependentStep(t('steps.projectAttributesConfig.title'), [output], false);
        expect(output.activeSteps.size()).toEqual(4);
        // If dependent step has been removed, no changes.
        updateDependentStep(t('steps.projectAttributesConfig.title'), [output], false);
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
                name: t('steps.deployConfig.title'),
                description: t('steps.deployConfig.description'),
                dependency: t('steps.projectAttributesConfig.title')
            }
        ];

        try {
            getYeomanUiStepConfig(invalidConfigMissingDependantStep);
        } catch (error) {
            expect(error).toEqual(t('error.invalidYUIStepConfig'));
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
                {
                    name: t('steps.projectAttributesConfig.title'),
                    description: t('steps.projectAttributesConfig.description')
                }
            ]),
            dependentMap: {
                [t('steps.projectAttributesConfig.title')]: [
                    { name: t('steps.deployConfig.title'), description: t('steps.deployConfig.description') }
                ]
            }
        };
        result = validateNextStep(true, t('steps.projectAttributesConfig.title'), [appGenStepConfig]);
        expect(result).toEqual(true);
    });
});
