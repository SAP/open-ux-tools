import { isAppStudio } from '@sap-ux/btp-utils';
import { AbapDeployConfigPromptOptions, ClientChoiceValue } from '../../src/types';
import {
    showClientChoiceQuestion,
    showClientQuestion,
    showScpQuestion,
    showUrlQuestion
} from '../../src/prompts/conditions';
import * as utils from '../../src/utils';
import { PromptState } from '../../../odata-service-inquirer/src/utils';
import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';

jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn()
}));

jest.mock('@sap-ux/fiori-generator-shared', () => ({
    ...jest.requireActual('@sap-ux/fiori-generator-shared'),
    getHostEnvironment: jest.fn()
}));

const mockIsAppStudio = isAppStudio as jest.Mock;
const mockGetHostEnvironment = getHostEnvironment as jest.Mock;

const abapDeployConfigPromptOptions: AbapDeployConfigPromptOptions = {};

describe('Test abap deploy config inquirer conditions', () => {
    let options: AbapDeployConfigPromptOptions;
    beforeEach(() => {
        options = abapDeployConfigPromptOptions;
        PromptState.reset();
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    test('should show url prompt', () => {
        expect(showUrlQuestion('Url')).toBe(true);
    });

    test('should not show scp question', async () => {
        // 1 target not chosen
        expect(await showScpQuestion({})).toBe(false);
        // 2 url target chosen but no url provided
        expect(await showScpQuestion({ targetSystem: 'Url', url: '' })).toBe(false);
        // 3 scp value has already been provided in existing options
        options.backendTarget = {
            abapTarget: {
                url: 'http://known.target.url',
                scp: false,
                client: '100'
            },
            type: 'application'
        };
        expect(await showScpQuestion({ url: 'http://known.target.url' })).toBe(false);
        // 4 scp value has been retrieved from existing system
        options.backendTarget.abapTarget.scp = undefined;
        jest.spyOn(utils, 'findBackendSystemByUrl').mockReturnValue({
            name: 'Target system 1',
            url: 'http://saved.target.url',
            client: '100'
        });
        expect(await showScpQuestion({ url: 'http://saved.target.url' })).toBe(false);
    });

    test('should show scp question', async () => {
        jest.spyOn(utils, 'findBackendSystemByUrl').mockReturnValue(undefined);
        expect(await showScpQuestion({ targetSystem: 'Url', url: 'http://new.target.url' })).toBe(true);
    });

    test('should show client choice question', () => {
        options = {
            backendTarget: {
                abapTarget: {
                    url: 'http://known.target.url',
                    scp: false,
                    client: '100'
                }
            }
        };
        mockIsAppStudio.mockReturnValueOnce(false);
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.cli);
        expect(showClientChoiceQuestion(options, false)).toBe(true);
    });

    test('should not show client choice question', () => {
        mockIsAppStudio.mockReturnValueOnce(false);
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.cli);
        expect(showClientChoiceQuestion({}, true)).toBe(false);
    });

    test('should show client question', () => {
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.vscode);
        mockIsAppStudio.mockReturnValueOnce(false);
        expect(showClientQuestion({}, options, false)).toBe(true);
    });

    test('should show client question (CLI)', () => {
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.cli);
        mockIsAppStudio.mockReturnValue(false);
        expect(showClientQuestion({ clientChoice: ClientChoiceValue.New }, options, false)).toBe(true);
    });
});
