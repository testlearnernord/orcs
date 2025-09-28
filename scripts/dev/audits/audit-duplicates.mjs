#!/usr/bin/env node
/**
 * Audit script to detect duplicate files via hash, size, and name heuristics
 * Helps identify redundant assets and code files
 */

import { readFile, stat } from 'node:fs/promises';
import { join, basename, relative, extname } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { globby } from 'globby';

const root = process.cwd();

/**
 * Find all files to analyze for duplicates
 */
async function findAllFiles() {
  const patterns = [
    'src/**/*',
    'public/**/*',
    'docs/assets/**/*',
    'audio/**/*',
    'tests/**/*',
    '!node_modules/**',
    '!.git/**',
    '!**/*.md', // Skip documentation files
    '!**/package-lock.json'
  ];
  
  return await globby(patterns, { 
    cwd: root, 
    absolute: true,
    onlyFiles: true 
  });
}

/**
 * Calculate MD5 hash of a file
 */
async function getFileHash(filePath) {
  try {
    const content = await readFile(filePath);
    return createHash('md5').update(content).digest('hex');
  } catch (error) {
    console.warn(`Warning: Could not hash ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Get file metadata
 */
async function getFileMetadata(filePath) {
  try {
    const stats = await stat(filePath);
    const hash = await getFileHash(filePath);
    
    return {
      path: filePath,
      relativePath: relative(root, filePath),
      name: basename(filePath),
      nameWithoutExt: basename(filePath, extname(filePath)),
      extension: extname(filePath),
      size: stats.size,
      hash,
      modified: stats.mtime
    };
  } catch (error) {
    console.warn(`Warning: Could not get metadata for ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Format file size for human reading
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Find exact duplicates (same hash)
 */
function findExactDuplicates(files) {
  const hashGroups = new Map();
  
  for (const file of files) {
    if (!file.hash) continue;
    
    if (!hashGroups.has(file.hash)) {
      hashGroups.set(file.hash, []);
    }
    hashGroups.get(file.hash).push(file);
  }
  
  // Return only groups with more than one file
  return Array.from(hashGroups.values()).filter(group => group.length > 1);
}

/**
 * Find size duplicates (same size, different hash)
 */
function findSizeDuplicates(files) {
  const sizeGroups = new Map();
  
  for (const file of files) {
    if (!sizeGroups.has(file.size)) {
      sizeGroups.set(file.size, []);
    }
    sizeGroups.get(file.size).push(file);
  }
  
  // Return groups with same size but different hashes
  return Array.from(sizeGroups.values())
    .filter(group => group.length > 1)
    .filter(group => {
      const hashes = new Set(group.map(f => f.hash).filter(Boolean));
      return hashes.size > 1; // Different hashes, same size
    });
}

/**
 * Find name-based potential duplicates
 */
function findNameDuplicates(files) {
  const nameGroups = new Map();
  
  for (const file of files) {
    const key = file.nameWithoutExt.toLowerCase();
    
    if (!nameGroups.has(key)) {
      nameGroups.set(key, []);
    }
    nameGroups.get(key).push(file);
  }
  
  // Return groups with same name but different extensions or locations
  return Array.from(nameGroups.values())
    .filter(group => group.length > 1)
    .filter(group => {
      // Check if they have different extensions or are in different directories
      const extensions = new Set(group.map(f => f.extension));
      const directories = new Set(group.map(f => f.relativePath.split('/').slice(0, -1).join('/')));
      return extensions.size > 1 || directories.size > 1;
    });
}

/**
 * Find similar names (potential typos or variations)
 */
function findSimilarNames(files) {
  const similar = [];
  const names = files.map(f => ({ 
    file: f, 
    name: f.nameWithoutExt.toLowerCase().replace(/[-_\d]/g, '') 
  }));
  
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const name1 = names[i].name;
      const name2 = names[j].name;
      
      if (name1.length > 3 && name2.length > 3) {
        // Simple similarity check - one name contains the other or they're very similar
        if ((name1.includes(name2) || name2.includes(name1)) && 
            Math.abs(name1.length - name2.length) <= 2) {
          similar.push([names[i].file, names[j].file]);
        }
      }
    }
  }
  
  return similar;
}

/**
 * Main audit function
 */
async function auditDuplicates() {
  console.log('🔍 Starting duplicates audit...');
  
  const allFiles = await findAllFiles();
  console.log(`📁 Analyzing ${allFiles.length} files...`);
  
  // Get metadata for all files
  const filesWithMetadata = [];
  for (const file of allFiles) {
    const metadata = await getFileMetadata(file);
    if (metadata) {
      filesWithMetadata.push(metadata);
    }
  }
  
  console.log('🔍 Finding duplicates...');
  
  // Find different types of duplicates
  const exactDuplicates = findExactDuplicates(filesWithMetadata);
  const sizeDuplicates = findSizeDuplicates(filesWithMetadata);
  const nameDuplicates = findNameDuplicates(filesWithMetadata);
  const similarNames = findSimilarNames(filesWithMetadata);
  
  // Calculate savings potential
  const potentialSavings = exactDuplicates.reduce((total, group) => {
    return total + (group[0].size * (group.length - 1));
  }, 0);
  
  // Generate report
  const report = generateDuplicatesReport(
    exactDuplicates, 
    sizeDuplicates, 
    nameDuplicates, 
    similarNames,
    potentialSavings,
    filesWithMetadata.length
  );
  
  // Write report
  const reportPath = join(root, 'reports', 'audit-duplicates.md');
  await writeFile(reportPath, report, 'utf-8');
  
  console.log(`✅ Duplicates audit complete. Report written to ${reportPath}`);
  console.log(`📊 Found ${exactDuplicates.length} exact duplicate groups`);
  console.log(`💾 Potential savings: ${formatFileSize(potentialSavings)}`);
  
  return {
    exactDuplicates,
    sizeDuplicates,
    nameDuplicates,
    similarNames,
    potentialSavings,
    totalFiles: filesWithMetadata.length
  };
}

/**
 * Generate markdown report
 */
function generateDuplicatesReport(exactDuplicates, sizeDuplicates, nameDuplicates, similarNames, potentialSavings, totalFiles) {
  const timestamp = new Date().toISOString();
  
  return `# Duplicate Files Analysis Report

Generated: ${timestamp}

## Summary

- **Total files analyzed**: ${totalFiles}
- **Exact duplicate groups**: ${exactDuplicates.length}
- **Size duplicate groups**: ${sizeDuplicates.length}
- **Name duplicate groups**: ${nameDuplicates.length}
- **Similar name pairs**: ${similarNames.length}
- **Potential space savings**: ${formatFileSize(potentialSavings)}

## Exact Duplicates (Same Hash)

${exactDuplicates.length === 0 
  ? '_No exact duplicates found._'
  : exactDuplicates.map((group, index) => `
### Group ${index + 1} (${formatFileSize(group[0].size)} each)
${group.map(file => `- \`${file.relativePath}\``).join('\n')}
`).join('')}

## Size Duplicates (Same Size, Different Content)

${sizeDuplicates.length === 0
  ? '_No size duplicates found._'
  : sizeDuplicates.slice(0, 10).map((group, index) => `
### Size Group ${index + 1} (${formatFileSize(group[0].size)} each)
${group.map(file => `- \`${file.relativePath}\``).join('\n')}
`).join('')}

${sizeDuplicates.length > 10 ? `\n_... and ${sizeDuplicates.length - 10} more size duplicate groups_\n` : ''}

## Name Duplicates (Same Name, Different Locations/Extensions)

${nameDuplicates.length === 0
  ? '_No name duplicates found._'
  : nameDuplicates.slice(0, 10).map((group, index) => `
### Name Group ${index + 1} ("${group[0].nameWithoutExt}")
${group.map(file => `- \`${file.relativePath}\` (${file.extension})`).join('\n')}
`).join('')}

${nameDuplicates.length > 10 ? `\n_... and ${nameDuplicates.length - 10} more name duplicate groups_\n` : ''}

## Similar Names (Potential Typos/Variations)

${similarNames.length === 0
  ? '_No similar names found._'
  : similarNames.slice(0, 15).map(([file1, file2]) => `
- \`${file1.relativePath}\` ↔ \`${file2.relativePath}\`
`).join('')}

