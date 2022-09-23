import messages from './messages.json';

type InfoMessage = keyof typeof messages.info;
type ErrorMessage = keyof typeof messages.error;

function t(literal: string, args: unknown[]) {
    return new Function('p', 'return `' + literal + '`;')(args);
}

export function info(msg: InfoMessage, ...args: unknown[]) {
    return t(messages.info[msg], args);
}

export function error(msg: ErrorMessage, ...args: unknown[]) {
    return t(messages.error[msg], args);
}
