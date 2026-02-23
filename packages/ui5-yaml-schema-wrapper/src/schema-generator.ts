import * as TJS from 'typescript-json-schema';
import { writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';

/**
 * TypeScript-JSON-Schema settings for generating JSON schemas
 */
export const settings: TJS.PartialArgs = {
    required: false,
    noExtraProps: true,
    skipLibCheck: true,
    ignoreErrors: true,
    validationKeywords: ['deprecated']
};

/**
 * TypeScript compiler options for schema generation
 */
export const compilerOptions: TJS.CompilerOptions = {
    strictNullChecks: true,
    esModuleInterop: true,
    skipLibCheck: true,
    moduleResolution: 'node' as unknown as TJS.CompilerOptions['moduleResolution'],
    resolveJsonModule: true
};

/**
 * Configuration for generating a middleware schema
 */
export interface MiddlewareSchemaConfig {
    /** Name of the middleware */
    name: string;
    /** Path to the TypeScript types file */
    typesPath: string;
    /** Name of the type to generate schema for */
    typeName: string;
    /** Output file name for the generated schema */
    outputFileName: string;
}

/**
 * Result of a schema generation operation
 */
export interface SchemaGenerationResult {
    /** Whether the schema was generated successfully */
    success: boolean;
    /** Name of the middleware */
    name: string;
    /** Output file path (if successful) */
    outputPath?: string;
    /** Error message (if failed) */
    error?: string;
}

/**
 * Helper to resolve package source paths
 *
 * @param packageName - The npm package name
 * @param srcPath - The relative path within the package's src directory
 * @returns The absolute path to the source file
 */
export function resolvePackageSrc(packageName: string, srcPath: string): string {
    const packageJson = require.resolve(`${packageName}/package.json`);
    return join(dirname(packageJson), 'src', srcPath);
}

/**
 * Get the default schema output directory
 *
 * @param baseDir - Base directory (defaults to current working directory)
 * @returns The absolute path to the schema output directory
 */
export function getSchemaOutputDir(baseDir: string = process.cwd()): string {
    return join(baseDir, 'schema');
}

/**
 * Get the default middleware configurations
 *
 * @returns Array of middleware schema configurations
 */
export function getMiddlewareConfigs(): MiddlewareSchemaConfig[] {
    return [
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
}

/**
 * Generate a JSON schema for a middleware configuration type
 *
 * @param config - The middleware schema configuration
 * @param outputDir - Directory to write the schema file to
 * @param verbose - Whether to log progress messages
 * @returns Result of the schema generation
 */
export function generateSchema(
    config: MiddlewareSchemaConfig,
    outputDir: string,
    verbose: boolean = true
): SchemaGenerationResult {
    if (verbose) {
        console.log(`\nGenerating schema for ${config.name}...`);
        console.log(`  Types path: ${config.typesPath}`);
        console.log(`  Type name: ${config.typeName}`);
    }

    if (!existsSync(config.typesPath)) {
        const error = `Types file not found: ${config.typesPath}`;
        if (verbose) {
            console.error(`  ERROR: ${error}`);
        }
        return { success: false, name: config.name, error };
    }

    try {
        const program = TJS.getProgramFromFiles([config.typesPath], compilerOptions);
        const schema = TJS.generateSchema(program, config.typeName, settings);

        if (!schema) {
            const error = `Failed to generate schema for ${config.typeName}`;
            if (verbose) {
                console.error(`  ERROR: ${error}`);
            }
            return { success: false, name: config.name, error };
        }

        const outputPath = join(outputDir, config.outputFileName);
        writeFileSync(outputPath, JSON.stringify(schema, null, 2));

        if (verbose) {
            console.log(`  SUCCESS: Schema written to ${config.outputFileName}`);
        }

        return { success: true, name: config.name, outputPath };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (verbose) {
            console.error(`  ERROR: ${errorMessage}`);
        }
        return { success: false, name: config.name, error: errorMessage };
    }
}

/**
 * Summary of all schema generation operations
 */
export interface GenerationSummary {
    /** Total number of schemas processed */
    total: number;
    /** Number of successfully generated schemas */
    successCount: number;
    /** Number of failed schema generations */
    failCount: number;
    /** Results for each middleware */
    results: SchemaGenerationResult[];
}

/**
 * Generate all middleware schemas
 *
 * @param configs - Array of middleware configurations (defaults to all configured middlewares)
 * @param outputDir - Directory to write schema files to
 * @param verbose - Whether to log progress messages
 * @returns Summary of the generation process
 */
export function generateAllSchemas(
    configs: MiddlewareSchemaConfig[] = getMiddlewareConfigs(),
    outputDir: string = getSchemaOutputDir(),
    verbose: boolean = true
): GenerationSummary {
    if (verbose) {
        console.log('=== Generating Middleware Schemas ===');
        console.log(`Schema output directory: ${outputDir}`);
    }

    const results: SchemaGenerationResult[] = [];
    let successCount = 0;
    let failCount = 0;

    for (const config of configs) {
        const result = generateSchema(config, outputDir, verbose);
        results.push(result);
        if (result.success) {
            successCount++;
        } else {
            failCount++;
        }
    }

    if (verbose) {
        console.log(`\n=== Summary ===`);
        console.log(`Success: ${successCount}/${configs.length}`);
        console.log(`Failed: ${failCount}/${configs.length}`);
    }

    return {
        total: configs.length,
        successCount,
        failCount,
        results
    };
}

/**
 * CLI entry point for generating schemas
 *
 * @param baseDir - Base directory for schema output (defaults to current working directory)
 */
export function runCli(baseDir: string = process.cwd()): void {
    const schemaOutputDir = join(baseDir, 'schema');
    const summary = generateAllSchemas(undefined, schemaOutputDir, true);

    if (summary.failCount > 0) {
        process.exit(1);
    }

    console.log('\nAll schemas generated successfully!');
}

// Run CLI if this file is executed directly
if (require.main === module) {
    runCli(__dirname.replace(/[/\\]src$/, ''));
}
