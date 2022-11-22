import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import {
    AbapCloudEnvironment,
    createForAbap,
    createForAbapOnCloud,
    createForDestination
} from '@sap-ux/axios-extension';
import { isAbapSystem, listDestinations } from '@sap-ux/btp-utils';
import { readFileSync } from 'fs';
import type { TestActivity } from './types';
import { logger } from './types';

/**
 * Read the required values for connecting to an on-premise SAP system from the env variable, create a provider instance and execute the system agnostic example script.
 *
 * @param env object reprensenting the content of the .env file.
 * @param env.TEST_SYSTEM base url of the test system
 * @param env.TEST_USER optional username
 * @param env.TEST_PASSWORD optional password
 * @param activity Test Activity
 * @returns a promise recolving to an AbapServiceProvider instance
 */
export async function testWithAbapSystem(
    env: {
        TEST_SYSTEM: string;
        TEST_USER?: string;
        TEST_PASSWORD?: string;
    },
    activity: TestActivity
): Promise<void> {
    const provider = createForAbap({
        baseURL: env.TEST_SYSTEM,
        ignoreCertErrors: true,
        auth: {
            username: env.TEST_USER,
            password: env.TEST_PASSWORD
        }
    });
    activity(provider, env);
}

/**
 * Read the required values for connecting to an ABAP environment on BTP from the env variable, create a provider instance and execute the system agnostic example script.
 *
 * @param env object reprensenting the content of the .env file.
 * @param env.TEST_SERVICE_INFO_PATH path to a local copy of the service configuration file
 * @param env.TEST_PACKAGE optional package name for testing fetch transport numbers
 * @param env.TEST_APP optioanl project name for testing fetch transport numbers, new project doesn't exist on backend is also allowed
 * @param activity Test Activity
 * @returns Promise<void>
 */
export async function testWithAbapBtpSystem(
    env: {
        TEST_SERVICE_INFO_PATH: string;
        TEST_PACKAGE?: string;
        TEST_APP?: string;
    },
    activity: TestActivity
): Promise<void> {
    const serviceInfo = JSON.parse(readFileSync(env.TEST_SERVICE_INFO_PATH, 'utf-8'));
    // provider launches browser for uaa authentication
    const provider = createForAbapOnCloud({
        environment: AbapCloudEnvironment.Standalone,
        service: serviceInfo,
        refreshTokenChangedCb: (newToken: string) => {
            logger.info(`New refresh token issued ${newToken}`);
        }
    });
    await activity(provider, env);

    // provider2 uses existing cookies from provider and doesn't launches browser for second time uaa authentication
    const provider2 = createForAbapOnCloud({
        environment: AbapCloudEnvironment.Standalone,
        service: serviceInfo,
        cookies: provider.cookies.toString(),
        refreshTokenChangedCb: () => {
            logger.error(`Live connection session exists. This token refresh callback should not be called!`);
        }
    });
    await activity(provider2, env);
}

/**
 * Read the required values for connecting to a Cloud ABAP environment from the env variable, create a provider instance and execute the system agnostic example script.
 *
 * @param env object reprensenting the content of the .env file.
 * @param env.TEST_SYSTEM base url of the test system
 * @param env.TEST_IGNORE_CERT_ERRORS optional, ignore certifcate errors or not
 * @param activity Test Activity
 * @returns Promise<void>
 */
export async function testWithCloudAbapSystem(
    env: { TEST_SYSTEM: string; TEST_IGNORE_CERT_ERRORS?: string },
    activity: TestActivity
): Promise<void> {
    const provider = createForAbapOnCloud({
        environment: AbapCloudEnvironment.EmbeddedSteampunk,
        url: env.TEST_SYSTEM,
        ignoreCertErrors: env.TEST_IGNORE_CERT_ERRORS === 'true'
    });
    activity(provider, env);
}

/**
 * Read the required values for connecting to a destination from the env variable, create a provider instance and execute the system agnostic example script.
 *
 * @param env object reprensenting the content of the .env file.
 * @param env.TEST_DESTINATION name of destination
 * @param env.TEST_USER optional username
 * @param env.TEST_PASSWORD optional password
 * @param activity Test Activity
 * @returns Promise<void>
 */
export async function testWithDestination(
    env: {
        TEST_DESTINATION: string;
        TEST_USER?: string;
        TEST_PASSWORD?: string;
    },
    activity: TestActivity
): Promise<void> {
    const destinations = await listDestinations();
    if (destinations[env.TEST_DESTINATION] && isAbapSystem(destinations[env.TEST_DESTINATION])) {
        const provider = createForDestination(
            env.TEST_USER
                ? {
                      auth: {
                          username: env.TEST_USER,
                          password: env.TEST_PASSWORD
                      }
                  }
                : {},
            destinations[env.TEST_DESTINATION]
        ) as AbapServiceProvider;
        activity(provider, env);

        const provider2 = createForDestination(
            {
                cookies: provider.cookies.toString()
            },
            destinations[env.TEST_DESTINATION]
        ) as AbapServiceProvider;
        activity(provider2, env);
    } else {
        logger.info(`Invalid destination ${env.TEST_DESTINATION}`);
    }
}
