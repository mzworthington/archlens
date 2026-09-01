import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CollabCursorMarkers } from './CollabCursors';

describe('CollabCursorMarkers', () => {
  it('renders peer names as text so markup stays literal', () => {
    render(
      <CollabCursorMarkers
        cursors={[
          { clientId: 2, name: '<script>alert(1)</script>', color: '#a78bfa', x: 12, y: 24 },
        ]}
      />
    );

    expect(screen.getByTestId('collab-cursor-2')).toHaveTextContent('<script>alert(1)</script>');
  });
});
