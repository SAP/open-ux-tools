import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Merge all individual middleware schemas into the main ux-ui5-tooling-schema.json
 */

interface SchemaDefinition {
    [key: string]: any;
}

interface Schema {
    $schema?: string;
    description?: string;
    type?: string;
    properties?: any;
    definitions?: SchemaDefinition;
    additionalProperties?: boolean;
    [key: string]: any;
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
 * Get the list of middleware schemas to merge
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
 * Load a schema file from the schema directory
 */
function loadSchema(schemaDir: string, fileName: string): Schema {
    const filePath = join(schemaDir, fileName);
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
}

/**
 * Resolve external file references in a schema by extracting definitions and converting to internal refs
 */
function resolveExternalRefs(schema: Schema, schemaDir: string, loadedSchemas: Map<string, Schema>, prefix: string): Schema {
    const extractedDefinitions: SchemaDefinition = {};
    const extractedKeys = new Set<string>();

    // Helper to extract a definition and all its dependencies
    const extractDefinition = (refSchema: Schema, defName: string, refSchemaPrefix: string): string => {
        const newDefName = `${prefix}_${refSchemaPrefix}_${defName}`;

        // If already extracted, return the name
        if (extractedKeys.has(newDefName)) {
            return newDefName;
        }

        if (refSchema.definitions && refSchema.definitions[defName]) {
            extractedKeys.add(newDefName);
            const defValue = JSON.parse(JSON.stringify(refSchema.definitions[defName])); // Deep clone

            // Process the definition to extract any dependencies
            const processedDef = extractDependentDefs(defValue, refSchema, refSchemaPrefix);
            extractedDefinitions[newDefName] = processedDef;

            return newDefName;
        }

        return newDefName;
    };

    // Helper to find and extract dependent definitions
    const extractDependentDefs = (obj: any, refSchema: Schema, refSchemaPrefix: string): any => {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => extractDependentDefs(item, refSchema, refSchemaPrefix));
        }

        const result: any = {};
        for (const key in obj) {
            if (key === '$ref' && typeof obj[key] === 'string') {
                const ref = obj[key];
                // Check if it's an internal reference to the same schema
                if (ref.startsWith('#/definitions/')) {
                    const depDefName = ref.substring('#/definitions/'.length);
                    const newDepDefName = extractDefinition(refSchema, depDefName, refSchemaPrefix);
                    result[key] = `#/definitions/${newDepDefName}`;
                } else {
                    result[key] = ref;
                }
            } else {
                result[key] = extractDependentDefs(obj[key], refSchema, refSchemaPrefix);
            }
        }
        return result;
    };

    const resolveRefs = (obj: any): any => {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(resolveRefs);
        }

        const result: any = {};
        for (const key in obj) {
            if (key === '$ref' && typeof obj[key] === 'string') {
                const ref = obj[key];
                // Check if it's an external file reference
                if (ref.includes('.json#')) {
                    const [fileName, jsonPath] = ref.split('#');

                    // Load the referenced schema if not already loaded
                    if (!loadedSchemas.has(fileName)) {
                        loadedSchemas.set(fileName, loadSchema(schemaDir, fileName));
                    }

                    const refSchema = loadedSchemas.get(fileName)!;
                    const refSchemaPrefix = fileName.replace('-schema.json', '').replace(/-/g, '_');

                    // Resolve the JSON path
                    if (jsonPath.startsWith('/definitions/')) {
                        const defName = jsonPath.substring('/definitions/'.length);
                        const newDefName = extractDefinition(refSchema, defName, refSchemaPrefix);
                        result[key] = `#/definitions/${newDefName}`;
                        continue;
                    } else if (jsonPath.startsWith('/properties/')) {
                        const propName = jsonPath.substring('/properties/'.length);
                        if (refSchema.properties && refSchema.properties[propName]) {
                            // Process the property to extract dependent definitions
                            const propSchema = JSON.parse(JSON.stringify(refSchema.properties[propName]));
                            const processedProp = extractDependentDefs(propSchema, refSchema, refSchemaPrefix);

                            // Inline the processed property schema
                            delete result[key];
                            Object.assign(result, processedProp);
                            continue;
                        }
                    }
                }
                result[key] = ref;
            } else {
                result[key] = resolveRefs(obj[key]);
            }
        }
        return result;
    };

    const resolvedSchema = resolveRefs(schema);

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
 * Prefix all definition keys in a schema to avoid conflicts
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
    const updateRefs = (obj: any): any => {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(updateRefs);
        }

        const result: any = {};
        for (const key in obj) {
            if (key === '$ref' && typeof obj[key] === 'string') {
                const ref = obj[key];
                // Only update internal references (starting with #/definitions/)
                if (ref.startsWith('#/definitions/')) {
                    const defName = ref.substring('#/definitions/'.length);
                    if (definitionMap[defName]) {
                        result[key] = `#/definitions/${definitionMap[defName]}`;
                    } else {
                        result[key] = ref;
                    }
                } else {
                    result[key] = ref;
                }
            } else {
                result[key] = updateRefs(obj[key]);
            }
        }
        return result;
    };

    return {
        ...updateRefs(schema),
        definitions: updateRefs(prefixedDefinitions)
    };
}

