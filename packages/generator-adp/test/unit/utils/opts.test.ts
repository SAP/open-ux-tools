import { readFileSync } from 'node:fs';
import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import type { ToolsLogger } from '@sap-ux/logger';

import { setHeaderTitle } from '../../../src/utils/opts';

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    readFileSync: jest.fn()
}));

const readFileSyncMock = readFileSync as jest.Mock;

const mockPackage = { name: '@sap-ux/generator-adp', version: '0.0.1', displayName: 'SAPUI5 Adaptation Project' };

describe('setHeaderTitle', () => {
    const logger = { error: jest.fn() } as unknown as ToolsLogger;

    beforeEach(() => {
        jest.clearAllMocks();

        readFileSyncMock.mockReturnValue(JSON.stringify(mockPackage));
    });

    it('should call setHeaderTitle with displayName and version', () => {
        const appWizard = { setHeaderTitle: jest.fn() } as unknown as AppWizard;

        setHeaderTitle({ appWizard }, logger);

        expect(appWizard.setHeaderTitle).toHaveBeenCalledWith(mockPackage.displayName, '@sap-ux/generator-adp@0.0.1');
    });

    it('should not throw if appWizard or setHeaderTitle is missing', () => {
        expect(() => setHeaderTitle({}, logger)).not.toThrow();
        expect(logger.error).not.toHaveBeenCalled();
    });

    it('should log an error if something throws inside the try block', () => {
        const appWizard = {
            setHeaderTitle: jest.fn(() => {
                throw new Error('Failed');
            })
        } as unknown as AppWizard;

        setHeaderTitle({ appWizard }, logger);

        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining("An error occurred while trying to set '@sap-ux/generator-adp' header: Failed")
        );
    });
});
