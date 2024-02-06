const PuppeteerEnvironment = require('../../src/jest-puppeteer-environment');
import chalk from 'chalk';
import fs from 'fs';
import puppeteer from 'puppeteer-core';
import NodeEnvironment from 'jest-environment-node';

jest.mock('chalk', () => ({
    yellow: jest.fn()
}));

describe('PuppeteerEnvironment', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    const chalkSpy = jest.spyOn(chalk, 'yellow');

    const puppeteerEnv = new PuppeteerEnvironment(
        {
            globalConfig: {},
            projectConfig: {
                testEnvironmentOptions: {
                    customExportConditions: []
                }
            }
        },
        {}
    );
    describe('setup()', () => {
        let readFileSyncSpy: jest.SpyInstance;

        beforeEach(() => {
            readFileSyncSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue('wsEndpoint');
            jest.spyOn(puppeteer, 'connect').mockReturnValue('chrome');
        });

        it('should setup environment', async () => {
            await expect(puppeteerEnv.setup()).resolves.not.toThrow();

            expect(chalkSpy).toHaveBeenCalledWith('Setup Test Environment.');
            expect(readFileSyncSpy).toHaveBeenCalled();
        });

        it('should throw error if WebSocket endpoint not found', async () => {
            jest.spyOn(fs, 'readFileSync').mockReturnValue('');
            await expect(puppeteerEnv.setup()).rejects.toThrow('wsEndpoint not found');
        });
    });

    describe('teardown()', () => {
        it('should print teardown message and call parent teardown method', async () => {
            const teardownSpy = jest.spyOn(NodeEnvironment.prototype, 'teardown');
            await puppeteerEnv.teardown();
            expect(chalkSpy).toHaveBeenCalledWith('Teardown Test Environment.');
            expect(teardownSpy).toHaveBeenCalled();
        });
    });

    describe('getVmContext()', () => {
        it('should call parent getVmContext method', () => {
            const getVmContextSpy = jest.spyOn(NodeEnvironment.prototype, 'getVmContext');
            puppeteerEnv.getVmContext();
            expect(getVmContextSpy).toHaveBeenCalled();
        });
    });
});
