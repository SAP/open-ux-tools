const TJS = require('typescript-json-schema');
const fs = require('fs');
const path = require('path');

const settings = {
    required: false,
    noExtraProps: false,
    skipLibCheck: true
};

const compilerOptions = {
    strictNullChecks: true,
    esModuleInterop: true,
    skipLibCheck: true,
    moduleResolution: 'node',
    resolveJsonModule: true
};

// Resolve paths relative to the project root
const projectRoot = path.resolve(__dirname, '../../..');
const typesPath = path.join(projectRoot, 'packages/preview-middleware/src/types/index.ts');
const outputPath = path.join(__dirname, '..', 'middleware-config-schema.json');

console.log('Generating schema from:', typesPath);
console.log('Output path:', outputPath);

const program = TJS.getProgramFromFiles([typesPath], compilerOptions);

const schema = TJS.generateSchema(program, 'MiddlewareConfig', settings);

if (!schema) {
    console.error('Failed to generate schema for MiddlewareConfig');
    process.exit(1);
}

// Write to file for use in the YAML schema
fs.writeFileSync(outputPath, JSON.stringify(schema, null, 2));
console.log('Schema generated successfully!');
