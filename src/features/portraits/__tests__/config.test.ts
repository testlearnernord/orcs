import { describe, expect, it } from 'vitest';
import { PORTRAIT_SET_DEFINITIONS } from '../config';

describe('Portrait Configuration', () => {
  it('should have 6 officer portrait sheets', () => {
    const officerSheets = PORTRAIT_SET_DEFINITIONS.filter((def) =>
      def.tags.includes('officer')
    );
    expect(officerSheets).toHaveLength(6);
  });

  it('should have 96 total officer portraits', () => {
    const officerSheets = PORTRAIT_SET_DEFINITIONS.filter((def) =>
      def.tags.includes('officer')
    );
    const totalPortraits = officerSheets.reduce(
      (total, sheet) => total + sheet.cols * sheet.rows,
      0
    );
    expect(totalPortraits).toBe(96);
  });

  it('should include officers4, officers5, and officers6 sheets', () => {
    const sheetIds = PORTRAIT_SET_DEFINITIONS.map((def) => def.id);
    expect(sheetIds).toContain('officers4');
    expect(sheetIds).toContain('officers5');
    expect(sheetIds).toContain('officers6');
  });
});
