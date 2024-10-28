export default class Change {
    constructor(private change: {selector: object, changeType: string, layer: string}) {
    }

    getSelector() {
        return this.change.selector;
    }

    getChangeType() {
        return this.change.changeType;
    }

    getLayer() {
        return this.change.layer;
    }

    getDefinition() {
        return;
    }
}