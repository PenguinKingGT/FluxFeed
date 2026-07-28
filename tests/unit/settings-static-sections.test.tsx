import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ShortcutsSection } from '@/components/settings/ShortcutsSection';

describe('settings static sections', () => {
  afterEach(() => cleanup());

  it('renders shortcuts with kbd styling', () => {
    render(<ShortcutsSection />);

    expect(screen.getByText('Next / Previous Article')).not.toBeNull();
    expect(screen.getByText('Mark as Read')).not.toBeNull();
    expect(screen.getByText('Open in Background')).not.toBeNull();
    expect(screen.getByText('Star / Unstar')).not.toBeNull();
    expect(screen.getByText('J').className).toContain('bg-accent');
    expect(screen.getByText('J').className).toContain('font-mono');
  });

});
