export const getUI5Libs = (ui5Libs?: string): string[] => {
    return ['sap.m', 'sap.ushell'].concat(ui5Libs?.split(',') || []).filter((value, index, self) => {
        return self.indexOf(value) === index;
    });
};
