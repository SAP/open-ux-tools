import chalk from 'chalk';
import figures from 'figures';

/**
 * Separator object. This is a copy of `inquirer@8.2.6` Separator class. Since this is the only implementation needed
 * from `inquirer` we have implemented our own to avoid a heavy dependency.
 *
 * Used to space/separate choices group
 *
 * @class
 * @param {string} line   Separation line content (facultative)
 */
export class Separator {
    type: string;
    line: string;
    /**
     * Create a Separator instance.
     *
     * @param line the separator line
     */
    constructor(line: string) {
        this.type = 'separator';
        this.line = chalk.dim(line || new Array(15).join(figures.line));
    }

    /**
     * Stringify separator.
     *
     * @returns {string} the separator display string
     */
    toString(): string {
        return this.line;
    }
    /**
     * Helper function returning false if object is a separator.
     *
     * @param  {object} obj object to test against
     * @param obj.type the object type
     * @returns {boolean} `false` if object is a separator
     */
    public static exclude(obj: { type: string }): boolean {
        return obj.type !== 'separator';
    }
}
