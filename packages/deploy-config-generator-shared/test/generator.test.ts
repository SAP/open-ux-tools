import { LogWrapper } from '@sap-ux/fiori-generator-shared';
import yeomanTest from 'yeoman-test';
import MockGenerator from './mock/mockGenerator';
import { join } from 'path';
import { t } from '../src/utils';

jest.mock('@sap-ux/fiori-generator-shared', () => ({
    ...jest.requireActual('@sap-ux/fiori-generator-shared'),
    DefaultLogger: { debug: jest.fn() }
}));

describe('DeploymentGenerator', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();
    });
    const deployGenPath = join(__dirname, '../mockGenerator');
    test('should initialize _logger with DefaultLogger if no logWrapper is provided', () => {
        const logWrapperSpy = jest.spyOn(LogWrapper, 'logAtLevel');
        const mockGen = yeomanTest.create(
            MockGenerator,
            {
                resolved: deployGenPath
            },
            {}
        );
        mockGen.run().catch((e) => {
            console.error(e);
        });
        expect(logWrapperSpy).toHaveBeenCalledWith('debug', t('debug.loggerInitialised'));
    });

    test('should initialize _logger with provided logWrapper in options', () => {
        const testLogWrapper = new LogWrapper('test');
        const logDebugSpy = jest.spyOn(testLogWrapper, 'debug');
        const mockGen = yeomanTest
            .create(
                MockGenerator,
                {
                    resolved: deployGenPath
                },
                {}
            )
            .withOptions({ logWrapper: testLogWrapper });
        mockGen.run().catch((e) => {
            console.error(e);
        });
        expect(logDebugSpy).toHaveBeenCalledWith(t('debug.loggerInitialised'));
    });
});
