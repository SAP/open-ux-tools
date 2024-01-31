export function extractMessage({ getMessage, messages }: { getMessage?: () => string; messages: string[] }): void {
    const message = getMessage && getMessage();
    if (message) {
        messages.push(message);
    }
}
