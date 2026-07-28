import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Favicon } from '@/components/popup/Favicon';

describe('Favicon', () => {
  afterEach(() => {
    cleanup();
  });

  it('uses the local fallback icon by default', () => {
    render(<Favicon url="https://example.com/article" title="Example" />);

    const image = screen.getByRole('img', { name: 'Example' });
    expect(image.getAttribute('src')).toContain('data:image/svg+xml');
  });

  it('shows the feed image when provided', () => {
    render(<Favicon url="https://example.com/article" title="Example" imageUrl="https://example.com/icon.png" />);

    const image = screen.getByRole('img', { name: 'Example' });
    expect(image.getAttribute('src')).toBe('https://example.com/icon.png');
  });

  it('falls back to the local default icon when the feed image fails', () => {
    render(<Favicon url="https://example.com/article" title="Example" imageUrl="https://example.com/icon.png" />);

    fireEvent.error(screen.getByRole('img', { name: 'Example' }));

    expect(screen.getByRole('img', { name: 'Example' }).getAttribute('src')).toContain('data:image/svg+xml');
  });
});
