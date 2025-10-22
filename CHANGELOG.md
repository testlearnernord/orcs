# Changelog

## [Unreleased]

### Balance

- **Empirical Balancing Analysis v1.0** - Comprehensive simulation analysis tool
  - Created `tests/balancing/empirical-analysis.spec.ts` to empirically analyze SPECTATE mode
  - Analyzes 7 key metrics: King survival, career progression, alliances, clashes, POTENTIAL impact, RPG parameters, and memorability
  - Generated detailed balancing report in `reports/empirical-balancing-report.md`

- **Promotion Thresholds Adjusted** for better career progression
  - Grunzer → Späher: 200 → 150 merit (faster progression)
  - Späher → Captain: 400 → 300 merit (more officers reach Captain)
  - **Result:** Captain progression increased from 2% to 11.2%, Späher to 29%

- **Experience Gain Increased** for more meaningful level progression
  - Merit to experience conversion: 0.8x → 1.0x
  - **Result:** Average officer level increased from 2.18 to 3.23

- **Merit Gains Boosted** with potential-based bonuses
  - Base successful warcall merit: 20 → 25
  - Added POTENTIAL-based merit bonuses: Genie +8, Überdurchschnittlich +5, Fähig +3, Normal +0, Dumm -2, Unbrauchbar -5
  - **Result:** POTENTIAL now significantly impacts career progression

- **Alliance Formation Reduced** for better political dynamics
  - Spawn relationship attempts: 40% → 30% chance for 2 relationships
  - Rival formation: 30% → 20%
  - Ally formation: 60% → 45%
  - **Result:** Alliance events reduced from 14.9 to 9.0 per 100 cycles

### Changed

- Updated promotion threshold tests to reflect new balanced values

### Documentation

- Added comprehensive empirical balancing report documenting simulation analysis and improvements
- Report includes before/after comparisons, statistical analysis, and recommendations

## [1.0.0] - 2023-10-01

### Added

- First release of the project.