${similarNames.length > 15 ? `\n_... and ${similarNames.length - 15} more similar name pairs_\n` : ''}

## Recommendations

### Exact Duplicates
${exactDuplicates.length > 0 
  ? `- **High Priority**: Review ${exactDuplicates.length} exact duplicate groups
- These are identical files that can likely be consolidated
- Potential space savings: ${formatFileSize(potentialSavings)}
- Keep one copy and update references to point to it`
  : '- No exact duplicates to clean up'}

### Size Duplicates
${sizeDuplicates.length > 0
  ? `- **Medium Priority**: Review files with identical sizes
- May indicate similar content or potential duplicates
- Manual review required to determine if they're truly duplicates`
  : '- No suspicious size duplicates found'}

### Name Duplicates
${nameDuplicates.length > 0
  ? `- **Medium Priority**: Review files with same names in different locations
- May indicate scattered asset organization
- Consider consolidating to a single location`
  : '- No name-based duplicates found'}

### Similar Names
${similarNames.length > 0
  ? `- **Low Priority**: Review similar filenames for consistency
- May indicate typos or inconsistent naming
- Consider standardizing naming conventions`
  : '- No similar names requiring attention'}

---
*Generated by audit-duplicates.mjs*
`;
}

// Run audit if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await auditDuplicates();
  } catch (error) {
    console.error('❌ Duplicates audit failed:', error);
    process.exit(1);
  }
}

export { auditDuplicates };