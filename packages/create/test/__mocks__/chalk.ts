// ESM shim for chalk 4.x - re-exports CJS chalk with named ESM exports
// This works around the fact that CJS chalk doesn't expose named exports in ESM mode
const chalkModule = await import('../../node_modules/chalk/source/index.js');
const chalk = chalkModule.default;

// Force chalk to use color level 1 (basic ANSI colors) for consistent test output
if (chalk && typeof chalk.level !== 'undefined') {
    chalk.level = 1;
}

export default chalk;
export const green = chalk.green.bind(chalk);
export const grey = chalk.grey.bind(chalk);
export const red = chalk.red.bind(chalk);
export const blue = chalk.blue.bind(chalk);
export const yellow = chalk.yellow.bind(chalk);
export const cyan = chalk.cyan.bind(chalk);
export const magenta = chalk.magenta.bind(chalk);
export const white = chalk.white.bind(chalk);
export const black = chalk.black.bind(chalk);
export const bold = chalk.bold.bind(chalk);
export const dim = chalk.dim.bind(chalk);
export const italic = chalk.italic.bind(chalk);
export const underline = chalk.underline.bind(chalk);
export const inverse = chalk.inverse.bind(chalk);
export const hidden = chalk.hidden.bind(chalk);
export const strikethrough = chalk.strikethrough.bind(chalk);
export const visible = chalk.visible.bind(chalk);
export const reset = chalk.reset.bind(chalk);
export const bgRed = chalk.bgRed.bind(chalk);
export const bgGreen = chalk.bgGreen.bind(chalk);
export const bgBlue = chalk.bgBlue.bind(chalk);
export const bgYellow = chalk.bgYellow.bind(chalk);
export const bgCyan = chalk.bgCyan.bind(chalk);
export const bgMagenta = chalk.bgMagenta.bind(chalk);
export const bgWhite = chalk.bgWhite.bind(chalk);
export const bgBlack = chalk.bgBlack.bind(chalk);
