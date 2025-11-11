import { z } from 'zod';
import { envVariable } from './env-variables.js';
import { validate } from './validate.js';

/**
 * Schema for the BTP service key of SAP AI Core.
 */
const ServiceKey = z.object({
    clientid: z.string(),
    clientsecret: z.string(),
    url: z.string(),
    serviceurls: z.object({
        AI_API_URL: z.string()
    })
});

/**
 * Schema for the LLM_API_CONFIG environment variable set on Jenkins.
 */
const LlmApiConfigEnvVariableJenkins = z.object({
    'gpt-4o': z.object({
        sapAICoreAPISettings: z.object({
            serviceKey: ServiceKey
        })
    })
});

/** Schema for the LLM_API_CONFIG environment variable, accepts both a plain service key and the Jenkins format. */
const LlmApiConfigEnvVariable = z.union([LlmApiConfigEnvVariableJenkins, ServiceKey]);

function isJenkinsVariant(
    config: z.infer<typeof LlmApiConfigEnvVariable>
): config is z.infer<typeof LlmApiConfigEnvVariableJenkins> {
    return 'gpt-4o' in config;
}

/**
 * Returns the service key from the environment variable LLM_API_CONFIG.
 *
 * @returns The service key object.
 */
export function getServiceKeyFromEnv(): z.infer<typeof ServiceKey> {
    const config = validate(JSON.parse(envVariable('LLM_API_CONFIG')), LlmApiConfigEnvVariable);

    if (!config.success) {
        throw new Error(`Invalid LLM_API_CONFIG: ${config.message}`);
    }

    if (isJenkinsVariant(config.data)) {
        return config.data['gpt-4o'].sapAICoreAPISettings.serviceKey;
    }

    return config.data; // Only the service key
}
