import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ForensicsSection } from './ForensicsSection';

describe('ForensicsSection', () => {
  it('links to TraceLens scoped to the selected entity', () => {
    render(
      <ForensicsSection
        entityRef="app/designer/db"
        forensics={{
          complexity: 22,
          churn: 8,
          hotspotScore: 0.9,
          classifications: ['hotspot'],
        }}
      />
    );

    const link = screen.getByTestId('forensics-open-tracelens');
    expect(link).toHaveAttribute('href', '/workspace/app/designer/db?lens=tracelens');
  });

  it('renders readonly metrics and hotspot concern badge', () => {
    render(
      <ForensicsSection
        forensics={{
          complexity: 22,
          churn: 8,
          authorCount: 2,
          hotspotScore: 0.9,
          classifications: ['hotspot'],
          coupledFiles: [{ path: 'src/other.ts', score: 0.8, sharedCommits: 6 }],
        }}
      />
    );

    expect(screen.getByTestId('forensics-section')).toBeInTheDocument();
    expect(screen.getByText('TraceLens')).toBeInTheDocument();
    expect(screen.getByTestId('forensics-concern-badge')).toHaveTextContent(/Hotspot/i);
    expect(screen.getByText('22')).toBeInTheDocument();
    expect(screen.getByText('0.90')).toBeInTheDocument();
    expect(screen.getAllByText(/src\/other\.ts/).length).toBeGreaterThan(0);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('shows composite risk when blast radius is provided', () => {
    render(
      <ForensicsSection
        forensics={{
          hotspotScore: 0.8,
          complexity: 12,
          churn: 4,
        }}
        blastRadius={0.5}
      />
    );

    expect(screen.getByTestId('forensics-metric-compositeRisk')).toHaveTextContent('0.40');
    expect(screen.getByTestId('forensics-help-compositeRisk')).toHaveTextContent(/hotspotScore/i);
  });

  it('shows knowledge silo badge', () => {
    render(
      <ForensicsSection
        forensics={{
          complexity: 15,
          authorCount: 1,
          classifications: ['knowledge-silo'],
        }}
      />
    );
    expect(screen.getByTestId('forensics-concern-badge')).toHaveTextContent(/Knowledge silo/i);
  });

  it('toggles coupling lens via workspace display when peers are linked', () => {
    render(
      <ForensicsSection
        forensics={{
          coupledFiles: [{ path: 'src/other.ts', score: 0.8, sharedCommits: 6 }],
        }}
        showCoupling={false}
        focusCouplingCount={1}
      />
    );

    expect(screen.getByTestId('forensics-coupling-lens-hint')).toHaveTextContent(
      /Coupling Lens in Explorer → TraceLens → Workspace display/i
    );
  });

  it('shows focus hint when coupling lens is on and node is selected', () => {
    render(
      <ForensicsSection
        forensics={{
          coupledFiles: [{ path: 'src/other.ts', score: 0.8, sharedCommits: 6 }],
        }}
        showCoupling={true}
        hasSelectedNode={true}
        focusCouplingCount={1}
      />
    );

    expect(screen.getByTestId('forensics-coupling-lens-hint')).toHaveTextContent(
      /focusing 1 peer/i
    );
  });

  it('renders trend dashboard with churn sparkline and coupling mini graph', () => {
    render(
      <ForensicsSection
        forensics={{
          churn: 4,
          churnByWeek: [1, 0, 2, 1],
          complexity: 12,
          authorCount: 1,
          coupledFiles: [
            { path: 'src/a.ts', score: 0.9, sharedCommits: 4 },
            { path: 'src/b.ts', score: 0.5, sharedCommits: 2 },
          ],
        }}
        trendDashboard={{
          scope: 'component',
          churnByWeek: [1, 0, 2, 1],
          authorBuckets: [1, 0, 0],
          authorBucketLabels: ['1 author', '2–3', '4+'],
          complexityBuckets: [0, 0, 1, 0],
          complexityBucketLabels: ['1–5', '6–10', '11–20', '21+'],
          fileCount: 1,
        }}
        centerLabel="Analyzer"
        linkedCouplingPaths={new Set(['src/a.ts'])}
      />
    );

    expect(screen.getByTestId('forensics-trend-panel')).toBeInTheDocument();
    expect(screen.getByTestId('forensics-trend-churn')).toBeInTheDocument();
    expect(screen.getByTestId('churn-sparkline')).toBeInTheDocument();
    expect(screen.getByTestId('forensics-trend-authors')).toBeInTheDocument();
    expect(screen.getByTestId('forensics-trend-complexity')).toBeInTheDocument();
    expect(screen.getByTestId('coupling-mini-graph')).toBeInTheDocument();
    expect(screen.getByTestId('forensics-help-churnTrend')).toHaveTextContent(
      /Weekly commit count/i
    );
  });

  it('renders ownership breakdown when authors are present', () => {
    render(
      <ForensicsSection
        forensics={{
          complexity: 22,
          churn: 8,
          authorCount: 2,
          topAuthorPercent: 0.75,
          authors: [
            { email: 'alice@ex.com', commits: 6 },
            { email: 'bob@ex.com', commits: 2 },
          ],
        }}
      />
    );

    const breakdown = screen.getByTestId('forensics-ownership-breakdown');
    expect(within(breakdown).getByText('alice@ex.com')).toBeInTheDocument();
    expect(within(breakdown).getByText('bob@ex.com')).toBeInTheDocument();
    expect(within(breakdown).getByText('75%')).toBeInTheDocument();
    expect(within(breakdown).getByText('25%')).toBeInTheDocument();
  });

  it('selects coupled peer from mini graph when linked', () => {
    const onSelectCoupledPeer = vi.fn();
    render(
      <ForensicsSection
        forensics={{
          coupledFiles: [{ path: 'src/other.ts', score: 0.8, sharedCommits: 6 }],
        }}
        centerLabel="Analyzer"
        linkedCouplingPaths={new Set(['src/other.ts'])}
        onSelectCoupledPeer={onSelectCoupledPeer}
      />
    );

    fireEvent.click(screen.getByTestId('coupling-peer-other.ts'));
    expect(onSelectCoupledPeer).toHaveBeenCalledWith('src/other.ts');
  });

  it('shows helper text for the section and each metric', () => {
    render(
      <ForensicsSection
        forensics={{
          complexity: 22,
          churn: 8,
          authorCount: 2,
          hotspotScore: 0.9,
          sinceDays: 90,
          coupledFiles: [{ path: 'src/other.ts', score: 0.8, sharedCommits: 6 }],
        }}
      />
    );

    expect(screen.getByTestId('forensics-section-help')).toHaveTextContent(
      /AST complexity and recent git history/i
    );
    expect(screen.getByTestId('forensics-help-complexity')).toHaveTextContent(
      /Cyclomatic complexity/i
    );
    expect(screen.getByTestId('forensics-help-churn')).toHaveTextContent(/lookback window/i);
    expect(screen.getByTestId('forensics-help-hotspotScore')).toHaveTextContent(
      /complexity × churn/i
    );
    expect(screen.getByTestId('forensics-help-lookback')).toHaveTextContent(/Git history window/i);
    expect(screen.getByText('90d')).toBeInTheDocument();
    expect(screen.getByTestId('forensics-help-coupled')).toHaveTextContent(/temporal coupling/i);
  });

  it('renders dual churn windows and acceleration when present', () => {
    render(
      <ForensicsSection
        forensics={{
          churn: 12,
          churn30: 5,
          churn365: 12,
          shortChurnDays: 30,
          sinceDays: 365,
        }}
      />
    );

    expect(screen.getByTestId('forensics-metric-churn30')).toHaveTextContent('5');
    expect(screen.getByTestId('forensics-metric-churn365')).toHaveTextContent('12');
    expect(screen.getByTestId('forensics-metric-churnAccel')).toHaveTextContent(/monthly/i);
    expect(screen.queryByTestId('forensics-metric-churn')).not.toBeInTheDocument();
    expect(screen.getByTestId('forensics-help-churnAccel')).toHaveTextContent(/accelerating/i);
  });

  it('renders imported files and selects linked peers', () => {
    const onSelectImportPeer = vi.fn();
    render(
      <ForensicsSection
        forensics={{
          importedFiles: [
            { path: 'src/util.ts', kind: 'direct' },
            { path: 'src/off-canvas.ts', kind: 'direct' },
          ],
        }}
        linkedImportPaths={new Set(['src/util.ts'])}
        onSelectImportPeer={onSelectImportPeer}
      />
    );

    expect(screen.getByTestId('forensics-help-imported')).toHaveTextContent(/static import/i);
    fireEvent.click(screen.getByTestId('import-peer-util.ts'));
    expect(onSelectImportPeer).toHaveBeenCalledWith('src/util.ts');
    expect(screen.getByTestId('import-peer-unlinked-off-canvas.ts')).toBeDisabled();
  });
});
