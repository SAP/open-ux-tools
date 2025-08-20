import { existsSync } from 'fs';
import { join } from 'path';

export function getTemplatesOverwritePath(): string | undefined {
    const templatePath = join(__dirname, 'templates');
    if (existsSync(templatePath)) { 
        return templatePath;
    }
    return undefined;
}