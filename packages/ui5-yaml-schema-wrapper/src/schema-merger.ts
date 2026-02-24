import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Merge all individual middleware schemas into the main ux-ui5-tooling-schema.json
 */

interface SchemaDefinition {
    [key: string]: unknown;
}

interface SchemaProperty {
    type?: string | string[];
    description?: string;
    properties?: Record<string, SchemaProperty>;
    items?: SchemaProperty | SchemaProperty[];
    $ref?: string;
    const?: unknown;
    enum?: unknown[];
    allOf?: SchemaProperty[];
    anyOf?: SchemaProperty[];
    oneOf?: SchemaProperty[];
    additionalProperties?: boolean | SchemaProperty;
    required?: string[];
    default?: unknown;
    [key: string]: unknown;
}

interface Schema {
    $schema?: string;
    description?: string;
    type?: string | string[];
    properties?: Record<string, SchemaProperty>;
    definitions?: SchemaDefinition;
    additionalProperties?: boolean | SchemaProperty;
    [key: string]: unknown;
}

interface MiddlewareSchemaMapping {
    /** Middleware name as it appears in ui5.yaml */
    middlewareName: string;
    /** Schema file name */
    schemaFileName: string;
    /** Property path in the configuration object (defaults to root) */
    configPath?: string;
}

/**
 * Type representing a JSON Schema conditional for middleware configuration.
 * Using a type alias instead of interface to avoid SonarQube warning about 'then' property.
 */
type MiddlewareCondition = {
    if: {
        properties: {
            name: {
                const: string;
            };
        };
    };
    then: {
        properties: {
            configuration: unknown;
        };
    };
};

/**
 * Get the list of middleware schemas to merge.
 *
 * @returns Array of middleware schema mappings
 */
function getMiddlewareMappings(): MiddlewareSchemaMapping[] {
    return [
        {
            middlewareName: 'preview-middleware',
            schemaFileName: 'preview-middleware-schema.json'
        },
        {
            middlewareName: 'fiori-tools-preview',
            schemaFileName: 'preview-middleware-schema.json'
        },
        {
            middlewareName: 'backend-proxy-middleware',
            schemaFileName: 'backend-proxy-middleware-schema.json'
        },
        {
            middlewareName: 'backend-proxy-middleware-cf',
            schemaFileName: 'backend-proxy-middleware-cf-schema.json'
        },
        {
            middlewareName: 'reload-middleware',
            schemaFileName: 'reload-middleware-schema.json'
        },
        {
            middlewareName: 'fiori-tools-appreload',
            schemaFileName: 'reload-middleware-schema.json'
        },
        {
            middlewareName: 'fiori-tools-servestatic',
            schemaFileName: 'serve-static-middleware-schema.json'
        },
        {
            middlewareName: 'serve-static-middleware',
            schemaFileName: 'serve-static-middleware-schema.json'
        },
        {
            middlewareName: 'ui5-proxy-middleware',
            schemaFileName: 'ui5-proxy-middleware-schema.json'
        },
        {
            middlewareName: 'fiori-tools-proxy',
            schemaFileName: 'fiori-tools-proxy-schema.json'
        }
    ];
}

/**
 * Load a schema file from the schema directory.
 *
 * @param schemaDir - Directory to load the schema from
 * @param fileName - Name of the schema file to load
 * @returns The loaded schema object
 */
function loadSchema(schemaDir: string, fileName: string): Schema {
    const filePath = join(schemaDir, fileName);
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
}

/**
 * Resolve external file references in a schema by extracting definitions and converting to internal refs.
 *
 * @param schema - The schema to process
 * @param schemaDir - Directory to load referenced schemas from
 * @param loadedSchemas - Cache of already loaded schemas to avoid duplicates
 * @param prefix - Prefix to use for extracted definitions to avoid conflicts
 * @returns The schema with external refs resolved
 */
