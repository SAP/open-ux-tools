const run = require('./storybook');

/**
 * Usage through command line
 */
run(process.argv).catch((e) => console.error(e.message));
