import { useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { SettingsTextField } from '@/components/settings/SettingsTextField';

/** Simulates saved values that trim whitespace while a user is still editing. */
function ConfirmedTextField({ multiline }: { multiline: boolean }) {
  const [confirmed, setConfirmed] = useState('');
  return (
    <SettingsTextField
      aria-label="Preference"
      multiline={multiline}
      value={confirmed}
      onValueChange={(next) => setConfirmed(next.trim())}
    />
  );
}

describe('settings text field', () => {
  afterEach(cleanup);

  it.each([false, true])('preserves spaces during typing and shows confirmed text on blur (multiline: %s)', async (multiline) => {
    const user = userEvent.setup();
    render(<ConfirmedTextField multiline={multiline} />);
    const field = screen.getByRole('textbox', { name: 'Preference' });

    await user.type(field, 'hello world ');

    expect(field).toHaveProperty('value', 'hello world ');
    await user.tab();
    expect(field).toHaveProperty('value', 'hello world');
  });
});
