export interface PostMessageCommunication<T> {
    sendAction: (action: T) => void;

    dispose: () => void;
}

const POST_MESSAGE_ACTION_TYPE = 'post-message-action';

interface PostMessageAction<T> {
    type: typeof POST_MESSAGE_ACTION_TYPE;
    action: T;
}

/**
 * Check if data isPostMessageAction.
 *
 * @param data - post message action
 * @returns data is PostMessageAction<T>
 */
function isPostMessageAction<T>(data: PostMessageAction<T> | undefined): data is PostMessageAction<T> {
    return data?.type === POST_MESSAGE_ACTION_TYPE && typeof data?.action === 'object';
}

/**
 * Method to start post message communication.
 *
 * @param target target window
 * @param onActionHandler action handler
 * @returns PostMessageCommunication<T>
 */
export function startPostMessageCommunication<T>(
    target: Window | (() => Window | undefined) | undefined,
    onActionHandler: (action: T) => void
): PostMessageCommunication<T> {
    /**
     * Returns target windows or undefined.
     *
     * @returns Window | undefined
     */
    function getTarget(): Window | undefined {
        if (typeof target === 'function') {
            return target();
        }
        return target;
    }

    /**
     * Invoke action on post message.
     *
     * @param event event
     */
    function postMessageListener(event: MessageEvent): void {
        const target = getTarget();
        if (!target || event.origin !== target.origin || event.source !== target) {
            // Ignore messages from unknown sources
            return;
        }
        if (isPostMessageAction<T>(event.data)) {
            onActionHandler(event.data.action);
        } else {
            console.warn(`Unknown message received`, event.data);
        }
    }

    function dispose(): void {
        window.removeEventListener('message', postMessageListener);
    }

    /**
     * Post message to a give window.
     *
     * @param action action payload
     */
    function sendAction(action: T): void {
        const target = getTarget();
        if (!target) {
            return;
        }
        const message: PostMessageAction<T> = {
            type: POST_MESSAGE_ACTION_TYPE,
            action
        };
        target.postMessage(message, target.origin);
    }

    window.addEventListener('message', postMessageListener);

    return {
        dispose,
        sendAction
    };
}
