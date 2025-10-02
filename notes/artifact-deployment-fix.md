# Artifact Deployment Fix

## Issue
When trying to merge and deploy PRs to the test-branch, the deployment workflow was experiencing artifacts issues, preventing successful deployment to GitHub Pages.

## Root Cause
The repository was tracking build artifacts (~5.3MB) in the `docs/assets/` directory:
- `docs/assets/archetypes/` (8 files, ~4.5MB) - archetype icons
- `docs/assets/battlesystem/` (44 files, ~824KB) - battle system sprites

These files are generated during the build process and should not be committed to version control.

## Solution
1. Added `docs/assets/archetypes/` to `.gitignore`
2. Removed 52 tracked build artifact files using `git rm --cached`

## Impact
- **Reduced repository size**: Removed ~5.3MB of unnecessary files
- **Eliminated merge conflicts**: Build artifacts won't cause conflicts in future PRs
- **Faster deployments**: CI/CD workflows complete faster without large artifact files
- **Proper separation**: Build artifacts are generated during CI/CD, not stored in git

## How It Works Now

### Files Tracked by Git (GitHub Pages deployment)
- `docs/index.html` - entry point
- `docs/assets/index-*.js` - Vite bundled JavaScript
- `docs/assets/index-*.css` - Vite bundled CSS  
- `docs/assets/orcs/portraits/*.png` - portrait atlases
- `docs/assets/archer-*.png`, `docs/assets/berserker-*.png`, `docs/assets/trapper-*.png` - Vite bundled archetype images

### Files Generated During Build (NOT tracked)
- `docs/assets/archetypes/` - copied by `copy-archetypes.mjs` during build
- `docs/assets/battlesystem/` - copied by `copy-battlesystem.mjs` during build
- `docs/assets/maps/` - copied by `copy-maps.mjs` during build

### Build Process
1. `prebuild`: Copies assets from `src/` to `docs/` (production mode)
2. `build`: Vite bundles the application
3. `postbuild`: Copies additional assets for development server

## Verification
✅ All tests pass (31 test files, 114 tests)
✅ Type checking passes
✅ Build completes successfully
✅ Portrait guards pass
✅ Git doesn't track build artifacts
✅ Build artifacts are regenerated correctly

## Note
The archetype images are handled in two ways:
1. **During development/build**: Imported via ES modules in `src/ui/components/officerCard.ts`, Vite bundles them with hashed names (e.g., `archer-DWrfYdnR.png`)
2. **Additional copies**: The `copy-archetypes.mjs` script creates additional copies in `docs/assets/archetypes/` for compatibility, but these are now properly ignored by git

This dual approach ensures compatibility while maintaining clean version control.
