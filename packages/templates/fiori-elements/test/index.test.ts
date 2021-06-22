import { generate } from '../src';
import { v2LropTestData, v4LropTestData, v2OvpTestData } from './fixture';
import { join } from 'path';
import { tmpdir } from 'os';
import { rmdirSync } from 'fs';

describe('Fiori elements templates', () => {
    const debug = process.env[ 'UX_DEBUG' ];
    const outputDir = join(tmpdir(), '/templates/fiori-elements-test');
    if (debug) console.log(outputDir);

    afterEach(() => {
        if (!debug) rmdirSync(outputDir, { recursive: true });
    });

    it('generate V2 LROP files correctly', async () => {
        const v2LropOutput = join(outputDir, 'v2-lrop');
        const fsEditor = await generate(v2LropOutput, v2LropTestData);
        if (debug) fsEditor.commit(() => 0);
        expect((fsEditor as any).dump(v2LropOutput)).toMatchSnapshot();
    });

    it('generate V4 LROP files correctly', async () => {
        const v4LropOutput = join(outputDir, 'v4-lrop');
        const fsEditor = await generate(v4LropOutput, v4LropTestData);
        if (debug) fsEditor.commit(() => 0);
        expect((fsEditor as any).dump(v4LropOutput)).toMatchSnapshot();
    });

    it('generate V2 OVP files correctly', async () => {
        const v2OvpOutput = join(outputDir, 'v2-ovp');
        const fsEditor = await generate(v2OvpOutput, v2OvpTestData);
        if (debug) fsEditor.commit(() => 0);
        expect((fsEditor as any).dump(v2OvpOutput)).toMatchSnapshot();
    });
});
