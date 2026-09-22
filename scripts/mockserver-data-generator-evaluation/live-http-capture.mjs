import { executeLiveHttpCaptureCommand } from './lib/live-http-capture.mjs';

try {
    const report = await executeLiveHttpCaptureCommand(process.argv.slice(2));
    console.log(JSON.stringify({ passed: report.passed, executionMode: report.executionMode }));
    if (!report.passed) process.exitCode = 1;
} catch (error) {
    console.error(`MockGen live HTTP capture failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
}
