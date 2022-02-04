import { defaultUI5Libs } from "./defaultSettings";

/**
 * Merges the specified ui5 libs with the defaults.
 * 
 * @param ui5Libs - The ui5 libraries to be merged with the defaults
 * @returns UI5 libs with defaults
 */
export const getUI5Libs = (ui5Libs?: string | string[]): string[] => {
    const libs = Array.isArray(ui5Libs) ? ui5Libs : ui5Libs?.split(',') || [];
    return defaultUI5Libs.concat(libs).filter((value, index, self) => {
        return self.indexOf(value) === index;
    });
};
