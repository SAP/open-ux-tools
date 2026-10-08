#!/usr/bin/env node
// Copyright (c) SAP SE. All rights reserved.
// Licensed under the Apache License, Version 2.0.
//
// Validates all skills/*/SKILL.md files using @microsoft/vally graders.
// Runs skill-size (token limit) and valid-refs (file references) checks.
// Exits with code 1 if any grader fails.

import { readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = resolve(__dirname, '../skills');

// Resolve vally from this package's node_modules — use pathToFileURL to bypass the
// package's exports map, which does not expose the skill grader subpaths.
const vallyBase = resolve(__dirname, '../node_modules/@microsoft/vally/dist');
const { SkillSizeGrader } = await import(pathToFileURL(`${vallyBase}/skill/graders/skill-size.js`).href);
const { ValidRefsGrader } = await import(pathToFileURL(`${vallyBase}/skill/graders/valid-refs.js`).href);

const entries = await readdir(SKILLS_DIR, { withFileTypes: true });
const skillPaths = entries
    .filter((e) => e.isDirectory())
    .map((e) => resolve(SKILLS_DIR, e.name, 'SKILL.md'));

if (skillPaths.length === 0) {
    console.log('No SKILL.md files found — nothing to lint.');
    process.exit(0);
}

const graderInput = {
    stimulus: { environment: { skills: skillPaths } },
    config: { model: 'claude-sonnet-4-6' }
};

const sizeGrader = new SkillSizeGrader();
const refsGrader = new ValidRefsGrader();

const [sizeResult, refsResult] = await Promise.all([
    sizeGrader.grade(graderInput),
    refsGrader.grade(graderInput)
]);

let failed = false;

for (const result of [sizeResult, refsResult]) {
    if (result.passed) {
        console.log(`✅ ${result.name}: ${result.evidence}`);
    } else {
        console.error(`❌ ${result.name}: ${result.evidence}`);
        if (Array.isArray(result.details)) {
            for (const detail of result.details) {
                if (!detail.passed) {
                    console.error(`   ${detail.evidence}`);
                    if (Array.isArray(detail.details)) {
                        for (const sub of detail.details) {
                            console.error(`     - ${sub.raw ?? sub.reason ?? JSON.stringify(sub)}`);
                        }
                    }
                }
            }
        }
        failed = true;
    }
}

if (failed) {
    process.exit(1);
}
