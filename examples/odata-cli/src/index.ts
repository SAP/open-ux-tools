import { isAppStudio } from '@sap-ux/btp-utils';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { TestActivity, TestTarget } from './types';
import { logger } from './types';
import { testWithAbapSystem, testWithDestination, testWithAbapBtpSystem, testWithCloudAbapSystem } from './targets';
import { testDeployUndeployDTA, useAdtServices, useCatalogAndFetchSomeMetadata } from './activities';

const targets: { [name: string]: TestTarget } = {
    abap: testWithAbapSystem,
    destination: testWithDestination,
    btp: testWithAbapBtpSystem,
    cloud: testWithCloudAbapSystem,
    unknown: () => {
        logger.info(
            `Test name missing or unknown, try 'pnpm start abap' or use any of the following activities: ${Object.keys(
                targets
            )}`
        );
        return Promise.resolve();
    }
};

const activities: { [name: string]: TestActivity } = {
    odata: useCatalogAndFetchSomeMetadata,
    adt: useAdtServices,
    dta: testDeployUndeployDTA
};

// read CLI arguments as well as environment variables
const args = process.argv.slice(3);
const processEnv = process.env;

// create a temp folder for output
processEnv['TEST_OUTPUT'] = processEnv['TEST_OUTPUT'] ?? join(process.cwd(), '.tmp');
if (!existsSync(processEnv['TEST_OUTPUT'])) {
    mkdirSync(processEnv['TEST_OUTPUT']);
}

// execute different scripts depending on the environment and activity
let target: string;
let activity: string;
if (isAppStudio()) {
    target = 'destination';
    activity = args.length > 0 ? args[0] : 'odata';
} else {
    target = args.length > 0 ? args[0] : 'unknown';
    activity = args.length > 1 ? args[1] : 'odata';
}
targets[target](processEnv, activities[activity]);
