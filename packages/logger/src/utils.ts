/**
 *  Get environment variable
 *  It's a simple wrapper around process.env. This is helpful for mocking
 *
 * @param varName  environment variable name
 * @returns value if variable is set, undefined otherwise
 */
export function getEnvVar(varName: string): string | undefined {
    return process.env[varName];
}
