import type { Command } from 'commander';
import { getLogger, traceChanges, setLogLevelVerbose } from '../../tracing';
import { validateBasePath } from '../../validation';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import type { OdataService } from '@sap-ux/odata-service-writer';
import { generate, OdataVersion } from '@sap-ux/odata-service-writer';
import type { OdataServiceAnswers, OdataServicePromptOptions } from '@sap-ux/odata-service-inquirer';
import { DatasourceType, getPrompts, promptNames } from '@sap-ux/odata-service-inquirer';
import { promptYUIQuestions } from '../../common';
import type { Logger } from '@sap-ux/logger';

type CliArgs = {
    url?: string;
};

/**
 * Adds a command to add an additional service to the project.
 *
 * @param cmd - commander command for adding an additional service
 */
export function addAddServiceCmd(cmd: Command): void {
    cmd.command('service [path]')
        .option('-s, --simulate', 'simulate only do not write config; sets also --verbose')
        .option('-v, --verbose', 'show verbose information')
        .option('--url <string>', 'URL of the OData service')
        .action(async (path, options) => {
            if (options.verbose === true || options.simulate) {
                setLogLevelVerbose();
            }
            await addService(path || process.cwd(), !!options.simulate, options);
        });
}

/**
 * Add an additional service to the project.
 *
 * @param basePath - path to application root
 * @param simulate - if true, do not write but just show what would be change; otherwise write
 * @param args - command line arguments
 */
async function addService(basePath: string, simulate: boolean, args: CliArgs): Promise<void> {
    const logger = getLogger();
    try {
        //TBD
        logger.debug(`Called add service for path '${basePath}', simulate is '${simulate}'`);
        await validateBasePath(basePath);

        const answers = await promptServiceQuestions(logger, args);
        const config = createServiceConfiguration(answers);

        const fs = create(createStorage());
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
 *
 * @param logger logger instance
 * @param args - command line arguments
 * @param args.url - URL of the OData service
 * @returns the prompt answers
 */
async function promptServiceQuestions(logger: Logger, { url }: CliArgs): Promise<OdataServiceAnswers> {
    const promptOpts = {
        datasourceType: {
            default: DatasourceType.odataServiceUrl,
            includeNone: false,
            includeProjectSpecificDestination: false
        }
    } as OdataServicePromptOptions;

    const { prompts, answers } = await getPrompts(promptOpts, logger, undefined, undefined, true);
    // if url is provided then there is no need to prompt the type
    if (url) {
        prompts.find((p) => p.name === promptNames.serviceUrl)!.default = url;
    }
    await promptYUIQuestions<OdataServiceAnswers>(prompts, false, answers as OdataServiceAnswers);

    return answers as OdataServiceAnswers;
}

/**
 * Create a service configuration object from the answers.
 *
 * @param answers - answers from the prompts
 * @returns the service configuration
 */
function createServiceConfiguration(answers: OdataServiceAnswers): OdataService {
    const pathElements = answers.servicePath!.split('/');
    let serviceName = pathElements.pop();
    // in case the path ends with a slash, the last element is empty
    if (!serviceName) {
        serviceName = pathElements.pop();
    }
    // if the last element is the version use the previous one
    if (serviceName && parseInt(serviceName, 2)) {
        serviceName = `${pathElements.pop()}_${serviceName}`;
    }

    return {
        name: serviceName,
        model: serviceName,
        url: answers.origin,
        client: answers.sapClient,
        path: answers.servicePath,
        version: answers.odataVersion ?? OdataVersion.v2,
        metadata: answers.metadata
    };
}
