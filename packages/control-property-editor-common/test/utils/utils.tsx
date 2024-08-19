declare global {
    interface Window {
        ResizeObserver: any;
        resizeobserversMocks: Array<any>;
    }
}

export const mockResizeObserver = (): void => {
    window.resizeobserversMocks = [];
    window.ResizeObserver = jest.fn((callback: () => void) => {
        const resizeObserver = {
            observe: jest.fn(),
            unobserve: jest.fn(),
            disconnect: () => {
                const index = window.resizeobserversMocks.indexOf(resizeObserver);
                window.resizeobserversMocks.splice(index, 1);
            },
            simulate: () => {
                callback();
            }
        };
        window.resizeobserversMocks.push(resizeObserver);
        return resizeObserver;
    });
};
