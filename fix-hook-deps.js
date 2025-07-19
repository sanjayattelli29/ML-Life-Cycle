const fs = require('fs');
const path = require('path');

// List of files with React Hook dependency issues
const filesToFix = [
  'src/app/dashboard/area-charts/page.tsx',
  'src/app/dashboard/bar-charts/page.tsx',
  'src/app/dashboard/box-plot/page.tsx',
  'src/app/dashboard/bubble-chart/page.tsx',
  'src/app/dashboard/histogram/page.tsx',
  'src/app/dashboard/line-charts/page.tsx',
  'src/app/dashboard/radar-chart/page.tsx',
  'src/app/dashboard/scatter-plot/page.tsx',
  'src/app/dashboard/waterfall-chart/page.tsx',
  'src/app/dashboard/quality-metrics/page.tsx',
  'src/app/profile/page.tsx'
];

// Function to fix React Hook dependencies in a file
function fixHookDependencies(filePath) {
  console.log(`Fixing hook dependencies in ${filePath}`);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix React Hook dependencies
  if (filePath.includes('quality-metrics')) {
    content = content.replace(
      /useEffect\(\(\) => {\s*generateMetrics\(\);\s*}, \[(.*?)]\)/gs,
      'useEffect(() => { generateMetrics(); }, [$1, generateMetrics])'
    );
  } else if (filePath.includes('profile/page.tsx')) {
    content = content.replace(
      /useEffect\(\(\) => {\s*fetchUserProfile\(\);\s*}, \[(.*?)]\)/gs,
      'useEffect(() => { fetchUserProfile(); }, [$1, fetchUserProfile])'
    );
  } else {
    content = content.replace(
      /useEffect\(\(\) => {\s*generateChartData\(\);\s*}, \[(.*?)]\)/gs,
      'useEffect(() => { generateChartData(); }, [$1, generateChartData])'
    );
  }
  
  // Fix 'let' to 'const' for variables that are never reassigned
  content = content.replace(/let (sortedData|data|isText|xAxisType) =/g, 'const $1 =');
  
  fs.writeFileSync(filePath, content, 'utf8');
}

// Process each file
filesToFix.forEach(relativeFilePath => {
  const fullPath = path.join(process.cwd(), relativeFilePath);
  try {
    fixHookDependencies(fullPath);
  } catch (error) {
    console.error(`Error processing ${fullPath}:`, error);
  }
});

console.log('Finished fixing hook dependencies');
