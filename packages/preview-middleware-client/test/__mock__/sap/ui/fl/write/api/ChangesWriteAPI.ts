export default class ChangesWriteAPI {
    static getChangeHandler = jest.fn().mockReturnValue({
        getChangeVisualizationInfo: jest.fn().mockImplementation((change) => {
            return Promise.resolve({
                affectedControls: [
                    `appComponent${change.getSelector().id}`
                ]
            });
        })
    });
}