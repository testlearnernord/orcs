import { describe, expect, it, beforeEach, afterEach } from 'vitest';
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

  it('should not show tooltip on subsequent hovers after CTRL-hover-release sequence', () => {
    // Press CTRL and hover to show tooltip
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' }));
    tooltip.show(targetElement, mockOfficer);

    const tooltipElement = document.querySelector('.officer-tooltip');
    expect(tooltipElement?.classList.contains('is-visible')).toBe(true);

    // Release CTRL while hovering (this should hide tooltip)
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control' }));
    expect(tooltipElement?.classList.contains('is-visible')).toBe(false);

    // Move away and hover on different officer without CTRL
    tooltip.scheduleHideFromTarget();
    tooltip.show(targetElement, mockOfficer);

    // Tooltip should not show because CTRL is not pressed
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

  it('should not show tooltip when hovering different officers after CTRL was released (reproduces issue)', () => {
    // Create a second target element to simulate different officers
    const secondTargetElement = document.createElement('div');
    secondTargetElement.style.width = '100px';
    secondTargetElement.style.height = '100px';
    document.body.appendChild(secondTargetElement);

    const secondMockOfficer: Officer = {
      ...mockOfficer,
      id: 'second-officer',
      name: 'Second Officer'
    };

    // Step 1: Press CTRL and hover over first officer (tooltip should show)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' }));
    tooltip.show(targetElement, mockOfficer);

    const tooltipElement = document.querySelector('.officer-tooltip');
    expect(tooltipElement?.classList.contains('is-visible')).toBe(true);

    // Step 2: Release CTRL while still hovering (tooltip should hide)
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control' }));
    expect(tooltipElement?.classList.contains('is-visible')).toBe(false);

    // Step 3: Move away from first officer
    tooltip.scheduleHideFromTarget();

    // Step 4: Hover over second officer WITHOUT pressing CTRL
    tooltip.show(secondTargetElement, secondMockOfficer);

    // Step 5: Tooltip should NOT be visible because CTRL is not pressed
    expect(tooltipElement?.classList.contains('is-visible')).toBe(false);

    // Cleanup
    secondTargetElement.remove();
  });

  it('should not show tooltip when quickly switching between officers without CTRL after previous CTRL usage', () => {
    // This test simulates the exact issue: user presses CTRL, sees tooltip, 
    // releases CTRL, then hovers over different officers without CTRL
    
    const secondTargetElement = document.createElement('div');
    const thirdTargetElement = document.createElement('div');
    document.body.appendChild(secondTargetElement);
    document.body.appendChild(thirdTargetElement);

    const secondOfficer: Officer = { ...mockOfficer, id: 'officer-2', name: 'Officer 2' };
    const thirdOfficer: Officer = { ...mockOfficer, id: 'officer-3', name: 'Officer 3' };

    // 1. CTRL + hover first officer -> tooltip shows
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' }));
    tooltip.show(targetElement, mockOfficer);
    
    const tooltipElement = document.querySelector('.officer-tooltip');
    expect(tooltipElement?.classList.contains('is-visible')).toBe(true);

    // 2. Release CTRL -> tooltip hides
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control' }));
    expect(tooltipElement?.classList.contains('is-visible')).toBe(false);

    // 3. Without calling scheduleHideFromTarget, directly hover second officer (no CTRL)
    // This might reproduce the bug if state isn't properly cleared
    tooltip.show(secondTargetElement, secondOfficer);
    expect(tooltipElement?.classList.contains('is-visible')).toBe(false);

    // 4. Hover third officer (no CTRL)
    tooltip.show(thirdTargetElement, thirdOfficer);
    expect(tooltipElement?.classList.contains('is-visible')).toBe(false);

    // Cleanup
    secondTargetElement.remove();
    thirdTargetElement.remove();
  });

  it('should properly handle state when CTRL is released while tooltip is animating', () => {
    // Test the specific edge case where hide() doesn't clear all state
    
    // 1. CTRL + hover -> tooltip shows
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' }));
    tooltip.show(targetElement, mockOfficer);
    
    const tooltipElement = document.querySelector('.officer-tooltip');
    expect(tooltipElement?.classList.contains('is-visible')).toBe(true);

    // 2. Release CTRL (this calls hide() but animation might still be running)
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control' }));
    
    // At this point, tooltip should be hidden but animation might be running
    // The isHovering and currentOfficer state might still be set incorrectly
    
    // 3. Immediately hover different officer without CTRL
    const secondTargetElement = document.createElement('div');
    document.body.appendChild(secondTargetElement);
    const secondOfficer: Officer = { ...mockOfficer, id: 'officer-2', name: 'Officer 2' };
    
    tooltip.show(secondTargetElement, secondOfficer);
    
    // Tooltip should NOT be visible
    expect(tooltipElement?.classList.contains('is-visible')).toBe(false);
    
    // Cleanup
    secondTargetElement.remove();
  });

  it('should handle race condition between hide animation and new show call', async () => {
    // This test specifically checks if there's a race condition with the animation
    
    // 1. CTRL + hover -> tooltip shows
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' }));
    tooltip.show(targetElement, mockOfficer);
    
    const tooltipElement = document.querySelector('.officer-tooltip');
    expect(tooltipElement?.classList.contains('is-visible')).toBe(true);

    // 2. Release CTRL -> triggers hide() with animation
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control' }));
    
    // 3. Immediately (before animation finishes) try to show on another officer without CTRL
    const secondTargetElement = document.createElement('div');
    document.body.appendChild(secondTargetElement);
    const secondOfficer: Officer = { ...mockOfficer, id: 'officer-2', name: 'Officer 2' };
    
    // This should not show the tooltip since CTRL is not pressed
    tooltip.show(secondTargetElement, secondOfficer);
    
    // Even if animation is still running, tooltip should not be considered visible for new officer
    expect(tooltipElement?.classList.contains('is-visible')).toBe(false);
    
    // Wait for animation to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // After animation, tooltip should definitely not be visible
    expect(tooltipElement?.classList.contains('is-visible')).toBe(false);
    
    // Cleanup
    secondTargetElement.remove();
  });
});
