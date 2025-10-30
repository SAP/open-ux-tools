/**
 * @file Calls the template generator with the flag for generating multiple files set to false.
 * @author Marcelo S. Portugal <marceloquarion@gmail.com>
 */

import { generateTemplate } from './template-generator';

export = function (results: any) {
    return generateTemplate(results, false);
};
