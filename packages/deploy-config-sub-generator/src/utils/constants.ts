// When deployment generator is bundled the namespacing is relative to the root generator
export const bundledRootGeneratorName = '@sap/fiori:fiori-deployment';
export const generatorNamespace = (subGenName: string): string => `${bundledRootGeneratorName}_${subGenName}`;
