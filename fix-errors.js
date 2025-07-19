const fs = require('fs');
const path = require('path');

// Function to fix specific issues in a file
function fixFile(filePath, fixes) {
  console.log(`Fixing ${filePath}`);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Apply each fix to the content
  fixes.forEach(fix => {
    content = content.replace(fix.pattern, fix.replacement);
  });
  
  fs.writeFileSync(filePath, content, 'utf8');
}

// Define fixes for specific files
const fileFixes = [
  {
    path: 'src/app/api/datasets/route.ts',
    fixes: [
      {
        pattern: /export async function GET\(req: NextRequest\)/g,
        replacement: 'export async function GET()'
      }
    ]
  },
  {
    path: 'src/app/api/profile/route.ts',
    fixes: [
      {
        pattern: /export async function GET\(req: NextRequest\)/g,
        replacement: 'export async function GET()'
      }
    ]
  },
  {
    path: 'src/app/api/upload-history/route.ts',
    fixes: [
      {
        pattern: /import { ObjectId } from 'mongodb';/g,
        replacement: '// import { ObjectId } from \'mongodb\';'
      }
    ]
  },
  {
    path: 'src/app/auth/signin/page.tsx',
    fixes: [
      {
        pattern: /const error = searchParams\.get\('error'\) \|\| '';/g,
        replacement: '// const error = searchParams.get(\'error\') || \'\';'
      }
    ]
  },
  {
    path: 'src/app/dashboard/layout.tsx',
    fixes: [
      {
        pattern: /import { signIn,/g,
        replacement: 'import {'
      }
    ]
  },
  {
    path: 'src/app/dashboard/page.tsx',
    fixes: [
      {
        pattern: /Don't/g,
        replacement: 'Don&apos;t'
      }
    ]
  },
  {
    path: 'src/app/profile/page.tsx',
    fixes: [
      {
        pattern: /import { TableCellsIcon } from '@heroicons\/react\/24\/outline';/g,
        replacement: '// import { TableCellsIcon } from \'@heroicons/react/24/outline\';'
      },
      {
        pattern: /Don't/g,
        replacement: 'Don&apos;t'
      }
    ]
  },
  {
    path: 'src/app/profile/upload-history/page.tsx',
    fixes: [
      {
        pattern: /Don't/g,
        replacement: 'Don&apos;t'
      }
    ]
  },
  {
    path: 'src/app/page.tsx',
    fixes: [
      {
        pattern: /import Image from 'next\/image';/g,
        replacement: '// import Image from \'next/image\';'
      }
    ]
  },
  {
    path: 'src/lib/mongodb.ts',
    fixes: [
      {
        pattern: /import { MongoClient, Db } from 'mongodb';/g,
        replacement: 'import { MongoClient } from \'mongodb\';'
      },
      {
        pattern: /let globalWithMongo/g,
        replacement: 'const globalWithMongo'
      }
    ]
  },
  {
    path: 'src/types/next-auth.d.ts',
    fixes: [
      {
        pattern: /import NextAuth from 'next-auth';/g,
        replacement: '// import NextAuth from \'next-auth\';'
      }
    ]
  }
];

// Process each file
fileFixes.forEach(fileFix => {
  const fullPath = path.join(process.cwd(), fileFix.path);
  try {
    fixFile(fullPath, fileFix.fixes);
  } catch (error) {
    console.error(`Error processing ${fullPath}:`, error);
  }
});

console.log('Finished fixing files');
