import chalk from 'chalk';
import { TestEnvironment } from 'jest-environment-node';
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';

const DIR = join(os.tmpdir(), 'jest_puppeteer_global_setup');

/**
 * PuppeteerEnvironment class extends TestEnvironment (Jest 30 API) and provides setup and teardown methods
 * for Puppeteer integration in Jest tests.
 *
 * @extends TestEnvironment
 */
export class PuppeteerEnvironment extends TestEnvironment {
    /**
     * Creates an instance of PuppeteerEnvironment.
     *
     * @param config Jest environment configuration
     * @param context the environment context
     */
    constructor(config: any, context: any) {
        super(config, context);
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
    getVmContext() {
        return super.getVmContext();
    }
}

export default PuppeteerEnvironment;
