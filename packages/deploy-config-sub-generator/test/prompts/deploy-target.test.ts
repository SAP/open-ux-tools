import { jest } from '@jest/globals';
import type { Question } from 'inquirer';

const mockHasbinSync = jest.fn().mockReturnValue(true);

jest.unstable_mockModule('hasbin', () => ({
    default: { sync: mockHasbinSync },
    sync: mockHasbinSync
}));

const { getDeployTargetQuestion } = await import('../../src/prompts/deploy-target');
const { abapChoice, cfChoice } = await import('../../src/utils/constants');

describe('deploy-target', () => {
    it('should return the deployment target question', () => {
        const deployTargetQuestion = (
            getDeployTargetQuestion([abapChoice, cfChoice], 'path/to/project') as Question[]
        )[0];
        if (deployTargetQuestion) {
            expect(deployTargetQuestion.default()).toEqual(abapChoice.name);
            expect((deployTargetQuestion.validate as Function)(cfChoice.name)).toEqual(true);
        }
    });
});
