const fs = require('fs');
const { join } = require('path');

const StorybookFiles = {
    StorybookFolder: '.storybook',
    StylesFolder: 'static',
    ManagerFile: 'manager-head.html',
    PreviewFile: 'preview-head.html'
};

const SourceDir = join(__dirname, '..', '..', '..', 'packages', 'ui-components', StorybookFiles.StorybookFolder);
const TargetDir = join(__dirname, '..', StorybookFiles.StorybookFolder);

const CmdParams = {
    // Overwrite existing files
    overwrite: '--overwrite'
};

/**
 * Function to copy passed files from surce to target directory.
 * @param {string[]} files Files to copy.
 * @param {string} source Source directoy.
 * @param {string} target Target directoy.
 * @param {boolean} overwrite Overwrite files if files already exists in target.
 */
function copyFiles(files, source, target, overwrite) {
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
async function run(argv) {
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

module.exports = run;
