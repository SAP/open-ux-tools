import { destinationQuestionDefaultOption } from '../../src/app/utils';
import { DESTINATION_CHOICE_DIRECT_SERVICE_BINDING, DESTINATION_CHOICE_NONE } from '../../src/utils';

describe('test utils', () => {
    it('should return correct default destination', () => {
        let defaultDestination = destinationQuestionDefaultOption(true, true, 'test');
        expect(defaultDestination).toBe('test');

        defaultDestination = destinationQuestionDefaultOption(false, true, 'test');
        expect(defaultDestination).toBe('test');

        defaultDestination = destinationQuestionDefaultOption(false, false, 'test');
        expect(defaultDestination).toBe('test');

        defaultDestination = destinationQuestionDefaultOption(true, true);
        expect(defaultDestination).toBe(DESTINATION_CHOICE_DIRECT_SERVICE_BINDING);

        defaultDestination = destinationQuestionDefaultOption(false, true);
        expect(defaultDestination).toBe(DESTINATION_CHOICE_NONE);

        defaultDestination = destinationQuestionDefaultOption(false, false);
        expect(defaultDestination).toBe('');
    });
});
