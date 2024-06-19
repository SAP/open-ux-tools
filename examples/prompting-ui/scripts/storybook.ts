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

/**
 * Function to copy passed files from surce to target directory.
 * @param files Files to copy.
 * @param source Source directoy.
 * @param target Target directoy.
 * @param overwrite Overwrite files if files already exists in target.
 */
function copyFiles(files: string[], source: string, target: string, overwrite: boolean): void {
    for (const file of files) {
        const styleFile = {
            source: join(source, file),
            target: join(target, file)
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
    copyFiles(styleFiles, styleFolder.source, styleFolder.target, overwrite);
    // Handle html files
    copyFiles([StorybookFiles.ManagerFile, StorybookFiles.PreviewFile], SourceDir, TargetDir, overwrite);
}
