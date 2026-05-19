import { destinationQuestionDefaultOption, getCFChoices } from '../../src/app/utils.js';
import {
    DESTINATION_CHOICE_DIRECT_SERVICE_BINDING,
    DESTINATION_CHOICE_NONE,
    DEFAULT_MTA_DESTINATION
} from '../../src/utils/index.js';
import { MtaConfig } from '@sap-ux/cf-deploy-config-writer';
import { isAppStudio } from '@sap-ux/btp-utils';

jest.mock('@sap-ux/cf-deploy-config-writer', () => ({
    ...jest.requireActual('@sap-ux/cf-deploy-config-writer'),
    MtaConfig: {
        newInstance: jest.fn()
    }
}));

jest.mock('@sap-ux/project-access', () => ({
    ...jest.requireActual('@sap-ux/project-access'),
    getMtaPath: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn().mockReturnValue(false)
}));

const mockNewInstance = MtaConfig.newInstance as jest.Mock;
const mockIsAppStudio = isAppStudio as jest.Mock;

describe('test utils', () => {
    it('should return correct default destination', () => {
        let defaultDestination = destinationQuestionDefaultOption(true, true, 'test');
        expect(defaultDestination).toBe('test');

        defaultDestination = destinationQuestionDefaultOption(false, true, 'test');
        expect(defaultDestination).toBe('test');

        defaultDestination = destinationQuestionDefaultOption(false, false, 'test');
        expect(defaultDestination).toBe('test');

        defaultDestination = destinationQuestionDefaultOption(true, true);
        expect(defaultDestination).toBe(DESTINATION_CHOICE_DIRECT_SERVICE_BINDING);

        defaultDestination = destinationQuestionDefaultOption(false, true);
        expect(defaultDestination).toBe(DESTINATION_CHOICE_NONE);

        defaultDestination = destinationQuestionDefaultOption(false, false);
        expect(defaultDestination).toBe('');
    });

    describe('getCFChoices - CAP project', () => {
        beforeEach(() => {
            jest.clearAllMocks();
            mockIsAppStudio.mockReturnValue(true);
        });

        it('includes default option for CAP project when destination resource exists', async () => {
            mockNewInstance.mockResolvedValue({
                getExposedDestinations: jest.fn().mockReturnValue([]),
                hasResource: jest.fn().mockReturnValue(true)
            });
            const choices = await getCFChoices({
                projectRoot: '/project',
                isAbapDirectServiceBinding: false,
                isCap: true,
                cfDestination: ''
            });
            const values = choices.map((c) => c.value);
            expect(values).toContain(DEFAULT_MTA_DESTINATION);
        });

        it('excludes default option for CAP project when no destination resource', async () => {
            mockNewInstance.mockResolvedValue({
                getExposedDestinations: jest.fn().mockReturnValue([]),
                hasResource: jest.fn().mockReturnValue(false)
            });
            const choices = await getCFChoices({
                projectRoot: '/project',
                isAbapDirectServiceBinding: false,
                isCap: true,
                cfDestination: ''
            });
            const values = choices.map((c) => c.value);
            expect(values).not.toContain(DEFAULT_MTA_DESTINATION);
        });

        it('includes default option and mta destinations for CAP project when destination resource exists', async () => {
            mockNewInstance.mockResolvedValue({
                getExposedDestinations: jest.fn().mockReturnValue(['srv-api']),
                hasResource: jest.fn().mockReturnValue(true)
            });
            const choices = await getCFChoices({
                projectRoot: '/project',
                isAbapDirectServiceBinding: false,
                isCap: true,
                cfDestination: ''
            });
            const values = choices.map((c) => c.value);
            expect(values).toContain(DEFAULT_MTA_DESTINATION);
            expect(values).toContain('srv-api');
        });
    });
});
