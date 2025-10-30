/**
 * @file Calls the template generator with the flag for generating multiple files set to true.
 */

import { generateTemplate } from './template-generator';

export = function (results: any) {
    return generateTemplate(results, true);
};
