import run from './storybook.js';

/**
 * Usage through command line
 */
run(process.argv).catch((e) => console.error(e.message));
