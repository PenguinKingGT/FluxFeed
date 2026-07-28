import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PopupFooter } from '@/components/popup/PopupFooter';
import { PopupHeader } from '@/components/popup/PopupHeader';

describe('popup shell components', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders FluxFeed branding and opens dashboard', () => {
    const onOpenDashboard = vi.fn();

    render(<PopupHeader onOpenDashboard={onOpenDashboard} />);
    fireEvent.click(screen.getByLabelText('Open dashboard'));

    expect(screen.getByText('FluxFeed')).not.toBeNull();
    expect(screen.getByAltText('FluxFeed')).not.toBeNull();
    expect(onOpenDashboard).toHaveBeenCalled();
  });

  it('renders footer actions', () => {
    const onOpenSettings = vi.fn();
    const onMarkAllRead = vi.fn();

    render(<PopupFooter onOpenSettings={onOpenSettings} onMarkAllRead={onMarkAllRead} />);
    fireEvent.click(screen.getByText('Settings'));
    fireEvent.click(screen.getByText('Mark all as read'));

    expect(onOpenSettings).toHaveBeenCalled();
    expect(onMarkAllRead).toHaveBeenCalled();
  });
});
