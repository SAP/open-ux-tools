/**
 * Extracts a message from the provided function and adds it to an array of messages.
 *
 * @param msg message object contain function and array of messages.
 * @param msg.getMessage an optional function that returns the message to be extracted.
 * @param msg.messages an array containing existing messages to which the extracted message will be added.
 */
export function extractMessage({ getMessage, messages }: { getMessage?: () => string; messages: string[] }): void {
    const message = getMessage?.();
    if (message) {
        messages.push(message);
    }
}
