import type { SimulationResult } from './simulation';

export type TelemetryViewMode = 'sre' | 'executive';

export type ResilienceRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ExecutiveTelemetrySummary {
  availabilityHeadline: string;
  integrityHeadline: string;
  riskLevel: ResilienceRiskLevel;
  riskLabel: string;
  continuitySummary: string;
  spofSummary: string | null;
  /** Revenue and user-journey mapping ships in a later iteration. */
  journeyImpactDeferred: true;
}

const RISK_LABELS: Record<ResilienceRiskLevel, string> = {
  low: 'Low risk',
  medium: 'Elevated risk',
  high: 'High risk',
  critical: 'Critical risk',
};

export function riskLevelFromSla(sla: number): ResilienceRiskLevel {
  if (sla >= 99) return 'low';
  if (sla >= 95) return 'medium';
  if (sla >= 90) return 'high';
  return 'critical';
}

function countAffectedDomains(result: SimulationResult): number {
  return new Set([...result.impactedDomains, ...result.integrityImpactedDomains]).size;
}

export function buildExecutiveTelemetrySummary(
  result: SimulationResult
): ExecutiveTelemetrySummary {
  const riskLevel = riskLevelFromSla(result.overallSla);
  const domainsAffected = countAffectedDomains(result);
  const noAvailabilityImpact = result.overallSla >= 100 && result.impactedDomains.length === 0;
  const noIntegrityImpact =
    result.overallIntegrity >= 100 || result.integrityImpactedNodes.length === 0;

  const availabilityHeadline = noAvailabilityImpact
    ? 'Customer-facing availability is unchanged for this fault.'
    : `Roughly ${result.overallSla.toFixed(0)}% of entry-point traffic would remain available.`;

  const integrityHeadline = noIntegrityImpact
    ? 'Data streams appear consistent for this scenario.'
    : `Data correctness drops to about ${result.overallIntegrity.toFixed(0)}% on affected async paths.`;

  let continuitySummary = 'No business domains show availability degradation.';
  if (domainsAffected > 0) {
    const noun = domainsAffected === 1 ? 'domain' : 'domains';
    continuitySummary = `${domainsAffected} business ${noun} may experience degraded service.`;
  } else if (!noIntegrityImpact) {
    continuitySummary = 'Services may stay up but some domains risk stale or missed events.';
  }

  const spofSummary =
    result.spofs.length > 0
      ? `${result.spofs.length} structural single ${
          result.spofs.length === 1 ? 'point' : 'points'
        } of failure remain in the architecture.`
      : null;

  return {
    availabilityHeadline,
    integrityHeadline,
    riskLevel,
    riskLabel: RISK_LABELS[riskLevel],
    continuitySummary,
    spofSummary,
    journeyImpactDeferred: true,
  };
}
