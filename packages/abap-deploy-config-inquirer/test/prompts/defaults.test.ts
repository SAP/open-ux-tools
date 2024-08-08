import { BackendSystem } from '@sap-ux/store';
import { defaultPackage, defaultTargetSystem, defaultTransportRequestChoice } from '../../src/prompts/defaults';
import { getAbapSystemChoices } from '../../src/prompts/helpers';
import { mockTargetSystems } from '../fixtures/targets';
import { PromptState } from '../../src/prompts/prompt-state';
import { TransportChoices, TransportConfig } from '../../src/types';

describe('defaults', () => {
    beforeEach(() => {
        PromptState.resetAbapDeployConfig();
    });

    it('should return default target system', async () => {
        const abapSystemChoices = await getAbapSystemChoices(
            undefined,
            {
                systemName: 'mockDefaultTarget',
                abapTarget: mockTargetSystems[0]
            },
            mockTargetSystems
        );

        const defaultTarget = defaultTargetSystem(abapSystemChoices);
        expect(defaultTarget).toBe('https://mock.url.target1.com');
    });

    it('should return default package', () => {
        PromptState.abapDeployConfig.scp = true;

        let defaultPkg = defaultPackage(
            {},
            {
                packageManual: 'PKGDEFAULT'
            }
        );
        expect(defaultPkg).toBe('PKGDEFAULT');

        defaultPkg = defaultPackage({ existingDeployTaskConfig: { package: 'EXISTING_PKG' } }, {});
        expect(defaultPkg).toBe('EXISTING_PKG');

        defaultPkg = defaultPackage({}, {});
        expect(defaultPkg).toBe('');

        PromptState.abapDeployConfig.scp = false;
        PromptState.transportAnswers.transportConfig = {
            getOperationsType: jest.fn().mockReturnValue('P')
        } as unknown as TransportConfig;

        defaultPkg = defaultPackage({}, {});
        expect(defaultPkg).toBe('$tmp');
    });

    it('should return default transport request choice', () => {
        let defaultTrChoice = defaultTransportRequestChoice(TransportChoices.EnterManualChoice);
        expect(defaultTrChoice).toBe(TransportChoices.EnterManualChoice);

        defaultTrChoice = defaultTransportRequestChoice(undefined, true);
        expect(defaultTrChoice).toBe(TransportChoices.CreateDuringDeployChoice);
    });
});
