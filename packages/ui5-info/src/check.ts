import { getSapSystemUI5Version, getLatestSapui5Version } from '.';

getLatestSapui5Version().then(console.log).catch(console.error);
// getSapSystemUI5Version('http://ccwdfgl9773.devint.net.sap:50000').then(console.log).catch(console.error);
