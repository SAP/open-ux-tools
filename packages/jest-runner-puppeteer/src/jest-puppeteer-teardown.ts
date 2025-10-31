import chalk from 'chalk';
import { rimraf } from 'rimraf';
import os from 'node:os';
import path from 'node:path';

const globalAny: any = global;

const DIR = path.join(os.tmpdir(), 'jest_puppeteer_global_setup');

/**
 * Tears down the Puppeteer environment.
 * Closes the Puppeteer browser instance and removes temporary setup directory.
 */
export default async function () {
    console.log(chalk.green('Teardown Puppeteer'));
    await globalAny.__BROWSER_GLOBAL__.close();
    rimraf.rimrafSync(DIR);
}
