import messages from './messages.json';

export function t(msg: keyof typeof messages, ...args: unknown[]) {
    return new Function('p', 'return `' + messages[msg] + '`;')(args);
}
