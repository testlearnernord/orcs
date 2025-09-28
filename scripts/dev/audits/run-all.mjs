#!/usr/bin/env node
/**
 * Run all audit scripts and generate a combined report
 */

import { auditImports } from './audit-imports.mjs';
import { auditAssets } from './audit-assets.mjs';
import { auditDuplicates } from './audit-duplicates.mjs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();

async function runAllAudits() {
  console.log('🚀 Running all audit scripts...\n');

  const startTime = Date.now();

  try {
    // Run all audits
    console.log('1️⃣ Running imports audit...');
    const importsResult = await auditImports();

    console.log('\n2️⃣ Running assets audit...');
    const assetsResult = await auditAssets();

    console.log('\n3️⃣ Running duplicates audit...');
    const duplicatesResult = await auditDuplicates();

    // Generate summary report
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const summaryReport = generateSummaryReport(
      importsResult,
      assetsResult,
      duplicatesResult,
      duration
    );

    const summaryPath = join(root, 'reports', 'audit-summary.md');
    await writeFile(summaryPath, summaryReport, 'utf-8');

    console.log(`\n✅ All audits complete! Summary written to ${summaryPath}`);
    console.log(`⏱️  Total time: ${duration}s`);

    // Print quick summary to console
    console.log('\n📊 Quick Summary:');
    console.log(
      `   • Unreferenced files: ${importsResult.unreferencedFiles.length}`
    );
    console.log(
      `   • Unreferenced assets: ${assetsResult.unreferencedAssets.length}`
    );
    console.log(
      `   • Exact duplicate groups: ${duplicatesResult.exactDuplicates.length}`
    );
    console.log(
      `   • Potential space savings: ${formatFileSize(assetsResult.totalUnreferencedSize + duplicatesResult.potentialSavings)}`
    );
  } catch (error) {
    console.error('❌ Audit run failed:', error);
    process.exit(1);
  }
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function generateSummaryReport(
  importsResult,
  assetsResult,
  duplicatesResult,
  duration
) {
  const timestamp = new Date().toISOString();

  return `# Audit Summary Report

Generated: ${timestamp}  
Duration: ${duration}s

## Overview

This report summarizes the findings from all audit scripts run on the codebase.

## Quick Stats

| Metric | Count | Notes |
|--------|-------|-------|
| **Total source files** | ${importsResult.totalFiles} | TS/TSX/JS files analyzed |
| **Unreferenced files** | ${importsResult.unreferencedFiles.length} | Files not imported anywhere |
| **Total assets** | ${assetsResult.totalAssets} | Images, audio, fonts, etc. |
| **Unreferenced assets** | ${assetsResult.unreferencedAssets.length} | Assets with no usage found |
| **Exact duplicate groups** | ${duplicatesResult.exactDuplicates.length} | Identical files (same hash) |
| **Size duplicate groups** | ${duplicatesResult.sizeDuplicates.length} | Same size, different content |
| **Name duplicate groups** | ${duplicatesResult.nameDuplicates.length} | Same name, different locations |

## Cleanup Potential

| Category | Potential Savings | Priority |
|----------|------------------|----------|
| **Unreferenced assets** | ${formatFileSize(assetsResult.totalUnreferencedSize)} | High |
| **Exact duplicates** | ${formatFileSize(duplicatesResult.potentialSavings)} | High |
| **Unreferenced code files** | ${importsResult.unreferencedFiles.length} files | Medium |

**Total potential savings**: ${formatFileSize(assetsResult.totalUnreferencedSize + duplicatesResult.potentialSavings)}

## Priority Actions

### 🔴 High Priority
${
  assetsResult.unreferencedAssets.length > 0 ||
  duplicatesResult.exactDuplicates.length > 0
    ? `- Review and remove ${assetsResult.unreferencedAssets.length} unreferenced assets
- Consolidate ${duplicatesResult.exactDuplicates.length} exact duplicate file groups
- Potential bundle size reduction: ${formatFileSize(assetsResult.totalUnreferencedSize + duplicatesResult.potentialSavings)}`
    : '- No high-priority cleanup items found'
}

### 🟡 Medium Priority
${
  importsResult.unreferencedFiles.length > 0 ||
  duplicatesResult.sizeDuplicates.length > 0
    ? `- Review ${importsResult.unreferencedFiles.length} unreferenced source files
- Investigate ${duplicatesResult.sizeDuplicates.length} size duplicate groups
- Consider name standardization for ${duplicatesResult.nameDuplicates.length} name duplicate groups`
    : '- No medium-priority cleanup items found'
}

### 🟢 Low Priority
${
  duplicatesResult.similarNames.length > 0
    ? `- Review ${duplicatesResult.similarNames.length} similar name pairs for consistency`
    : '- No low-priority cleanup items found'
}

## Detailed Reports

- [Import Analysis](./audit-imports.md) - Unreferenced files and exports
- [Asset Analysis](./audit-assets.md) - Unreferenced assets by type and size
- [Duplicate Analysis](./audit-duplicates.md) - Exact duplicates and similar files

## Recommendations

1. **Start with high-priority items** - they offer the most immediate benefit
2. **Verify before deleting** - some "unreferenced" items may be loaded dynamically
3. **Run audits regularly** - integrate into CI to prevent future accumulation
4. **Update references** - when consolidating duplicates, update all references

## Next Steps

1. Review detailed reports for specific file listings
2. Create cleanup PR with high-priority removals
3. Add audit checks to CI/CD pipeline
4. Schedule regular audit runs (monthly/quarterly)

---
*Generated by run-all.mjs*
`;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  await runAllAudits();
}
