export const getUI5Libs = (ui5Libs?: string | string[]): string[] => {
    const libs = Array.isArray(ui5Libs) ? ui5Libs : ui5Libs?.split(',') || [];
    return ['sap.m'].concat(libs).filter((value, index, self) => {
        return self.indexOf(value) === index;
    });
};
