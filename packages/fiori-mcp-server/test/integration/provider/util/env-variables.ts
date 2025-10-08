/**
 * Returns the value of the specified environment variable.
 *
 * @param name Name of the environment variable.
 * @param defaultValue Default value if the environment variable is not set.
 * @returns The value of the environment variable.
 * @throws Error if the environment variable is not set and no default value is provided.
 */
export function envVariable(name: string, defaultValue?: string): string {
    const value = process.env[name] ?? defaultValue;
    if (!value) {
        throw new Error(`Missing environment variable: ${name}`);
    }
    return value;
}
