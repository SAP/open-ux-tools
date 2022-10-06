export type StringMap = { [key: string]: any };

/**
 * Perform string interpolation on the given template string.
 *
 * @param {string} template - template string
 * @param {StringMap} [options] - a list of options for translation interpolation
 * @returns {string} the interpolated string
 * @example
 * text('Hi {{name}}, today is {{day}}.', {name: 'Jon', day: 'Jan 1, 1970'});
 * // Returns 'Hi Jon, today is Jan 1, 1970.'
 */
export function interpolate(template: string, options?: StringMap): string {
    return !options
        ? template
        : template.replace(/{{-?([^{}]*)}}/g, (match, captureGroup1) => {
              const key = captureGroup1?.trim();
              // Use replacement only if it can be converted to a string
              return options[key]?.toString() || match;
          });
}

export { texts } from './texts';
