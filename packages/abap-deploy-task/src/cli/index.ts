import { program } from 'commander';
import { deploy } from '../base';
import type { CliOptions } from '../types';
import { getArchive } from './archive';
import { getDeploymentConfig } from './deploy';

program
    .requiredOption('-c, --config <path-to-yaml>', 'path to the ui5*.yaml')
    .option('-t, --test', 'only do a test deployment', false)
    .option('-y, --yes', 'yes to all questions', false)
    .version('0.0.1');

/**
 * Function that is to be execute when the exposed deploy command is executed.
 */
export async function run() {
    program.parse();
    const options = (program.opts() ?? {}) as CliOptions;
    console.log(options);

    const archive = await getArchive(options);
    const config = await getDeploymentConfig(options.config);

    deploy(archive, config.target, config.app, config.test ?? options.test);
}
