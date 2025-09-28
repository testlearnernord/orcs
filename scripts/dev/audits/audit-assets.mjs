#!/usr/bin/env node
/**
 * Audit script to find assets without usage proof
 * Analyzes all assets in src/assets, public/, and docs/ directories
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, extname, relative, basename } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { globby } from 'globby';

const root = process.cwd();

/**
 * Find all asset files in the project
 */
async function findAssetFiles() {
  const patterns = [
    'src/assets/**/*',
    'public/**/*',  
    'docs/assets/**/*',
    'audio/**/*',
    '!**/*.md',
    '!**/*.txt',
    '!**/*.json'
  ];
  
  const files = await globby(patterns, { 
    cwd: root, 
    absolute: true,
    onlyFiles: true 
  });
  
  // Filter to only include actual asset files
  const assetExtensions = [
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.svg',
    '.mp3', '.wav', '.ogg', '.m4a',
    '.mp4', '.webm', '.mov',
    '.ttf', '.woff', '.woff2', '.eot',
    '.css', '.scss', '.less'
  ];
  
  return files.filter(file => {
    const ext = extname(file).toLowerCase();
    return assetExtensions.includes(ext);
  });
}

/**
 * Find all source files that might reference assets
 */
async function findSourceFiles() {
  const patterns = [
    'src/**/*.{ts,tsx,js,jsx,css,scss,less}',
    'tests/**/*.{ts,tsx,js,jsx}',
    'index.html',
    'vite.config.ts',
    'scripts/**/*.{js,mjs}',
    '!node_modules/**',
    '!docs/**/*.{ts,tsx,js,jsx}' // Skip built files
  ];
  
  return await globby(patterns, { cwd: root, absolute: true });
}

/**
 * Extract asset references from file content
 */