function resolveExternalRefs(
    schema: Schema,
    schemaDir: string,
    loadedSchemas: Map<string, Schema>,
    prefix: string
): Schema {
    const extractedDefinitions: SchemaDefinition = {};
    const extractedKeys = new Set<string>();

    // Helper to extract a definition and all its dependencies
    const extractDefinition = (refSchema: Schema, defName: string, refSchemaPrefix: string): string => {
        const newDefName = `${prefix}_${refSchemaPrefix}_${defName}`;

        // If already extracted, return the name
        if (extractedKeys.has(newDefName)) {
            return newDefName;
        }

        if (refSchema.definitions?.[defName]) {
            extractedKeys.add(newDefName);
            const defValue = structuredClone(refSchema.definitions[defName]);

            // Process the definition to extract any dependencies
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            extractedDefinitions[newDefName] = extractDependentDefs(defValue, refSchema, refSchemaPrefix);

            return newDefName;
        }

        return newDefName;
    };

    // Helper to find and extract dependent definitions
    const extractDependentDefs = (obj: unknown, refSchema: Schema, refSchemaPrefix: string): unknown => {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map((item) => extractDependentDefs(item, refSchema, refSchemaPrefix));
        }

        const result: Record<string, unknown> = {};
        for (const key in obj as Record<string, unknown>) {
            if (key === '$ref' && typeof (obj as Record<string, unknown>)[key] === 'string') {
                const ref = (obj as Record<string, unknown>)[key] as string;
                // Check if it's an internal reference to the same schema
                if (ref.startsWith('#/definitions/')) {
                    const depDefName = ref.substring('#/definitions/'.length);
                    const newDepDefName = extractDefinition(refSchema, depDefName, refSchemaPrefix);
                    result[key] = `#/definitions/${newDepDefName}`;
                } else {
                    result[key] = ref;
                }
            } else {
                result[key] = extractDependentDefs((obj as Record<string, unknown>)[key], refSchema, refSchemaPrefix);
            }
        }
        return result;
    };

    const resolveExternalRef = (ref: string, result: Record<string, unknown>, key: string): boolean => {
        if (!ref.includes('.json#')) {
            return false;
        }

        const [fileName, jsonPath] = ref.split('#');

        // Load the referenced schema if not already loaded
        if (!loadedSchemas.has(fileName)) {
            loadedSchemas.set(fileName, loadSchema(schemaDir, fileName));
        }

        const refSchema = loadedSchemas.get(fileName)!;
        const refSchemaPrefix = fileName.replace('-schema.json', '').replaceAll('-', '_');

        // Resolve the JSON path
        if (jsonPath.startsWith('/definitions/')) {
            const defName = jsonPath.substring('/definitions/'.length);
            const newDefName = extractDefinition(refSchema, defName, refSchemaPrefix);
            result[key] = `#/definitions/${newDefName}`;
            return true;
        }

        if (jsonPath.startsWith('/properties/')) {
            const propName = jsonPath.substring('/properties/'.length);
            if (refSchema.properties?.[propName]) {
                // Process the property to extract dependent definitions
                const propSchema = structuredClone(refSchema.properties[propName]);
                const processedProp = extractDependentDefs(propSchema, refSchema, refSchemaPrefix);

                // Inline the processed property schema
                delete result[key];
                Object.assign(result, processedProp);
                return true;
            }
        }

        return false;
    };

    const resolveRefs = (obj: unknown): unknown => {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(resolveRefs);
        }

        const result: Record<string, unknown> = {};
        for (const key in obj as Record<string, unknown>) {
            if (key === '$ref' && typeof (obj as Record<string, unknown>)[key] === 'string') {
                const ref = (obj as Record<string, unknown>)[key] as string;
                // Check if it's an external file reference
                const resolved = resolveExternalRef(ref, result, key);
                if (!resolved) {
                    result[key] = ref;
                }
            } else {
                result[key] = resolveRefs((obj as Record<string, unknown>)[key]);
            }
        }
        return result;
    };

    const resolvedSchema = resolveRefs(schema) as Schema;

    // Merge extracted definitions with existing definitions
    if (Object.keys(extractedDefinitions).length > 0) {
        resolvedSchema.definitions = {
            ...resolvedSchema.definitions,
            ...extractedDefinitions
        };
    }

    return resolvedSchema;
}

