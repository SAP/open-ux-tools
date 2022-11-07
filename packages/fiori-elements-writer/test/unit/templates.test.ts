import { readFileSync } from 'fs';
import { join } from 'path';

const templateDir = join(__dirname, '../../templates/v2/common/add/webapp/test');
const templateFiles = [
    join(templateDir, 'changes_loader.js'),
    join(templateDir, 'changes_loader.ts'),
    join(templateDir, 'changes_preview.js'),
    join(templateDir, 'changes_preview.ts')
];

const expectedTrustedHosts = [
    `/^localhost$/`,
    `/^((?!-)[A-Za-z0-9-]{1,63}(?<!-)\\.)+applicationstudio\\.cloud\\.sap$/`,
    `/^((?!-)[A-Za-z0-9-]{1,63}(?<!-)\\.)+applicationstudio\\.sapcloud\\.cn$/`,
    `/^((?!-)[A-Za-z0-9-]{1,63}(?<!-)\\.)+applicationstudio\\.vlab-sapcloudplatformdev\\.cn$/`
];

describe(`Test trusted hosts is consistent across all files`, () => {
    test.each(templateFiles)(`test file %#`, (file) => {
        const content = readFileSync(file, 'utf8');
        expect(content).toMatch(expectedTrustedHosts[0]);
        expect(content).toMatch(expectedTrustedHosts[1]);
        expect(content).toMatch(expectedTrustedHosts[2]);
        expect(content).toMatch(expectedTrustedHosts[3]);
    });
});