function extractAssetReferences(content, filePath) {
  const references = new Set();
  
  // Various patterns for asset references
  const patterns = [
    // import statements: import img from './image.png'
    /import\s+[^'"]+\s+from\s+['"`]([^'"`]+\.(?:png|jpg|jpeg|gif|webp|avif|svg|mp3|wav|ogg|m4a|mp4|webm|mov|ttf|woff|woff2|eot|css|scss|less))['"`]/gi,
    // require: require('./image.png')
    /require\s*\(\s*['"`]([^'"`]+\.(?:png|jpg|jpeg|gif|webp|avif|svg|mp3|wav|ogg|m4a|mp4|webm|mov|ttf|woff|woff2|eot|css|scss|less))['"`]\s*\)/gi,
    // URL in CSS/JS: url('./image.png') or url("/image.png")
    /url\s*\(\s*['"`]?([^'"`\)]+\.(?:png|jpg|jpeg|gif|webp|avif|svg|mp3|wav|ogg|m4a|mp4|webm|mov|ttf|woff|woff2|eot))['"`]?\s*\)/gi,
    // src attributes: src="./image.png"
    /src\s*=\s*['"`]([^'"`]+\.(?:png|jpg|jpeg|gif|webp|avif|svg|mp3|wav|ogg|m4a|mp4|webm|mov))['"`]/gi,
    // href attributes: href="./style.css"
    /href\s*=\s*['"`]([^'"`]+\.(?:css|scss|less|ttf|woff|woff2|eot))['"`]/gi,
    // String literals that look like file paths
    /['"`]([^'"`]*\/[^'"`]*\.(?:png|jpg|jpeg|gif|webp|avif|svg|mp3|wav|ogg|m4a|mp4|webm|mov|ttf|woff|woff2|eot|css|scss|less))['"`]/gi,
    // File names without paths (for when assets are referenced by name only)
    /['"`]([^'"`\/]+\.(?:png|jpg|jpeg|gif|webp|avif|svg|mp3|wav|ogg|m4a|mp4|webm|mov|ttf|woff|woff2|eot))['"`]/gi
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const ref = match[1];
      if (ref) {
        references.add(ref);
        // Also add just the filename for loose matching
        references.add(basename(ref));
      }
    }
  }
  
  return references;
}

/**
 * Check if an asset is referenced
 */
function isAssetReferenced(assetPath, allReferences) {
  const assetName = basename(assetPath);
  const relativePath = relative(root, assetPath);
  
  // Check exact matches
  if (allReferences.has(assetPath) || 
      allReferences.has(relativePath) ||
      allReferences.has(assetName)) {
    return true;
  }
  
  // Check if any reference contains this asset name
  for (const ref of allReferences) {
    if (ref.includes(assetName) || assetName.includes(ref)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get file size in human readable format
 */
async function getFileSize(filePath) {
  try {
    const stats = await stat(filePath);
    const bytes = stats.size;
    
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  } catch {
    return 'unknown';
  }
}

/**
 * Main audit function
 */
async function auditAssets() {
  console.log('🔍 Starting assets audit...');
  
  const assetFiles = await findAssetFiles();
  const sourceFiles = await findSourceFiles();
  const allReferences = new Set();
  
  // Collect all asset references from source files
  for (const file of sourceFiles) {
    try {
      const content = await readFile(file, 'utf-8');
      const references = extractAssetReferences(content, file);
      for (const ref of references) {
        allReferences.add(ref);
      }
    } catch (error) {
      console.warn(`Warning: Could not process ${file}: ${error.message}`);
    }
  }
  
  // Check which assets are not referenced
  const unreferencedAssets = [];
  const referencedAssets = [];
  
  for (const assetPath of assetFiles) {
    if (isAssetReferenced(assetPath, allReferences)) {
      referencedAssets.push(assetPath);
    } else {
      const size = await getFileSize(assetPath);
      unreferencedAssets.push({
        path: relative(root, assetPath),
        size,
        bytes: (await stat(assetPath)).size
      });
    }
  }
  
  // Calculate total size of unreferenced assets
  const totalUnreferencedSize = unreferencedAssets.reduce((sum, asset) => sum + asset.bytes, 0);
  const totalSizeHuman = totalUnreferencedSize < 1024 * 1024 
    ? `${(totalUnreferencedSize / 1024).toFixed(1)}KB`
    : `${(totalUnreferencedSize / (1024 * 1024)).toFixed(1)}MB`;
  
  // Generate report
  const report = generateAssetsReport(unreferencedAssets, referencedAssets.length, assetFiles.length, totalSizeHuman);
  
  // Write report
  const reportPath = join(root, 'reports', 'audit-assets.md');
  await writeFile(reportPath, report, 'utf-8');
  
  console.log(`✅ Assets audit complete. Report written to ${reportPath}`);
  console.log(`📊 Found ${unreferencedAssets.length} unreferenced assets out of ${assetFiles.length} total`);
  console.log(`💾 Unreferenced assets total size: ${totalSizeHuman}`);
  
  return {
    unreferencedAssets,
    referencedAssets: referencedAssets.length,
    totalAssets: assetFiles.length,
    totalUnreferencedSize
  };
}

/**
 * Generate markdown report
 */
function generateAssetsReport(unreferencedAssets, referencedCount, totalCount, totalSize) {
  const timestamp = new Date().toISOString();
  
  return `# Asset Analysis Report

Generated: ${timestamp}

## Summary

- **Total assets analyzed**: ${totalCount}
- **Referenced assets**: ${referencedCount}
- **Unreferenced assets**: ${unreferencedAssets.length}
- **Total size of unreferenced assets**: ${totalSize}

## Unreferenced Assets

${unreferencedAssets.length === 0 
  ? '_No unreferenced assets found._' 
  : unreferencedAssets
      .sort((a, b) => b.bytes - a.bytes) // Sort by size, largest first
      .map(asset => `- \`${asset.path}\` (${asset.size})`)
      .join('\n')}

## Asset Distribution

${unreferencedAssets.length > 0 ? `
### By Directory
${Object.entries(
  unreferencedAssets.reduce((acc, asset) => {
    const dir = asset.path.split('/')[0] || 'root';
    acc[dir] = (acc[dir] || 0) + 1;
    return acc;
  }, {})
).map(([dir, count]) => `- **${dir}/**: ${count} files`).join('\n')}

### By File Type
${Object.entries(
  unreferencedAssets.reduce((acc, asset) => {
    const ext = asset.path.split('.').pop() || 'unknown';
    acc[ext] = (acc[ext] || 0) + 1;
    return acc;
  }, {})
).map(([ext, count]) => `- **.${ext}**: ${count} files`).join('\n')}
` : ''}

## Recommendations

${unreferencedAssets.length > 0 
  ? `- Review the ${unreferencedAssets.length} unreferenced assets above
- Verify if they are truly unused (some may be loaded dynamically)
- Consider removing confirmed unused assets to reduce bundle size
- Potential space savings: ${totalSize}
- Pay special attention to large files that could significantly reduce bundle size`
  : `- No cleanup needed for unreferenced assets
- Consider running this audit after adding new assets to prevent accumulation`}

## Notes

- This audit uses pattern matching to find asset references
- Dynamic asset loading may not be detected
- Some assets may be used indirectly (e.g., loaded by other assets)
- Always verify before deleting assets

---
*Generated by audit-assets.mjs*
`;
}

// Run audit if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await auditAssets();
  } catch (error) {
    console.error('❌ Assets audit failed:', error);
    process.exit(1);
  }
}

export { auditAssets };