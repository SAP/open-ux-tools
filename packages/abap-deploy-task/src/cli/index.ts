import type { OptionDefinition } from 'command-line-args';
import { default as parse } from 'command-line-args';
import { deploy } from '../base';
import type { CliOptions } from '../types';
import { getArchive } from './archive';
import { getDeploymentConfig } from './deploy';

const opts: OptionDefinition[] = [
    { name: 'config', alias: 'c', type: String },
    { name: 'test', alias: 't', type: Boolean },
    { name: 'yes', alias: 'y', type: Boolean }
];

/**
 * Function that is to be execute when the exposed deploy command is executed.
 */
export async function run() {
    const options = parse(opts) as CliOptions;
    console.log(options);

    const archive = await getArchive(options);
    const config = await getDeploymentConfig(options.config ?? 'ui5.yaml');

    deploy(archive, config.target, config.app, config.test ?? options.test);
}
