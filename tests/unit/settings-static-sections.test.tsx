import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ShortcutsSection } from '@/components/settings/ShortcutsSection';

describe('settings static sections', () => {
  afterEach(() => cleanup());

  it('renders shortcuts with kbd styling', () => {
    render(<ShortcutsSection />);

    expect(screen.getByText('Previous article')).not.toBeNull();
    expect(screen.getByText('Next article')).not.toBeNull();
    expect(screen.getByText('Mark as Read')).not.toBeNull();
    expect(screen.getByText('Open original')).not.toBeNull();
    expect(screen.getByText('Star / Unstar')).not.toBeNull();
    expect(screen.getByText('←').className).toContain('bg-accent');
    expect(screen.getByText('←').className).toContain('font-mono');
  });

});
