const {initTsConfigMappingStrategy} = require("../src/tsMappingStrategy");
const path = require('path')

describe("Typescript Mapping Strategy", () => {
    it("should map the files from the project to the file system", async () => {
        const pathMappingFn = await initTsConfigMappingStrategy({ rootFolder: path.resolve(__dirname, "sampleapp"), configPath: path.resolve(__dirname, "sampleapp/tsconfig.json") })
        expect(pathMappingFn).not.toBe(null);
        expect(path.relative(__dirname,pathMappingFn("sap/ui/demo/todo/Component"))).toBe("sampleapp/webapp/Component.js")
        expect(path.relative(__dirname,pathMappingFn("sap/ui/demo/todo/Component.js"))).toBe("sampleapp/webapp/Component.js")
        expect(path.relative(__dirname,pathMappingFn("sap/ui/demo/todo/OtherFile.ts"))).toBe("sampleapp/webapp/OtherFile.ts")
        expect(path.relative(__dirname,pathMappingFn("sap/ui/demo/todo/OtherFile"))).toBe("sampleapp/webapp/OtherFile.ts")
        expect(path.relative(__dirname,pathMappingFn("sap/ui/demo/todo/TSXFile.tsx"))).toBe("sampleapp/webapp/TSXFile.tsx")
        expect(path.relative(__dirname,pathMappingFn("sap/ui/demo/todo/TSXFile"))).toBe("sampleapp/webapp/TSXFile.tsx")

        const secondpathMapping =  await initTsConfigMappingStrategy({ rootFolder: path.resolve(__dirname, "sampleapp"), configPath: path.resolve(__dirname, "sampleapp/tsconfig.json") });
        expect(secondpathMapping).toStrictEqual(pathMappingFn); // No need to recreate the pathMappingFn
    })
});