/**
 * Merge all middleware schemas into the main ux-ui5-tooling-schema.json
 */
export function mergeSchemas(schemaDir: string, verbose: boolean = true): void {
    if (verbose) {
        console.log('\n=== Merging Middleware Schemas ===');
    }

    const mappings = getMiddlewareMappings();
    const allDefinitions: SchemaDefinition = {};
    const middlewareConditions: any[] = [];

    // Track which schemas we've already processed to avoid duplicates
    const processedSchemas = new Set<string>();

    // Cache for loaded schemas to avoid reloading
    const loadedSchemas = new Map<string, Schema>();

    for (const mapping of mappings) {
        if (verbose) {
            console.log(`Processing ${mapping.middlewareName} (${mapping.schemaFileName})...`);
        }

        // Load and prefix the schema only if we haven't processed this file before
        let schema: Schema;
        const prefix = mapping.schemaFileName.replace('-schema.json', '').replace(/-/g, '_');

        if (!processedSchemas.has(mapping.schemaFileName)) {
            schema = loadSchema(schemaDir, mapping.schemaFileName);

            // Resolve any external file references first
            schema = resolveExternalRefs(schema, schemaDir, loadedSchemas, prefix);

            const prefixedSchema = prefixDefinitions(schema, prefix);

            // Merge definitions
            if (prefixedSchema.definitions) {
                Object.assign(allDefinitions, prefixedSchema.definitions);
            }

            processedSchemas.add(mapping.schemaFileName);
        } else {
            // Schema already processed, just load it to get the root structure
            schema = loadSchema(schemaDir, mapping.schemaFileName);
            // Resolve external refs for the config structure
            schema = resolveExternalRefs(schema, schemaDir, loadedSchemas, prefix);
        }

        // Build the configuration schema
        // Remove the $schema and definitions from root level, keep only structure
        const configSchema: any = {};
        for (const key in schema) {
            if (key !== '$schema' && key !== 'definitions') {
                configSchema[key] = schema[key];
            }
        }

        // Update $ref paths to use prefixed definitions
        const updateRefsToPrefix = (obj: any, prefix: string): any => {
            if (obj === null || typeof obj !== 'object') {
                return obj;
            }

            if (Array.isArray(obj)) {
                return obj.map((item) => updateRefsToPrefix(item, prefix));
            }

            const result: any = {};
            for (const key in obj) {
                if (key === '$ref' && typeof obj[key] === 'string') {
                    const ref = obj[key];
                    if (ref.startsWith('#/definitions/')) {
                        const defName = ref.substring('#/definitions/'.length);
                        result[key] = `#/definitions/${prefix}_${defName}`;
                    } else {
                        result[key] = ref;
                    }
                } else {
                    result[key] = updateRefsToPrefix(obj[key], prefix);
                }
            }
            return result;
        };

        const updatedConfigSchema = updateRefsToPrefix(configSchema, prefix);

        // Create condition for this middleware - INLINE the configuration schema
        const condition: any = {
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
 * CLI entry point for merging schemas
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

