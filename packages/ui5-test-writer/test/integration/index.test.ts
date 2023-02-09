import { generateOPAFiles, generatePageObjectFile } from '../../src';
import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import fileSystem from 'fs';

describe('ui5-test-writer - Integration tests', () => {
    let fs: Editor | undefined;
    const debug = !!process.env['UX_DEBUG'];

    function prepareTestFiles(testConfigurationName: string): string {
        // Copy input templates into output directory
        const inputDir = join(__dirname, '../test-input', testConfigurationName);
        const outputDir = join(__dirname, '../test-output', testConfigurationName);
        fs = create(createStorage());
        if (fileSystem.existsSync(inputDir)) {
            fs.copy(inputDir, outputDir);
        }

        return outputDir;
    }

    afterAll(() => {
        return new Promise((resolve) => {
            // write out the files for debugging
            if (debug && fs) {
                fs.commit(resolve);
                fs = undefined;
            } else {
                fs = undefined;
                resolve(true);
            }
        });
    });

    it('Generate initial OPA test files and add more pages', async () => {
        const projectDir = prepareTestFiles('RestaurantApp');

        function addSubOPInManifest(targetKey: string, routePattern: string, navProperty: string, targetObject: any) {
            const manifestPath = join(projectDir, 'webapp/manifest.json');
            const manifest = fs?.readJSON(manifestPath) as any;
            manifest['sap.ui5'].routing.routes.push({
                name: targetKey,
                target: targetKey,
                pattern: routePattern
            });
            manifest['sap.ui5'].routing.targets[targetKey] = targetObject;
            manifest['sap.ui5'].routing.targets['RestaurantObjectPage'].options.settings.navigation[navProperty] = {
                detail: {
                    route: targetKey
                }
            };
            fs?.writeJSON(manifestPath, manifest);
        }

        // Create initial OPA test files on an LROP project
        fs = await generateOPAFiles(projectDir, {}, fs);

        // Add a SubOP page (FEV4 object page)
        const DishOP = {
            type: 'Component',
            id: 'DishObjectPage',
            name: 'sap.fe.templates.ObjectPage',
            options: {
                settings: {
                    entitySet: 'Dish'
                }
            }
        };
        addSubOPInManifest('DishObjectPage', 'Restaurant({key})/_Dishes({key2}):?query:', '_Dishes', DishOP);
        fs = await generatePageObjectFile(projectDir, { targetKey: 'DishObjectPage' }, fs);

        // Add a custom FPM page
        const EmployeePage = {
            type: 'Component',
            id: 'EmployeesCustomPage',
            name: 'sap.fe.core.fpm',
            options: {
                settings: {
                    viewName: 'restaurantapp.ext.view.EmployeeView',
                    entitySet: 'Employees'
                }
            }
        };
        addSubOPInManifest(
            'EmployeesCustomPage',
            'Restaurant({key})/_Employees({_EmployeesKey}):?query:',
            '_Employees',
            EmployeePage
        );
        fs = await generatePageObjectFile(projectDir, { targetKey: 'EmployeesCustomPage' }, fs);

        expect(fs.dump(projectDir)).toMatchSnapshot();
    });
});
