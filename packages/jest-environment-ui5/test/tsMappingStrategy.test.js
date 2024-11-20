const {initTsConfigMappingStrategy} = require("../src/tsMappingStrategy");
const path = require('path')

describe("Typescript Mapping Strategy", () => {
    it("should map the files from the project to the file system", async () => {
        const pathMappingFn = await initTsConfigMappingStrategy({ rootFolder: path.resolve(__dirname, "sampleapp"), configPath: path.resolve(__dirname, "sampleapp/tsconfig.json") })
        expect(pathMappingFn).not.toBe(null);
        const sampleAppPath = path.resolve(__dirname, "sampleapp/webapp");

        expect(path.relative(__dirname,pathMappingFn("sap/ui/demo/todo/Component"))).toBe(path.relative(__dirname, path.resolve(sampleAppPath, "Component.js")))
        expect(path.relative(__dirname,pathMappingFn("sap/ui/demo/todo/Component.js"))).toBe(path.relative(__dirname, path.resolve(sampleAppPath, "Component.js")))
        expect(path.relative(__dirname,pathMappingFn("sap/ui/demo/todo/OtherFile.ts"))).toBe(path.relative(__dirname, path.resolve(sampleAppPath, "OtherFile.ts")))
        expect(path.relative(__dirname,pathMappingFn("sap/ui/demo/todo/OtherFile"))).toBe(path.relative(__dirname, path.resolve(sampleAppPath, "OtherFile.ts")))
        expect(path.relative(__dirname,pathMappingFn("sap/ui/demo/todo/TSXFile.tsx"))).toBe(path.relative(__dirname, path.resolve(sampleAppPath, "TSXFile.tsx")))
        expect(path.relative(__dirname,pathMappingFn("sap/ui/demo/todo/TSXFile"))).toBe(path.relative(__dirname, path.resolve(sampleAppPath, "TSXFile.tsx")))
        expect(path.relative(__dirname,pathMappingFn("otherPackage/MyFile"))).toBe(path.relative(__dirname, path.resolve("otherPackage/MyFile"))); // not really resolved

        const secondpathMapping =  await initTsConfigMappingStrategy({ rootFolder: path.resolve(__dirname, "sampleapp"), configPath: path.resolve(__dirname, "sampleapp/tsconfig.json") });
        expect(secondpathMapping).toStrictEqual(pathMappingFn); // No need to recreate the pathMappingFn
    })
});