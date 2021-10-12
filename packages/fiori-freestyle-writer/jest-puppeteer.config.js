const testDir = `./test/`;
const testOutputDir = `unit/test-output/`;
const fioriBin = './../../../../../node_modules/@sap/ux-ui5-tooling/dist/cli/index.js';
const { apps } = require('./test/integration/servers');
const servers = [];

apps.forEach((app) => {
    servers.push({
        command: `cd ${testDir}${testOutputDir}${app.dir} && node ${fioriBin} run -c ${app.yamlFile} --port=${app.port}`,
        port: app.port,
        launchTimeout: 200000,
        debug: true,
        usedPortAction: 'kill',
        cwd: `./../${testOutputDir}${app.dir}`
    });
});
// Start the servers here for each App * yaml file
module.exports = {
    server: servers,
    launch: {
        headless: true
    }
};
