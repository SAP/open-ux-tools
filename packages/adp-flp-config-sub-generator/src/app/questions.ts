const tileActions = {
    REPLACE: 'replace',
    ADD: 'add'
};

export function getTileQuestions() {
    return [
        {
            type: 'list',
            name: 'tileHandlingAction',
            message: 'Chose a Tile Handling Action',
            choices: [
                { name: `Replace Original App's Tile(s)`, value: tileActions.REPLACE },
                { name: 'Add a New Tile to The Original One', value: tileActions.ADD }
            ],
            store: false,
            guiOptions: {
                mandatory: true
            }
        },
        {
            type: 'confirm',
            name: 'copyFromExisting',
            message: 'Copy Configurations From an Existing Inbound (?)',
            default: false,
            when: (answers: any): boolean => answers.tileHandlingAction === tileActions.ADD
        }
    ];
}
