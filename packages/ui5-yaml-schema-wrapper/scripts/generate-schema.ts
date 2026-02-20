import * as TJS from 'typescript-json-schema';
import { writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';

const settings: TJS.PartialArgs = {
    required: false,
    noExtraProps: true,
    skipLibCheck: true,
    ignoreErrors: true,
    validationKeywords: ['deprecated']
};

const compilerOptions = {
    strictNullChecks: true,
    esModuleInterop: true,
    skipLibCheck: true,
    moduleResolution: 'node',
    resolveJsonModule: true
};

// Middleware configurations to generate schemas for
interface MiddlewareSchemaConfig {
    name: string;
    typesPath: string;
    typeName: string;
    outputFileName: string;
}

// Helper to resolve package source paths
function resolvePackageSrc(packageName: string, srcPath: string): string {
    const packageJson = require.resolve(`${packageName}/package.json`);
    return join(dirname(packageJson), 'src', srcPath);
}

const schemaOutputDir = join(__dirname, '..', 'schema');

const middlewareConfigs: MiddlewareSchemaConfig[] = [
    {
        name: 'preview-middleware',
        typesPath: resolvePackageSrc('@sap-ux/preview-middleware', 'types/index.ts'),
        typeName: 'MiddlewareConfig',
        outputFileName: 'preview-middleware-schema.json'
    },
    {
        name: 'backend-proxy-middleware',
        typesPath: resolvePackageSrc('@sap-ux/backend-proxy-middleware', 'base/types.ts'),
        typeName: 'BackendMiddlewareConfig',
        outputFileName: 'backend-proxy-middleware-schema.json'
    },
    {
        name: 'backend-proxy-middleware-cf',
        typesPath: resolvePackageSrc('@sap-ux/backend-proxy-middleware-cf', 'types.ts'),
        typeName: 'CfOAuthMiddlewareConfig',
        outputFileName: 'backend-proxy-middleware-cf-schema.json'
    },
    {
        name: 'reload-middleware',
        typesPath: resolvePackageSrc('@sap-ux/reload-middleware', 'base/types.ts'),
        typeName: 'ReloaderConfig',
        outputFileName: 'reload-middleware-schema.json'
    },
    {
        name: 'serve-static-middleware',
        typesPath: resolvePackageSrc('@sap-ux/serve-static-middleware', 'base/types.ts'),
        typeName: 'ServeStaticConfig',
        outputFileName: 'serve-static-middleware-schema.json'
    },
    {
        name: 'ui5-proxy-middleware',
        typesPath: resolvePackageSrc('@sap-ux/ui5-config', 'types/middlewares.ts'),
        typeName: 'UI5ProxyConfig',
        outputFileName: 'ui5-proxy-middleware-schema.json'
    }
];

function generateSchema(config: MiddlewareSchemaConfig): boolean {
    console.log(`\nGenerating schema for ${config.name}...`);
    console.log(`  Types path: ${config.typesPath}`);
    console.log(`  Type name: ${config.typeName}`);

    if (!existsSync(config.typesPath)) {
        console.error(`  ERROR: Types file not found: ${config.typesPath}`);
        return false;
    }

    try {
        const program = TJS.getProgramFromFiles([config.typesPath], compilerOptions);
        const schema = TJS.generateSchema(program, config.typeName, settings);

        if (!schema) {
            console.error(`  ERROR: Failed to generate schema for ${config.typeName}`);
            return false;
        }

        const outputPath = join(schemaOutputDir, config.outputFileName);
        writeFileSync(outputPath, JSON.stringify(schema, null, 2));
        console.log(`  SUCCESS: Schema written to ${config.outputFileName}`);
        return true;
    } catch (error) {
        console.error(`  ERROR: ${error}`);
        return false;
    }
}

console.log('=== Generating Middleware Schemas ===');
console.log(`Schema output directory: ${schemaOutputDir}`);

let successCount = 0;
let failCount = 0;

for (const config of middlewareConfigs) {
    if (generateSchema(config)) {
        successCount++;
    } else {
        failCount++;
    }
}

console.log(`\n=== Summary ===`);
console.log(`Success: ${successCount}/${middlewareConfigs.length}`);
console.log(`Failed: ${failCount}/${middlewareConfigs.length}`);

if (failCount > 0) {
    process.exit(1);
}

console.log('\nAll schemas generated successfully!');
