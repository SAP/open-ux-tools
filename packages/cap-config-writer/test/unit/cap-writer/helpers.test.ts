import { getCDSTask } from '../../../src/cap-writer/helpers';

describe('getCDSTask', () => {
    const DisableCacheParam = 'sap-ui-xx-viewCache=false';

    test('should return CDS task with project name when useNPMWorkspaces is false', () => {
        const projectName = 'test_project';
        const appId = 'test.app.project1';
        const useNPMWorkspaces = false;
        const expectedTask = {
            [`watch-${projectName}`]: `cds watch --open ${projectName}/webapp/index.html?${DisableCacheParam}`
        };
        const cdsTask = getCDSTask(projectName, appId, useNPMWorkspaces);
        expect(cdsTask).toEqual(expectedTask);
    });

    test('should return CDS task with appId when useNPMWorkspaces is true', () => {
        const projectName = 'test_project';
        const appId = 'test.app.project1';
        const useNPMWorkspaces = true;
        const expectedTask = {
            [`watch-${projectName}`]: `cds watch --open ${appId}/index.html?${DisableCacheParam} --livereload false`
        };
        const cdsTask = getCDSTask(projectName, appId, useNPMWorkspaces);
        expect(cdsTask).toEqual(expectedTask);
    });

    test('should return CDS task  when useNPMWorkspaces is not provided', () => {
        const projectName = 'test_project';
        const appId = 'test.app.project1';
        const expectedTask = {
            [`watch-${projectName}`]: `cds watch --open ${projectName}/webapp/index.html?${DisableCacheParam}`
        };
        const cdsTask = getCDSTask(projectName, appId);
        expect(cdsTask).toEqual(expectedTask);
    });
});
