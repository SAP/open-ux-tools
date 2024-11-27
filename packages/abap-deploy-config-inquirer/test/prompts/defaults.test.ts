import {
    defaultPackage,
    defaultPackageChoice,
    defaultTargetSystem,
    defaultUrl,
    defaultTransportRequestChoice
} from '../../src/prompts/defaults';
import { getAbapSystemChoices } from '../../src/prompts/helpers';
import { mockTargetSystems } from '../fixtures/targets';
import { PromptState, PackageInputChoices, TransportChoices, TransportConfig } from '@sap-ux/deploy-config-generator-shared';
import { TargetSystemType } from '../../src/types';

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

    it('should return default url', () => {
        PromptState.abapDeployConfig.url = 'https://mock.url.target1.com';
        let url = defaultUrl(TargetSystemType.Url);
        expect(url).toBe('');

        url = defaultUrl('');
        expect(url).toBe('https://mock.url.target1.com');

        PromptState.abapDeployConfig.url = undefined;
        url = defaultUrl('');
        expect(url).toBe('');
    });

    it('should return default package choice', () => {
        expect(defaultPackageChoice(PackageInputChoices.ListExistingChoice)).toBe(
            PackageInputChoices.ListExistingChoice
        );
        expect(defaultPackageChoice()).toBe(PackageInputChoices.EnterManualChoice);
    });

    it('should return default package', () => {
        PromptState.abapDeployConfig.scp = true;

        let defaultPkg = defaultPackage('PKGDEFAULT');
        expect(defaultPkg).toBe('PKGDEFAULT');

        defaultPkg = defaultPackage();
        expect(defaultPkg).toBe('');

        PromptState.abapDeployConfig.scp = false;
        PromptState.transportAnswers.transportConfig = {
            getOperationsType: jest.fn().mockReturnValue('P')
        } as unknown as TransportConfig;

        defaultPkg = defaultPackage();
        expect(defaultPkg).toBe('$TMP');
    });

    it('should return default transport request choice', () => {
        let defaultTrChoice = defaultTransportRequestChoice(TransportChoices.EnterManualChoice);
        expect(defaultTrChoice).toBe(TransportChoices.EnterManualChoice);

        defaultTrChoice = defaultTransportRequestChoice(undefined, true);
        expect(defaultTrChoice).toBe(TransportChoices.CreateDuringDeployChoice);
    });
});
