export type SupportedPlatform = 'darwin' | 'win32' | 'linux';

type PlatformCommands = {
    saveCommand: (service: string, key: string, value: string) => string;
    retrieveCommand: (service: string, key: string) => string;
    deleteCommand: (service: string, key: string) => string;
    getAllCommand?: (service: string) => string;
};

/**
 * Returns the platform-specific commands for credential management.
 * @param platform - The platform type (darwin, win32, or linux).
 * @returns The commands for each operation (save, retrieve, delete, getAll).
 */
export function getPlatformCommands(platform: SupportedPlatform): PlatformCommands {
    switch (platform) {
        case 'darwin':
            return {
                saveCommand: (service: string, key: string, value: string) =>
                    `security add-generic-password -a "${key}" -s "${service}" -w "${value}" -D "${key}" -U`,
                retrieveCommand: (service: string, key: string) =>
                    `security find-generic-password -a "${key}" -s "${service}" -w`,
                deleteCommand: (service: string, key: string) =>
                    `security delete-generic-password -a "${key}" -s "${service}"`
            };

        case 'win32':
            return {
                saveCommand: (service: string, key: string, value: string) =>
                    `cmdkey /add:${service} /user:${key} /pass:${value}`,
                retrieveCommand: (service: string, key: string) =>
                    `cmdkey /list:${service}`,
                deleteCommand: (service: string, key: string) =>
                    `cmdkey /delete:${service}`,
                getAllCommand: (service: string) =>
                    `cmdkey /list:${service}`
            };

        case 'linux':
            return {
                saveCommand: (service: string, key: string, value: string) =>
                    `secret-tool store --label="${service}" service "${service}" account "${key}" <<< "${value}"`,
                retrieveCommand: (service: string, key: string) =>
                    `secret-tool lookup service "${service}" account "${key}"`, 
                deleteCommand: (service: string, key: string) =>
                    `secret-tool clear service "${service}" account "${key}"`
            };

        default:
            throw new Error(`Unsupported platform: ${platform}`);
    }
}

