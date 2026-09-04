'use strict';

/* eslint-disable @typescript-eslint/no-require-imports -- CAP discovers and loads cds-plugin.js through CommonJS. */

const cds = require('@sap/cds');
const { registerCapPlugin } = require('./dist/index.js');

registerCapPlugin(cds);
