import fs from 'fs';
import { join } from 'path';

const StorybookFiles = {
    StorybookFolder: '.storybook',
    StylesFolder: 'static',
    ManagerFile: 'manager-head.html',
    PreviewFile: 'preview-head.html'
} as const;

const SourceDir = join(__dirname, '..', '..', '..', 'packages', 'ui-components', StorybookFiles.StorybookFolder);
const TargetDir = join(__dirname, '..', StorybookFiles.StorybookFolder);

const CmdParams = {
    // Overwrite existing files
    overwrite: '--overwrite'
};

interface FilePaths {
    source: string;
    target: string;
}

function copyFiles(files: string[], paths: FilePaths, overwrite = false): void {
    for (const file of files) {
        const styleFile = {
            source: join(paths.source, file),
            target: join(paths.target, file)
        };
        if (!fs.existsSync(styleFile.target) || overwrite) {
            fs.copyFileSync(styleFile.source, styleFile.target);
        }
    }
}

/**
 * Run command to generate macros generic schema by resolving "sap.fe.macros" api.json.
 * @param {string[]} argv Additional arguments for API retrieval and schema generation. Currently we support '--nightly' and '--update'.
 */
export async function run(argv: string[]): Promise<void> {
    const overwrite = argv.includes(CmdParams.overwrite);
    // Handle/copy styles
    const styleFolder = {
        source: join(SourceDir, StorybookFiles.StylesFolder),
        target: join(TargetDir, StorybookFiles.StylesFolder)
    };
    if (!fs.existsSync(styleFolder.target)) {
        fs.mkdirSync(styleFolder.target);
    }
    const styleFiles = await fs.readdirSync(styleFolder.source);
    copyFiles(
        styleFiles,
        {
            source: styleFolder.source,
            target: styleFolder.target
        },
        overwrite
    );
    // Handle html files
    copyFiles(
        [StorybookFiles.ManagerFile, StorybookFiles.PreviewFile],
        {
            source: SourceDir,
            target: TargetDir
        },
        overwrite
    );
}

/**
 * Usage through command line
 */
run(process.argv).catch((e) => console.error(e.message));