/**
 * Prefix all definition keys in a schema to avoid conflicts.
 *
 * @param schema - The schema to process
 * @param prefix - The prefix to add to each definition key
 * @returns The schema with prefixed definition keys
 */
function prefixDefinitions(schema: Schema, prefix: string): Schema {
    if (!schema.definitions) {
        return schema;
    }

    const prefixedDefinitions: SchemaDefinition = {};
    const definitionMap: { [oldKey: string]: string } = {};

    // Create mapping of old keys to new keys
    for (const key in schema.definitions) {
        const newKey = `${prefix}_${key}`;
        definitionMap[key] = newKey;
        prefixedDefinitions[newKey] = schema.definitions[key];
    }

    // Update all $ref references in the schema
    const updateRefValue = (ref: string): string => {
        if (!ref.startsWith('#/definitions/')) {
            return ref;
        }

        const defName = ref.substring('#/definitions/'.length);
        return definitionMap[defName] ? `#/definitions/${definitionMap[defName]}` : ref;
    };

    const updateRefs = (obj: unknown): unknown => {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(updateRefs);
        }

        const result: Record<string, unknown> = {};
        for (const key in obj as Record<string, unknown>) {
            if (key === '$ref' && typeof (obj as Record<string, unknown>)[key] === 'string') {
                result[key] = updateRefValue((obj as Record<string, unknown>)[key] as string);
            } else {
                result[key] = updateRefs((obj as Record<string, unknown>)[key]);
            }
        }
        return result;
    };

    const updatedSchema = updateRefs(schema) as Schema;
    const updatedDefinitions = updateRefs(prefixedDefinitions) as SchemaDefinition;

    return {
        ...updatedSchema,
        definitions: updatedDefinitions
    };
}

/**
 * Update $ref paths to use prefixed definitions.
 *
 * @param obj - The object to process
 * @param prefix - The prefix to add to definition references
 * @returns The object with updated references
 */
function updateRefsToPrefix(obj: unknown, prefix: string): unknown {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => updateRefsToPrefix(item, prefix));
    }

    const result: Record<string, unknown> = {};
    for (const key in obj as Record<string, unknown>) {
        if (key === '$ref' && typeof (obj as Record<string, unknown>)[key] === 'string') {
            const ref = (obj as Record<string, unknown>)[key] as string;
            if (ref.startsWith('#/definitions/')) {
                const defName = ref.substring('#/definitions/'.length);
                result[key] = `#/definitions/${prefix}_${defName}`;
            } else {
                result[key] = ref;
            }
        } else {
            result[key] = updateRefsToPrefix((obj as Record<string, unknown>)[key], prefix);
        }
    }
    return result;
}

/**
 * Build configuration schema by removing $schema and definitions from root level.
 *
 * @param schema - The schema to process
 * @returns The configuration schema
 */
function buildConfigSchema(schema: Schema): Record<string, unknown> {
    const configSchema: Record<string, unknown> = {};
    for (const key in schema) {
        if (key !== '$schema' && key !== 'definitions') {
            configSchema[key] = schema[key];
        }
    }
    return configSchema;
}

/**
 * Process a middleware mapping and return the condition.
 *
 * @param mapping - The middleware mapping configuration
 * @param schemaDir - Directory containing schema files
 * @param processedSchemas - Set of already processed schema files
 * @param loadedSchemas - Cache of loaded schemas
 * @param allDefinitions - Accumulated schema definitions
 * @param verbose - Whether to log verbose output
 * @returns The middleware condition for this mapping
 */
