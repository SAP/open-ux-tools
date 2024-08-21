import type { Command } from 'commander';
import { getLogger, traceChanges, setLogLevelVerbose } from '../../tracing';
import { validateBasePath } from '../../validation';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import type { OdataService } from '@sap-ux/odata-service-writer';
import { generate, OdataVersion } from '@sap-ux/odata-service-writer';
import type { InquirerAdapter, OdataServiceAnswers, OdataServicePromptOptions } from '@sap-ux/odata-service-inquirer';
import { DatasourceType, getPrompts, prompt } from '@sap-ux/odata-service-inquirer';
import { promptYUIQuestions } from '../../common';

/**
 * Adds a command to add an additional service to the project.
 *
 * @param cmd - commander command for adding an additional service
 */
export function addAddServiceCmd(cmd: Command): void {
    cmd.command('service [path]')
        .option('-s, --simulate', 'simulate only do not write config; sets also --verbose')
        .option('-v, --verbose', 'show verbose information')
        .action(async (path, options) => {
            if (options.verbose === true || options.simulate) {
                setLogLevelVerbose();
            }
            await addService(path || process.cwd(), !!options.simulate);
        });
}

/**
 * Add an additional service to the project.
 *
 * @param basePath - path to application root
 * @param simulate - if true, do not write but just show what would be change; otherwise write
 */
async function addService(basePath: string, simulate: boolean): Promise<void> {
    const logger = getLogger();
    try {
        //TBD
        logger.debug(`Called add service for path '${basePath}', simulate is '${simulate}'`);
        await validateBasePath(basePath);

        await promptServiceQuestions();

        const fs = create(createStorage());
        const config: OdataService = {
            url: 'http://localhost',
            path: '/sap/odata/testme',
            version: OdataVersion.v4,
            destination: {
                name: 'test'
            }
        };

        await generate(basePath, config, fs);
        if (!simulate) {
            await new Promise((resolve) => fs.commit(resolve));
        } else {
            await traceChanges(fs);
        }
    } catch (error) {
        logger.error(`Error while executing add service '${(error as Error).message}'`);
        logger.debug(error as Error);
    }
}

/**
 * Prompt for odata service writer inputs.
 * @returns the prompt answers
 */
async function promptServiceQuestions(): Promise<OdataServiceAnswers> {
    const promptOpts = {
        datasourceType: {
            default: DatasourceType.sapSystem
        }
    } as OdataServicePromptOptions;

    const { prompts, answers } = await getPrompts(promptOpts);
    await promptYUIQuestions<OdataServiceAnswers>(prompts, false);

    return answers as OdataServiceAnswers;
}
