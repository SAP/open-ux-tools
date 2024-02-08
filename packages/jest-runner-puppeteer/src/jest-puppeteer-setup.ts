import chalk from 'chalk';
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import mkdirp from 'mkdirp';
import os from 'os';
import path from 'path';
import { findChrome } from './locate-chrome';
import { getAnyEdgeStable } from './locate-edge';

const globalAny: any = global;

const DIR = path.join(os.tmpdir(), 'jest_puppeteer_global_setup');

/**
 * Retrieves the path to the specified browser.
 * If browser name is not provided or unrecognized, defaults to Chrome.
 *
 * @param browser the name of the browser
 * @returns the path to the browser executable, or null if not found
 * @throws if an unrecognized browser name is provided
 */
function getBrowserPath(browser: string) {
    if (browser) {
        switch (browser.toLowerCase()) {
            case 'chrome':
                return findChrome();
            case 'edge':
                return getAnyEdgeStable();
            default:
                throw new Error('Unrecognized browser name set to E2E_BROWSER env variable!');
        }
    }
    return findChrome();
}

/**
 * Sets up the Puppeteer environment.
 * Launches a Puppeteer browser instance with specified configurations.
 */
export default async function () {
    console.log(
        chalk.green(
            `Running Puppeteer${
                process.env.PUPPETEER_HEADLESS !== 'false'
                    ? ' in headless mode. Set PUPPETEER_HEADLESS to toggle it'
                    : ''
            }...`
        )
    );
    const browser = await puppeteer.launch({
        defaultViewport: null,
        headless: process.env.PUPPETEER_HEADLESS !== 'false',
        ignoreHTTPSErrors: true,
        executablePath: getBrowserPath(process.env.E2E_BROWSER) as string,
        args: [
            '--window-size=1600,1200',
            '--log-level=3', // fatal only
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--ignore-certificate-errors',
            '--disable-features=site-per-process',
            '--disable-web-security',
            '--disable-site-isolation-trials',
            '--no-default-browser-check',
            '--disable-infobars',
            '--no-experiments',
            '--ignore-gpu-blacklist',
            '--ignore-certificate-errors-spki-list',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-default-apps',
            '--enable-features=NetworkService'
        ]
    });
    const browserVersion = await browser.version();
    console.log(`Browser Version - ${browserVersion}`);
    // This global is not available inside tests but only in global teardown
    globalAny.__BROWSER_GLOBAL__ = browser;
    // Instead, we expose the connection details via file system to be used in tests
    mkdirp.sync(DIR);
    fs.writeFileSync(path.join(DIR, 'wsEndpoint'), browser.wsEndpoint());
}
