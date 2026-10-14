#!/usr/bin/env node

import { installSkills } from './install';

const args = process.argv.slice(2);
const targetPath = args[0];

installSkills(targetPath).catch((error: Error) => {
    process.stderr.write(`Error: ${error.message}\n`);
    process.exit(1);
});
