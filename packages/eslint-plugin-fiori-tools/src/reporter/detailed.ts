/**
 * @file Calls the template generator with the flag for generating multiple files set to false.
 * @author Marcelo S. Portugal <marceloquarion@gmail.com>
 */

import { generateTemplate } from './template-generator';

export = function (results: any): string {
    return generateTemplate(results, false);
};
