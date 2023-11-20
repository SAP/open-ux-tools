import Control from 'sap/ui/core/Control';

export const getContentMock = jest.fn();

export default class Popover{

    constructor() {

    }

    static getContent() {
        return getContentMock()
    }

    openBy(_oControl: Control | HTMLElement) {

    }

};
