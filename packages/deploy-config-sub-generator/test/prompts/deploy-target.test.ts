import { ListQuestion, Question } from 'inquirer';
import { getDeployTargetPrompts, getDeployTargetQuestion } from '../../src/prompts/deploy-target';
import { abapChoice, cfChoice } from '../../src/utils/constants';

jest.mock('hasbin', () => ({
    sync: jest.fn().mockReturnValue(true)
}));

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

    it('should wrap the target deployment prompts in the config update prompt', () => {
        const configUpdatePrompts = [
            {
                type: 'confirm',
                name: 'confirmConfigUpdate'
            }
        ];
        const deployTargetPrompts = getDeployTargetPrompts(
            [abapChoice, cfChoice],
            configUpdatePrompts,
            'path/to/project'
        );
        expect(deployTargetPrompts).toHaveLength(2);
    });
});
