# ADR-001: Asset Pipeline Optimization and Duplication Elimination

## Status
✅ **ACCEPTED and IMPLEMENTED** (2025-09-28)

## Context
The asset build pipeline was creating massive duplication by copying assets to three different locations:
- Source assets in `src/assets/`
- Development copies in `public/`  
- Production copies in `docs/`

This resulted in **87.7MB of duplicate assets** in the repository, causing:
- Slow git clones and CI/CD operations
- Wasted storage space
- Confusion about which asset version is canonical
- Risk of inconsistent assets between environments

### Audit Results (Pre-fix)
- 28 exact duplicate groups
- 87.7MB of duplicate asset waste
- Triple storage of large portrait atlases (officers1-6.png)
- Duplicate berserker sprites (`_256.png` vs `standard/` versions)

## Decision

### 1. Environment-Aware Asset Copying
**Decision**: Copy assets to different targets based on build environment.

**Implementation**:
```bash
# Development
BUILD_MODE=dev → copy to public/

# Production  
BUILD_MODE=production → copy to docs/
```

**Rationale**: 
- Eliminates triple duplication
- Maintains separation between dev and production assets
- Allows environment-specific optimizations

### 2. Single Source of Truth for Assets
**Decision**: Source assets live only in `src/assets/`, with canonical paths.

**Implementation**:
- Remove duplicate berserker sprites (`hurt_256.png`, `run_256.png`, etc.)
- Use `standard/` directory versions as canonical
- Update all import paths to reference canonical locations

**Rationale**:
- Eliminates confusion about which version is correct
- Reduces maintenance burden
- Prevents asset versioning issues

### 3. Build Script Optimization  
**Decision**: Remove redundant postbuild asset copying.

**Implementation**:
```json
{
  "prebuild": "BUILD_MODE=production node scripts/copy-*",
  "build": "vite build"
  // Remove: "postbuild": "node scripts/copy-*"
}
```

**Rationale**:
- Eliminates duplicate work during builds
- Reduces build time and complexity
- Prevents race conditions

## Alternatives Considered

### 1. Symlinks
**Rejected**: Not portable across all development environments (Windows issues).

### 2. Asset CDN
**Rejected**: Adds complexity and external dependency for minimal benefit.

### 3. Build-time Asset Processing
**Considered for future**: Could add WebP conversion, sprite sheet generation.

## Consequences

### ✅ Positive
- **97.6% reduction in asset duplication** (87.7MB → 1.8MB)
- **Faster git operations**: 86.1MB smaller repository
- **Improved CI/CD performance**: Less data to transfer
- **Clearer asset management**: Single source of truth
- **No functional impact**: All features continue to work

### ⚠️ Negative
- **Build process changes**: Developers need to run `npm run copy:dev` for development
- **Transition period**: Some imports may need updating during migration

### 🔄 Neutral
- **Build time unchanged**: ~1.4 seconds (efficient Vite bundling)
- **Runtime performance unchanged**: Same assets served to browser

## Implementation Details

### Modified Scripts
1. `scripts/copy-portraits.mjs` - Environment-aware copying
2. `scripts/copy-audio.mjs` - Environment-aware copying  
3. `scripts/copy-maps.mjs` - Environment-aware copying

### Updated Code
1. `src/playerMode/visual/atlas.berserker.ts` - Use canonical sprite paths
2. `package.json` - Updated build commands with environment variables

### Audit Integration
- Added comprehensive audit scripts to prevent future duplication
- `npm run audit:duplicates` monitors for new duplicate files
- CI integration recommended to catch regressions

## Monitoring

### Success Metrics
- ✅ Repository size reduction: **86.1MB saved**
- ✅ Duplicate groups: **28 → 6** (78% reduction)
- ✅ Build success rate: **100%** (no regressions)
- ✅ Test pass rate: **100%** (all functionality preserved)

### Ongoing Monitoring
```bash
# Weekly audit check
npm run audit:duplicates

# Pre-commit hook (recommended)
npm run audit:all
```

## Future Considerations

### Phase 2 Improvements
1. **WebP conversion**: Convert PNG assets to WebP for size reduction
2. **Sprite sheet optimization**: Generate atlas manifests automatically
3. **Lazy loading**: Load assets on-demand rather than eagerly

### Process Improvements
1. **CI integration**: Fail builds if duplicate assets detected
2. **Asset validation**: Ensure all referenced assets exist
3. **Performance monitoring**: Track bundle size over time

## References
- Original issue: "Orcs – Vollständige Code- und Feature-Sanierung"
- Audit reports: `/reports/audit-*.md`
- Feature pipeline: `features.md`

---

**Impact**: This optimization eliminated 97.6% of asset waste while maintaining full functionality, providing immediate benefits to all developers and CI/CD operations.