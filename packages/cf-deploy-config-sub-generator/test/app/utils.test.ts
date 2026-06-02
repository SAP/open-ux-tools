const mockIsAppStudio = jest.fn();
const mockGetMtaPath = jest.fn().mockResolvedValue(undefined);
const mockNewInstance = jest.fn();

const realBtpUtils = await import('@sap-ux/btp-utils');
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...realBtpUtils,
    isAppStudio: () => mockIsAppStudio()
}));

const realProjectAccess = await import('@sap-ux/project-access');
jest.unstable_mockModule('@sap-ux/project-access', () => ({
    ...realProjectAccess,
    getMtaPath: (...args: unknown[]) => mockGetMtaPath(...args)
}));

const realCfWriter = await import('@sap-ux/cf-deploy-config-writer');
jest.unstable_mockModule('@sap-ux/cf-deploy-config-writer', () => ({
    ...realCfWriter,
    MtaConfig: {
        ...realCfWriter.MtaConfig,
        newInstance: (...args: unknown[]) => mockNewInstance(...args)
    }
}));

const { destinationQuestionDefaultOption, getCFChoices } = await import('../../src/app/utils.js');
const { DESTINATION_CHOICE_DIRECT_SERVICE_BINDING, DESTINATION_CHOICE_NONE, DEFAULT_MTA_DESTINATION } =
    await import('../../src/utils/index.js');

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