function processMiddlewareMapping(
    mapping: MiddlewareSchemaMapping,
    schemaDir: string,
    processedSchemas: Set<string>,
    loadedSchemas: Map<string, Schema>,
    allDefinitions: SchemaDefinition,
    verbose: boolean
): MiddlewareCondition {
    if (verbose) {
        console.log(`Processing ${mapping.middlewareName} (${mapping.schemaFileName})...`);
    }

    const prefix = mapping.schemaFileName.replace('-schema.json', '').replaceAll('-', '_');
    let schema: Schema;

    schema = loadSchema(schemaDir, mapping.schemaFileName);
    schema = resolveExternalRefs(schema, schemaDir, loadedSchemas, prefix);

    if (processedSchemas.has(mapping.schemaFileName)) {
        // Schema already processed, skip adding definitions again
    } else {
        const prefixedSchema = prefixDefinitions(schema, prefix);

        if (prefixedSchema.definitions) {
            Object.assign(allDefinitions, prefixedSchema.definitions);
        }

        processedSchemas.add(mapping.schemaFileName);
    }

    const configSchema = buildConfigSchema(schema);
    const updatedConfigSchema = updateRefsToPrefix(configSchema, prefix);

    return {
        if: {
            properties: {
                name: {
                    const: mapping.middlewareName
                }
            }
        },
        then: {
            properties: {
                configuration: updatedConfigSchema
            }
        }
    };
}

/**
 * Merge all middleware schemas into the main ux-ui5-tooling-schema.json.
 *
 * @param schemaDir - Directory where the individual middleware schemas are located
 * @param verbose - Whether to log detailed information during the merge process (default: true)
 */
export function mergeSchemas(schemaDir: string, verbose: boolean = true): void {
    if (verbose) {
        console.log('\n=== Merging Middleware Schemas ===');
    }

    const mappings = getMiddlewareMappings();
    const allDefinitions: SchemaDefinition = {};
    const middlewareConditions: MiddlewareCondition[] = [];
    const processedSchemas = new Set<string>();
    const loadedSchemas = new Map<string, Schema>();

    for (const mapping of mappings) {
        const condition = processMiddlewareMapping(
            mapping,
            schemaDir,
            processedSchemas,
            loadedSchemas,
            allDefinitions,
            verbose
        );
        middlewareConditions.push(condition);
    }

    // Create the merged schema
    const mergedSchema = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        allOf: [
            {
                $ref: 'https://raw.githubusercontent.com/SAP/ui5-tooling/gh-pages/schema/ui5.yaml.json'
            },
            {
                properties: {
                    server: {
                        properties: {
                            customMiddleware: {
                                type: 'array',
                                items: {
                                    allOf: middlewareConditions
                                }
                            }
                        }
                    }
                },
                definitions: allDefinitions
            }
        ]
    };

    // Write the merged schema
    const outputPath = join(schemaDir, 'ux-ui5-tooling-schema.json');
    writeFileSync(outputPath, JSON.stringify(mergedSchema, null, 4));

    if (verbose) {
        console.log(`\n✓ Merged schema written to ux-ui5-tooling-schema.json`);
        console.log(`  Total definitions: ${Object.keys(allDefinitions).length}`);
        console.log(`  Middleware configurations: ${middlewareConditions.length}`);
    }
}

/**
 * CLI entry point for merging schemas.
 *
 * @param baseDir - Base directory to resolve the schema directory from (defaults to current working directory)
 */
export function runCli(baseDir: string = process.cwd()): void {
    const schemaDir = join(baseDir, 'schema');
    mergeSchemas(schemaDir, true);
    console.log('\n✓ Schema merge completed successfully!');
}

// Run CLI if this file is executed directly
if (require.main === module) {
    runCli(__dirname.replace(/[/\\]src$/, ''));
}
