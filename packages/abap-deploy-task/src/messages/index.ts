import messages from './messages.json';

/**
 *
 * @param msg
 * @param {...any} args
 * @returns
 */
export function t(msg: keyof typeof messages, args?: { [key: string]: unknown }): string {
    if (args) {
        // eslint-disable-next-line no-new-func
        return new Function(...Object.keys(args), 'return `' + messages[msg] + '`;')(...Object.values(args));
    } else {
        // eslint-disable-next-line no-new-func
        return new Function('return `' + messages[msg] + '`;')();
    }
}
