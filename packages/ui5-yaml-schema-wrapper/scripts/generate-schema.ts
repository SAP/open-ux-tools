import * as TJS from 'typescript-json-schema';
import { writeFileSync } from 'fs';
import { resolve, join } from 'path';

const settings: TJS.PartialArgs = {
    required: false,
    noExtraProps: true,
    skipLibCheck: true,
    ignoreErrors: true
};

const compilerOptions = {
    strictNullChecks: true,
    esModuleInterop: true,
    skipLibCheck: true,
    moduleResolution: 'node' as any,
    resolveJsonModule: true
};

// Resolve paths relative to the project root
const projectRoot = resolve(__dirname, '../../..');
const typesPath = join(projectRoot, 'packages/preview-middleware/src/types/index.ts');
const outputPath = join(__dirname, '..', 'schema', 'middleware-config-schema.json');

console.log('Generating schema from:', typesPath);
console.log('Output path:', outputPath);

try {
    const program = TJS.getProgramFromFiles([typesPath], compilerOptions);
    const schema = TJS.generateSchema(program, 'MiddlewareConfig', settings);

    if (!schema) {
        console.error('Failed to generate schema for MiddlewareConfig');
        process.exit(1);
    }

    // Write to file for use in the YAML schema
    writeFileSync(outputPath, JSON.stringify(schema, null, 2));
    console.log('Schema generated successfully!');
} catch (error) {
    console.error('Error generating schema:', error);
    process.exit(1);
}

