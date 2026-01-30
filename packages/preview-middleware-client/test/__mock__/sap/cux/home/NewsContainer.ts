export default class NewsContainerMock {
    constructor(id?: string, settings?: { content?: unknown[] }) {}

    addStyleClass(className: string) {
        return this;
    }
}
