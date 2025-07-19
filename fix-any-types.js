const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Function to fix 'any' types in a file
function fixAnyTypes(filePath) {
  console.log(`Fixing any types in ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace 'any' with 'unknown' or more specific types
  content = content.replace(/: any(?!\w)/g, ': unknown');
  
  // Fix unescaped entities
  content = content.replace(/(\w)'(\w)/g, "$1&apos;$2");
  
  fs.writeFileSync(filePath, content, 'utf8');
}

// Find all TypeScript files
const files = glob.sync('src/**/*.{ts,tsx}', {
  ignore: ['node_modules/**', '.next/**']
});

// Process each file
files.forEach(filePath => {
  try {
    fixAnyTypes(filePath);
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
});

console.log('Finished fixing any types');
