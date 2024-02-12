import chalk from 'chalk';
import NodeEnvironment from 'jest-environment-node';
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import os from 'os';
import { join } from 'path';
import type { Context } from 'vm';

const DIR = join(os.tmpdir(), 'jest_puppeteer_global_setup');

/**
 * PuppeteerEnvironment class extends NodeEnvironment and provides setup and teardown methods
 * for Puppeteer integration in Jest tests.
 *
 * @extends NodeEnvironment
 */
export class PuppeteerEnvironment extends NodeEnvironment {
    /**
     * Creates an instance of PuppeteerEnvironment.
     *
     * @param options options object containing globalConfig and projectConfig
     * @param options.globalConfig global configuration
     * @param options.projectConfig project configuration
     * @param context the context object
     */
    constructor({ globalConfig, projectConfig }, context) {
        super({ globalConfig, projectConfig }, context);
    }

    /**
     * Setup method to prepare the test environment.
     * It reads the WebSocket endpoint from the temporary directory and establishes a connection
     * to the Puppeteer browser instance.
     *
     * @returns a promise that resolves when setup is complete
     * @throws if wsEndpoint file is not found
     */
    async setup() {
        console.log(chalk.yellow('Setup Test Environment.'));
        await super.setup();

        const wsEndpoint = fs.readFileSync(join(DIR, 'wsEndpoint'), 'utf8');
        if (!wsEndpoint) {
            throw new Error('wsEndpoint not found');
        }

        this.global.__BROWSER__ = await puppeteer.connect({
            browserWSEndpoint: wsEndpoint
        });
    }

    /**
     * Teardown method to clean up the test environment.
     *
     * @returns a promise that resolves when teardown is complete
     */
    async teardown() {
        console.log(chalk.yellow('Teardown Test Environment.'));
        await super.teardown();
    }

    /**
     * Retrieves the context for the VM (virtual machine).
     *
     * @returns the context for the VM, or null if not available
     */
    getVmContext(): Context | null {
        return super.getVmContext();
    }
}

module.exports = PuppeteerEnvironment;
