#!/usr/bin/env node
/**
 * Audit script to find unreferenced files and unused exports
 * Analyzes all TS/TSX/JS files and identifies dead code
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, extname, relative } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { globby } from 'globby';

const root = process.cwd();

/**
 * Find all source files in the project
 */
async function findSourceFiles() {
  const patterns = [
    'src/**/*.{ts,tsx,js,jsx}',
    'tests/**/*.{ts,tsx,js,jsx}',
    '!node_modules/**',
    '!docs/**',
    '!**/*.d.ts'
  ];
  
  return await globby(patterns, { cwd: root, absolute: true });
}

/**
 * Extract imports from a file's content
 */
function extractImports(content, filePath) {
  const imports = new Set();
  
  // Match various import patterns
  const importPatterns = [
    // import { something } from './file'
    /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"`]([^'"`]+)['"`]/g,
    // import('./file')
    /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
    // require('./file')
    /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g
  ];
  
  for (const pattern of importPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath.startsWith('.')) {
        imports.add(importPath);
      }
    }
  }
  
  return imports;
}

/**
 * Extract exports from a file's content
 */
function extractExports(content) {
  const exports = new Set();
  
  const exportPatterns = [
    // export const/function/class name
    /export\s+(?:const|function|class|interface|type|enum)\s+(\w+)/g,
    // export { name }
    /export\s*{\s*([^}]+)\s*}/g,
    // export default
    /export\s+default/g
  ];
  
  for (const pattern of exportPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      if (match[1]) {
        if (match[1].includes(',')) {
          // Handle export { a, b, c }
          match[1].split(',').forEach(name => {
            const cleanName = name.trim().split(' as ')[0].trim();
            if (cleanName) exports.add(cleanName);
          });
        } else {
          exports.add(match[1]);
        }
      } else if (match[0].includes('default')) {
        exports.add('default');
      }
    }
  }
  
  return exports;
}

/**
 * Resolve import path to actual file path
 */
async function resolveImportPath(importPath, fromFile) {
  const fromDir = join(fromFile, '..');
  let resolved = join(fromDir, importPath);
  
  // Try different extensions
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js'];
  
  for (const ext of extensions) {
    const tryPath = resolved + ext;
    try {
      await stat(tryPath);
      return tryPath;
    } catch {
      // Continue trying
    }
  }
  
  return null;
}

/**
 * Main audit function
 */
async function auditImports() {
  console.log('🔍 Starting imports audit...');
  
  const sourceFiles = await findSourceFiles();
  const fileImports = new Map();
  const fileExports = new Map();
  const allFiles = new Set(sourceFiles);
  const referencedFiles = new Set();
  
  // Analyze each file
  for (const file of sourceFiles) {
    try {
      const content = await readFile(file, 'utf-8');
      const imports = extractImports(content, file);
      const exports = extractExports(content);
      
      fileImports.set(file, imports);
      fileExports.set(file, exports);
      
      // Resolve import paths to mark files as referenced
      for (const importPath of imports) {
        const resolved = await resolveImportPath(importPath, file);
        if (resolved && allFiles.has(resolved)) {
          referencedFiles.add(resolved);
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not process ${file}: ${error.message}`);
    }
  }
  
  // Find unreferenced files
  const unreferencedFiles = [];
  for (const file of allFiles) {
    if (!referencedFiles.has(file)) {
      // Skip entry points
      const relativePath = relative(root, file);
      if (relativePath.includes('main.ts') || 
          relativePath.includes('main.tsx') || 
          relativePath.includes('index.html') ||
          relativePath.includes('.test.') ||
          relativePath.includes('.spec.')) {
        continue;
      }
      unreferencedFiles.push(relativePath);
    }
  }
  
  // Generate report
  const report = generateImportsReport(unreferencedFiles, sourceFiles.length, referencedFiles.size);
  
  // Write report
  const reportPath = join(root, 'reports', 'audit-imports.md');
  await writeFile(reportPath, report, 'utf-8');
  
  console.log(`✅ Imports audit complete. Report written to ${reportPath}`);
  console.log(`📊 Found ${unreferencedFiles.length} unreferenced files out of ${sourceFiles.length} total`);
  
  return {
    unreferencedFiles,
    totalFiles: sourceFiles.length,
    referencedFiles: referencedFiles.size
  };
}

/**
 * Generate markdown report
 */
function generateImportsReport(unreferencedFiles, totalFiles, referencedFiles) {
  const timestamp = new Date().toISOString();
  
  return `# Import Analysis Report

Generated: ${timestamp}

## Summary

- **Total source files analyzed**: ${totalFiles}
- **Referenced files**: ${referencedFiles}
- **Unreferenced files**: ${unreferencedFiles.length}

## Unreferenced Files

${unreferencedFiles.length === 0 
  ? '_No unreferenced files found._' 
  : unreferencedFiles.map(file => `- \`${file}\``).join('\n')}

## Recommendations

${unreferencedFiles.length > 0 
  ? `- Review the ${unreferencedFiles.length} unreferenced files above
- Verify if they are truly unused or if the analysis missed dynamic imports
- Consider removing files that are confirmed as dead code
- Keep test files and entry points even if not directly imported`
  : `- No cleanup needed for unreferenced files
- Consider running this audit periodically to catch future dead code`}

---
*Generated by audit-imports.mjs*
`;
}

// Run audit if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await auditImports();
  } catch (error) {
    console.error('❌ Imports audit failed:', error);
    process.exit(1);
  }
}

export { auditImports };