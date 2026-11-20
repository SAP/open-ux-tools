import { MigrationErrorCode, extractErrorCode } from '../../src/utils/error-codes';

describe('error-codes', () => {
    describe('MigrationErrorCode', () => {
        it('should export all standard error codes', () => {
            expect(MigrationErrorCode.ENOENT).toBe('ENOENT');
            expect(MigrationErrorCode.EACCES).toBe('EACCES');
            expect(MigrationErrorCode.EEXIST).toBe('EEXIST');
            expect(MigrationErrorCode.EBUSY).toBe('EBUSY');
            expect(MigrationErrorCode.EISDIR).toBe('EISDIR');
            expect(MigrationErrorCode.ENOTDIR).toBe('ENOTDIR');
            expect(MigrationErrorCode.EPERM).toBe('EPERM');
            expect(MigrationErrorCode.MANIFEST_PARSE_ERROR).toBe('MANIFEST_PARSE_ERROR');
            expect(MigrationErrorCode.JSON_PARSE_ERROR).toBe('JSON_PARSE_ERROR');
            expect(MigrationErrorCode.YAML_PARSE_ERROR).toBe('YAML_PARSE_ERROR');
            expect(MigrationErrorCode.XML_PARSE_ERROR).toBe('XML_PARSE_ERROR');
            expect(MigrationErrorCode.UNSUPPORTED_FLOORPLAN).toBe('UNSUPPORTED_FLOORPLAN');
            expect(MigrationErrorCode.MISSING_MANIFEST).toBe('MISSING_MANIFEST');
            expect(MigrationErrorCode.MISSING_COMPONENT).toBe('MISSING_COMPONENT');
            expect(MigrationErrorCode.MISSING_ODATA_SERVICE).toBe('MISSING_ODATA_SERVICE');
            expect(MigrationErrorCode.INVALID_PROJECT_STRUCTURE).toBe('INVALID_PROJECT_STRUCTURE');
            expect(MigrationErrorCode.MIGRATION_FAILED).toBe('MIGRATION_FAILED');
            expect(MigrationErrorCode.COMMIT_FAILED).toBe('COMMIT_FAILED');
            expect(MigrationErrorCode.TYPESCRIPT_SETUP_FAILED).toBe('TYPESCRIPT_SETUP_FAILED');
            expect(MigrationErrorCode.COPY_FILES_FAILED).toBe('COPY_FILES_FAILED');
            expect(MigrationErrorCode.TEMPLATE_GENERATION_FAILED).toBe('TEMPLATE_GENERATION_FAILED');
            expect(MigrationErrorCode.NOT_SUITABLE_FOR_MIGRATION).toBe('NOT_SUITABLE_FOR_MIGRATION');
            expect(MigrationErrorCode.PROJECT_INFO_FAILED).toBe('PROJECT_INFO_FAILED');
            expect(MigrationErrorCode.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR');
        });
    });

    describe('extractErrorCode', () => {
        describe('Priority 1: Custom error types (error.name)', () => {
            it('should extract NOT_SUITABLE_FOR_MIGRATION from UnsupportedProjectError', () => {
                const error = new Error('Project is not suitable');
                error.name = 'UnsupportedProjectError';
                expect(extractErrorCode(error)).toBe('NOT_SUITABLE_FOR_MIGRATION');
            });

            it('should extract MIGRATION_FAILED from MigrationError', () => {
                const error = new Error('Migration failed');
                error.name = 'MigrationError';
                expect(extractErrorCode(error)).toBe('MIGRATION_FAILED');
            });

            it('should extract more specific code from MigrationError with cause', () => {
                // MigrationError wrapping an ENOENT error
                const causeError = Object.assign(new Error('file not found'), { code: 'ENOENT' });
                const error = Object.assign(new Error('Migration failed'), {
                    name: 'MigrationError',
                    cause: causeError
                });
                expect(extractErrorCode(error)).toBe('ENOENT');
            });

            it('should extract specific code from MigrationError wrapping UnsupportedProjectError', () => {
                const causeError = new Error('Project not suitable');
                causeError.name = 'UnsupportedProjectError';
                const error = Object.assign(new Error('Migration failed'), {
                    name: 'MigrationError',
                    cause: causeError
                });
                expect(extractErrorCode(error)).toBe('NOT_SUITABLE_FOR_MIGRATION');
            });

            it('should fall back to MIGRATION_FAILED when cause has UNKNOWN_ERROR', () => {
                const causeError = new Error('Some unknown error');
                const error = Object.assign(new Error('Migration failed'), {
                    name: 'MigrationError',
                    cause: causeError
                });
                expect(extractErrorCode(error)).toBe('MIGRATION_FAILED');
            });

            it('should extract JSON_PARSE_ERROR from SyntaxError with JSON context', () => {
                const error = new SyntaxError('Unexpected token in JSON');
                expect(extractErrorCode(error)).toBe('JSON_PARSE_ERROR');
            });

            it('should extract TEMPLATE_GENERATION_FAILED from SyntaxError with template context', () => {
                const error = new SyntaxError('Error rendering EJS template');
                expect(extractErrorCode(error)).toBe('TEMPLATE_GENERATION_FAILED');
            });

            it('should extract TEMPLATE_GENERATION_FAILED from SyntaxError mentioning template', () => {
                const error = new SyntaxError('Template compilation failed: unexpected token');
                expect(extractErrorCode(error)).toBe('TEMPLATE_GENERATION_FAILED');
            });

            it('should default to JSON_PARSE_ERROR for generic SyntaxError', () => {
                const error = new SyntaxError('Unexpected token }');
                expect(extractErrorCode(error)).toBe('JSON_PARSE_ERROR');
            });
        });

        describe('Priority 2: Node.js error codes (error.code property)', () => {
            it('should extract ENOENT from error.code property', () => {
                const error = Object.assign(new Error('file not found'), { code: 'ENOENT' });
                expect(extractErrorCode(error)).toBe('ENOENT');
            });

            it('should extract EACCES from error.code property', () => {
                const error = Object.assign(new Error('permission denied'), { code: 'EACCES' });
                expect(extractErrorCode(error)).toBe('EACCES');
            });

            it('should extract EEXIST from error.code property', () => {
                const error = Object.assign(new Error('file already exists'), { code: 'EEXIST' });
                expect(extractErrorCode(error)).toBe('EEXIST');
            });

            it('should prioritize error.code over message patterns', () => {
                // Error has both code property and "manifest" in message
                const error = Object.assign(new Error('Failed to read manifest.json'), { code: 'ENOENT' });
                // Should return ENOENT (from code), not MANIFEST_PARSE_ERROR (from message)
                expect(extractErrorCode(error)).toBe('ENOENT');
            });
        });

        describe('Priority 3: Pattern matching (fallback for library errors)', () => {
            it('should extract ENOENT from file not found error', () => {
                const error = new Error("ENOENT: no such file or directory, open '/path/to/file.json'");
                expect(extractErrorCode(error)).toBe('ENOENT');
            });

            it('should extract EACCES from permission denied error', () => {
                const error = new Error("EACCES: permission denied, access '/restricted/file'");
                expect(extractErrorCode(error)).toBe('EACCES');
            });

            it('should extract EEXIST from file already exists error', () => {
                const error = new Error("EEXIST: file already exists, mkdir '/path/to/dir'");
                expect(extractErrorCode(error)).toBe('EEXIST');
            });

            it('should extract EBUSY from resource busy error', () => {
                const error = new Error("EBUSY: resource busy or locked, rmdir '/path'");
                expect(extractErrorCode(error)).toBe('EBUSY');
            });

            it('should extract EISDIR from is-a-directory error', () => {
                const error = new Error('EISDIR: illegal operation on a directory, read');
                expect(extractErrorCode(error)).toBe('EISDIR');
            });

            it('should extract ENOTDIR from not-a-directory error', () => {
                const error = new Error("ENOTDIR: not a directory, scandir '/file.txt/subdir'");
                expect(extractErrorCode(error)).toBe('ENOTDIR');
            });

            it('should extract EPERM from operation not permitted error', () => {
                const error = new Error("EPERM: operation not permitted, unlink '/system/file'");
                expect(extractErrorCode(error)).toBe('EPERM');
            });

            it('should extract error code from string error message', () => {
                const errorString = 'ENOENT: no such file or directory';
                expect(extractErrorCode(errorString)).toBe('ENOENT');
            });
        });

        describe('Parsing errors', () => {
            it('should extract MANIFEST_PARSE_ERROR for manifest parsing errors', () => {
                const error = new Error('Failed to parse manifest.json: Unexpected token } in JSON');
                expect(extractErrorCode(error)).toBe('MANIFEST_PARSE_ERROR');
            });

            it('should extract JSON_PARSE_ERROR for generic JSON parsing errors', () => {
                const error = new Error('Error parsing JSON file: Unexpected end of input');
                expect(extractErrorCode(error)).toBe('JSON_PARSE_ERROR');
            });

            it('should extract YAML_PARSE_ERROR for YAML parsing errors', () => {
                const error = new Error('Error parsing ui5.yaml: duplicated mapping key');
                expect(extractErrorCode(error)).toBe('YAML_PARSE_ERROR');
            });

            it('should extract YAML_PARSE_ERROR for yml file parsing errors', () => {
                const error = new Error('Failed to parse config.yml file');
                expect(extractErrorCode(error)).toBe('YAML_PARSE_ERROR');
            });

            it('should extract XML_PARSE_ERROR for XML parsing errors', () => {
                const error = new Error('Error parsing XML: unclosed tag at line 42');
                expect(extractErrorCode(error)).toBe('XML_PARSE_ERROR');
            });
        });

        describe('Configuration errors', () => {
            it('should extract UNSUPPORTED_FLOORPLAN for unsupported floorplan errors', () => {
                const error = new Error('The V2_ANALYTICAL floorplan is not supported for migration');
                expect(extractErrorCode(error)).toBe('UNSUPPORTED_FLOORPLAN');
            });

            it('should extract UNSUPPORTED_FLOORPLAN with different wording', () => {
                const error = new Error('Floorplan type CUSTOM is unsupported');
                expect(extractErrorCode(error)).toBe('UNSUPPORTED_FLOORPLAN');
            });

            it('should extract MISSING_MANIFEST for missing manifest errors', () => {
                const error = new Error('manifest.json not found in project root');
                expect(extractErrorCode(error)).toBe('MISSING_MANIFEST');
            });

            it('should extract MISSING_MANIFEST with different wording', () => {
                const error = new Error('Required manifest file is missing');
                expect(extractErrorCode(error)).toBe('MISSING_MANIFEST');
            });

            it('should extract MISSING_MANIFEST for file not found', () => {
                const error = new Error('manifest.json does not exist');
                expect(extractErrorCode(error)).toBe('MISSING_MANIFEST');
            });

            it('should extract MISSING_COMPONENT for missing Component.js', () => {
                const error = new Error('Component.js not found in webapp folder');
                expect(extractErrorCode(error)).toBe('MISSING_COMPONENT');
            });

            it('should extract MISSING_COMPONENT with different wording', () => {
                const error = new Error('Required component file is missing');
                expect(extractErrorCode(error)).toBe('MISSING_COMPONENT');
            });

            it('should extract NOT_SUITABLE_FOR_MIGRATION', () => {
                const error = new Error('Project is not suitable for migration due to legacy structure');
                expect(extractErrorCode(error)).toBe('NOT_SUITABLE_FOR_MIGRATION');
            });

            it('should extract PROJECT_INFO_FAILED', () => {
                const error = new Error('Failed to get project info from manifest');
                expect(extractErrorCode(error)).toBe('PROJECT_INFO_FAILED');
            });
        });

        describe('Migration process errors', () => {
            it('should extract COMMIT_FAILED for commit errors', () => {
                const error = new Error('Error committing changes to disk');
                expect(extractErrorCode(error)).toBe('COMMIT_FAILED');
            });

            it('should extract COMMIT_FAILED from bulk migrator wording', () => {
                const error = new Error('Failed to commit migration changes: underlying error details');
                expect(extractErrorCode(error)).toBe('COMMIT_FAILED');
            });

            it('should extract TYPESCRIPT_SETUP_FAILED for TypeScript setup errors', () => {
                const error = new Error('Failed to setup TypeScript configuration');
                expect(extractErrorCode(error)).toBe('TYPESCRIPT_SETUP_FAILED');
            });

            it('should extract TYPESCRIPT_SETUP_FAILED for enabling TypeScript errors', () => {
                const error = new Error('Error enabling TypeScript for project');
                expect(extractErrorCode(error)).toBe('TYPESCRIPT_SETUP_FAILED');
            });

            it('should extract COPY_FILES_FAILED for file copying errors', () => {
                const error = new Error('Error copying files during migration');
                expect(extractErrorCode(error)).toBe('COPY_FILES_FAILED');
            });

            it('should extract COPY_FILES_FAILED for adaptation copying errors', () => {
                const error = new Error('Failed copying adaptation project files');
                expect(extractErrorCode(error)).toBe('COPY_FILES_FAILED');
            });

            it('should extract MIGRATION_FAILED for generic migration errors', () => {
                const error = new Error('Migration error: unexpected failure during process');
                expect(extractErrorCode(error)).toBe('MIGRATION_FAILED');
            });
        });

        describe('Unknown errors', () => {
            it('should return UNKNOWN_ERROR for unrecognized error patterns', () => {
                const error = new Error('Some completely unexpected error message');
                expect(extractErrorCode(error)).toBe('UNKNOWN_ERROR');
            });

            it('should return UNKNOWN_ERROR for empty error message', () => {
                const error = new Error('');
                expect(extractErrorCode(error)).toBe('UNKNOWN_ERROR');
            });

            it('should return UNKNOWN_ERROR for null', () => {
                expect(extractErrorCode(null)).toBe('UNKNOWN_ERROR');
            });

            it('should return UNKNOWN_ERROR for undefined', () => {
                expect(extractErrorCode(undefined)).toBe('UNKNOWN_ERROR');
            });

            it('should handle non-Error objects', () => {
                const errorString = 'ENOENT: file not found';
                expect(extractErrorCode(errorString)).toBe('ENOENT');
            });

            it('should handle number errors', () => {
                expect(extractErrorCode(404)).toBe('UNKNOWN_ERROR');
            });
        });

        describe('Case insensitivity', () => {
            it('should match patterns case-insensitively', () => {
                expect(extractErrorCode('The FLOORPLAN is NOT SUPPORTED')).toBe('UNSUPPORTED_FLOORPLAN');
                expect(extractErrorCode('ERROR PARSING MANIFEST')).toBe('MANIFEST_PARSE_ERROR');
                expect(extractErrorCode('Failed To Parse YAML')).toBe('YAML_PARSE_ERROR');
            });
        });

        describe('Edge cases', () => {
            it('should prioritize Node.js error codes over pattern matching', () => {
                const error = new Error('ENOENT: manifest parse error in file');
                // Should extract ENOENT, not MANIFEST_PARSE_ERROR
                expect(extractErrorCode(error)).toBe('ENOENT');
            });

            it('should handle errors with multiple keywords', () => {
                const error = new Error('Migration error during manifest parsing and YAML processing');
                // Should match the first pattern found
                expect(extractErrorCode(error)).toBe('MANIFEST_PARSE_ERROR');
            });

            it('should not match partial words', () => {
                // "floorplans" (plural) should not match the singular "floorplan" pattern
                // Word boundary check prevents matching "unsupported floorplans" vs "unsupported floorplan"
                const error = new Error('Multiple floorplans detected in project');
                expect(extractErrorCode(error)).toBe('UNKNOWN_ERROR');
            });
        });

        describe('Real-world error messages', () => {
            it('should handle real Node.js ENOENT error', () => {
                const error = new Error(
                    "ENOENT: no such file or directory, open '/Users/developer/projects/my-app/webapp/manifest.json'"
                );
                expect(extractErrorCode(error)).toBe('ENOENT');
            });

            it('should handle commit failure with nested error', () => {
                const error = new Error('Error committing changes during migration process');
                expect(extractErrorCode(error)).toBe('COMMIT_FAILED');
            });

            it('should handle unsupported floorplan message', () => {
                const error = new Error(
                    'The floorplan "sap.suite.ui.generic.template.AnalyticalListPage" is not supported for migration to SAP Fiori elements V4.'
                );
                expect(extractErrorCode(error)).toBe('UNSUPPORTED_FLOORPLAN');
            });

            it('should handle complex manifest parse error', () => {
                const error = new Error(
                    "Failed to parse manifest.json at line 42: Unexpected token '}', expected property name or '}'  in JSON at position 1234"
                );
                expect(extractErrorCode(error)).toBe('MANIFEST_PARSE_ERROR');
            });
        });

        describe('Integration: Error code population in Message objects', () => {
            it('should populate code field when creating error messages', () => {
                // Simulate creating an error message as done in ProjectMigrator
                const error = new Error('ENOENT: no such file or directory');
                const message = {
                    type: 'ERROR' as const,
                    description: 'Failed to read file',
                    code: extractErrorCode(error)
                };

                expect(message.code).toBeDefined();
                expect(message.code).toBe('ENOENT');
            });

            it('should populate code field for all error types', () => {
                const testCases = [
                    { error: new Error('ENOENT: file not found'), expectedCode: 'ENOENT' },
                    { error: new Error('EACCES: permission denied'), expectedCode: 'EACCES' },
                    { error: new Error('Failed to parse manifest.json'), expectedCode: 'MANIFEST_PARSE_ERROR' },
                    {
                        error: new Error('The V2_ANALYTICAL floorplan is not supported'),
                        expectedCode: 'UNSUPPORTED_FLOORPLAN'
                    }
                ];

                testCases.forEach(({ error, expectedCode }) => {
                    const message = {
                        type: 'ERROR' as const,
                        description: error.message,
                        code: extractErrorCode(error)
                    };

                    expect(message.code).toBeDefined();
                    expect(message.code).toBe(expectedCode);
                });
            });
        });
    });
});
