import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { OfficerTooltip } from '@ui/components/officerTooltip';
import { initHotkeys, disposeHotkeys } from '@core/hotkeys';
import type { Officer } from '@sim/types';

// Mock officer for testing
const mockOfficer: Officer = {
  id: 'test-officer',
  name: 'Test Officer',
  level: 1,
  rank: 'Captain',
  status: 'ACTIVE',
  personality: {
    gier: 0.5,
    tapferkeit: 0.7,
    loyalitaet: 0.3,
    stolz: 0.6
  },
  traits: ['brave'],
  relationships: [],
  memories: []
};

describe('OfficerTooltip CTRL key behavior', () => {
  let tooltip: OfficerTooltip;
  let targetElement: HTMLElement;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = '';
    targetElement = document.createElement('div');
    targetElement.style.width = '100px';
    targetElement.style.height = '100px';
    document.body.appendChild(targetElement);
    
    // Initialize hotkeys system
    initHotkeys();
    
    // Create tooltip
    tooltip = new OfficerTooltip();
  });

  afterEach(() => {
    tooltip.destroy();
    disposeHotkeys();
    document.body.innerHTML = '';
  });

  it('should not show tooltip on hover without CTRL', () => {
    tooltip.show(targetElement, mockOfficer);
    
    const tooltipElement = document.querySelector('.officer-tooltip');
    expect(tooltipElement?.classList.contains('is-visible')).toBe(false);
  });

  it('should show tooltip when hovering with CTRL pressed', () => {
    // Press CTRL first
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' }));
    
    tooltip.show(targetElement, mockOfficer);
    
    const tooltipElement = document.querySelector('.officer-tooltip');
    expect(tooltipElement?.classList.contains('is-visible')).toBe(true);
  });

  it('should hide tooltip when CTRL is released while hovering', () => {
    // Press CTRL and hover
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' }));
    tooltip.show(targetElement, mockOfficer);
    
    const tooltipElement = document.querySelector('.officer-tooltip');
    expect(tooltipElement?.classList.contains('is-visible')).toBe(true);
    
    // Release CTRL
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control' }));
    
    // Tooltip should be hidden immediately
    expect(tooltipElement?.classList.contains('is-visible')).toBe(false);
  });

  it('should not show tooltip on subsequent hovers without CTRL after CTRL was pressed once', () => {
    // Press and release CTRL while not hovering
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control' }));
    
    // Now hover without CTRL
    tooltip.show(targetElement, mockOfficer);
    
    const tooltipElement = document.querySelector('.officer-tooltip');
    expect(tooltipElement?.classList.contains('is-visible')).toBe(false);
  });

  it('should show tooltip immediately when CTRL is pressed while already hovering', () => {
    // Start hovering without CTRL
    tooltip.show(targetElement, mockOfficer);
    
    const tooltipElement = document.querySelector('.officer-tooltip');
    expect(tooltipElement?.classList.contains('is-visible')).toBe(false);
    
    // Press CTRL while hovering
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' }));
    
    // Tooltip should show immediately
    expect(tooltipElement?.classList.contains('is-visible')).toBe(true);
  });
});