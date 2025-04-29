import type { SystemLookup } from '@sap-ux/adp-tooling';
import { validateNamespaceAdp, validateProjectName } from '@sap-ux/project-input-validator';
import { validateAdpJsonInput } from '../../../../src/app/questions/helper/validators';
import { t } from '../../../../src/utils/i18n';

jest.mock('@sap-ux/project-input-validator', () => ({
    validateProjectName: jest.fn(),
    validateNamespaceAdp: jest.fn()
}));

const validateProjectNameMock = validateProjectName as jest.Mock;
const validateNamespaceAdpMock = validateNamespaceAdp as jest.Mock;

const availableSystem = 'systemA';
const nonExistingSystem = 'systemB';

const jsonInput = {
    projectName: 'projectName',
    targetFolder: 'targetFolder',
    namespace: 'namespace',
    system: availableSystem
};

describe('validateAdpJsonInput', () => {
    let systemLookup: jest.Mocked<SystemLookup>;

    beforeEach(() => {
        systemLookup = {
            getSystemByName: jest.fn((name: string) =>
                Promise.resolve(name === availableSystem ? { Name: availableSystem } : undefined)
            )
        } as unknown as jest.Mocked<SystemLookup>;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should resolve the returned promise when all data is valid', async () => {
        validateProjectNameMock.mockReturnValue(true);
        validateNamespaceAdpMock.mockReturnValue(true);
        await expect(validateAdpJsonInput(systemLookup, true, jsonInput)).resolves.not.toThrow();
        expect(systemLookup.getSystemByName).toHaveBeenCalledWith(availableSystem);
    });

    it('should throw an error when the project name is NOT valid', async () => {
        const invalidProjectNameMessage = 'invalid project name';
        validateProjectNameMock.mockReturnValue(invalidProjectNameMessage);
        validateNamespaceAdpMock.mockReturnValue(true);
        await expect(validateAdpJsonInput(systemLookup, true, jsonInput)).rejects.toThrowError(
            invalidProjectNameMessage
        );
        expect(systemLookup.getSystemByName).not.toHaveBeenCalled();
    });

    it('should throw an error when the namespace is NOT valid', async () => {
        const invalidNamespaceMessage = 'invalid namespace';
        validateNamespaceAdpMock.mockReturnValue(invalidNamespaceMessage);
        validateProjectNameMock.mockReturnValue(true);
        await expect(validateAdpJsonInput(systemLookup, true, jsonInput)).rejects.toThrowError(invalidNamespaceMessage);
        expect(systemLookup.getSystemByName).not.toHaveBeenCalled();
    });

    it('should throw an error when the system is NOT found', async () => {
        validateNamespaceAdpMock.mockReturnValue(true);
        validateProjectNameMock.mockReturnValue(true);
        await expect(
            validateAdpJsonInput(systemLookup, true, { ...jsonInput, system: nonExistingSystem })
        ).rejects.toThrowError(t('error.systemNotFound', { system: nonExistingSystem }));
        expect(systemLookup.getSystemByName).toHaveBeenCalledWith(nonExistingSystem);
    });
});
