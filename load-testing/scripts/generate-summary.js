const fs = require('fs');
const path = require('path');

const reportDir = process.argv[2] || '/app/playwright-report/consolidated';
const jsonReportPath = path.join(reportDir, 'report.json');

if (!fs.existsSync(jsonReportPath)) {
    console.error(`Status summary failed: report.json not found at ${jsonReportPath}`);
    process.exit(1);
}

const rawData = fs.readFileSync(jsonReportPath, 'utf8');
const report = JSON.parse(rawData);

const suites = report.suites || [];

console.log('\n======================================================');
console.log('            CONTAINER EXECUTION SUMMARY               ');
console.log('======================================================');

const containerMap = {};

function processSpecs(specs) {
    specs.forEach(spec => {
        spec.tests.forEach(test => {
            const pName = test.projectName || 'Default';
            if (!containerMap[pName]) {
                containerMap[pName] = {
                    projectName: pName,
                    total: 0,
                    passed: 0,
                    failed: 0,
                    skipped: 0,
                    timeSec: 0
                };
            }
            const stats = containerMap[pName];

            test.results.forEach(result => {
                stats.total++;
                stats.timeSec += (result.duration || 0) / 1000;
                if (result.status === 'passed') stats.passed++;
                else if (result.status === 'failed' || result.status === 'timedOut') stats.failed++;
                else stats.skipped++;
            });
        });
    });
}

function processSuites(suitesArr) {
    suitesArr.forEach(s => {
        if (s.specs) processSpecs(s.specs);
        if (s.suites) processSuites(s.suites);
    });
}

processSuites(suites);

const summaryList = Object.values(containerMap);

summaryList.forEach(s => {
    console.log(`Project: ${s.projectName.padEnd(25)} | Total: ${s.total.toString().padEnd(4)} | Passed: ${s.passed.toString().padEnd(4)} | Failed: ${s.failed.toString().padEnd(4)} | Skipped: ${s.skipped.toString().padEnd(4)} | Time: ${s.timeSec.toFixed(2)}s`);
});

console.log('======================================================\n');

// Write HTML summary
const htmlPath = path.join(reportDir, 'container-summary.html');

const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Container Summary</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 20px; background-color: #f8f9fa; }
        h1 { color: #333; }
        table { border-collapse: collapse; width: 100%; max-width: 900px; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #007bff; color: white; font-weight: 500; }
        tr:hover { background-color: #f5f5f5; }
        .passed { color: #28a745; font-weight: bold; }
        .failed { color: #dc3545; font-weight: bold; }
        .skipped { color: #ffc107; font-weight: bold; }
        .nav-link { display: inline-block; margin-bottom: 20px; padding: 10px 15px; background: #6c757d; color: white; text-decoration: none; border-radius: 4px; }
        .nav-link:hover { background: #5a6268; }
        .project-link { color: #007bff; text-decoration: none; }
        .project-link:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <h1>Container Execution Summary</h1>
    <table>
        <thead>
            <tr>
                <th>Project Name</th>
                <th>Total Tests</th>
                <th>Failed</th>
                <th>Passed</th>
                <th>Skipped</th>
                <th>Time (s)</th>
            </tr>
        </thead>
        <tbody>
            ${summaryList.map(s => {
    const folderName = s.projectName.replace('Container-', '');
    const folderLink = `../${folderName}/index.html`;
    return `
            <tr>
                <td><a class="project-link" href="${folderLink}">Project: ${s.projectName}</a></td>
                <td>${s.total}</td>
                <td class="${s.failed > 0 ? 'failed' : ''}">${s.failed}</td>
                <td class="${s.passed > 0 ? 'passed' : ''}">${s.passed}</td>
                <td class="${s.skipped > 0 ? 'skipped' : ''}">${s.skipped}</td>
                <td>${s.timeSec.toFixed(2)}</td>
            </tr>
            `;
}).join('')}
        </tbody>
    </table>
</body>
</html>
`;

fs.writeFileSync(htmlPath, htmlContent);
console.log(`HTML Summary written to ${htmlPath}`);
