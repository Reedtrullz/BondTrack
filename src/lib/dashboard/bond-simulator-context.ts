import { NETWORK } from '@/lib/config';
import { formatCompactNumber } from '@/lib/utils/formatters';
import type { InsightHeaderMetric, InsightSeverity, MetricStripItem } from './insights';

interface BuildBondSimulatorInsightInput {
  bondAmountRune: number;
  currentBondRune: number;
  lockDays: number;
  networkApyPercent: number;
  operatorFeeBps: number;
  hasResult: boolean;
}

export interface BondSimulatorInsightModel {
  severity: InsightSeverity;
  statusLabel: string;
  topRisk: string;
  diagnosis: string;
  primaryAction: {
    label: string;
    href: string;
  };
  headerMetrics: InsightHeaderMetric[];
  assumptionMetrics: MetricStripItem[];
}

const HIGH_APY_THRESHOLD = 100;
const HIGH_OPERATOR_FEE_BPS = 5000;

function formatRuneCompact(value: number): string {
  const compact = formatCompactNumber(Math.max(0, value)).replace(/\.0([KMBT])$/, '$1');
  return `ᚱ${compact}`;
}

function formatOperatorFee(operatorFeeBps: number): string {
  return `${(Math.max(0, operatorFeeBps) / 100).toFixed(2)}%`;
}

export function buildBondSimulatorInsight({
  bondAmountRune,
  currentBondRune,
  lockDays,
  networkApyPercent,
  operatorFeeBps,
  hasResult,
}: BuildBondSimulatorInsightInput): BondSimulatorInsightModel {
  const minimumBondRune = NETWORK.MINIMUM_BOND_RUNE / 1e8;
  const belowMinimumBond = bondAmountRune > 0 && bondAmountRune < minimumBondRune;
  const invalidInputs = !hasResult || bondAmountRune <= 0 || lockDays <= 0;
  const aggressiveAssumptions = networkApyPercent > HIGH_APY_THRESHOLD || operatorFeeBps > HIGH_OPERATOR_FEE_BPS;
  const longLockWindow = lockDays >= 365;
  const portfolioAfterRune = currentBondRune + Math.max(0, bondAmountRune);

  let severity: InsightSeverity = 'info';
  let statusLabel = 'Manual Estimate';
  let topRisk = 'Rewards-only projection';
  let diagnosis = 'This scenario estimates reward flow only. Verify node risk before bonding because slash points, jail status, churn risk, RUNE price changes, and compounding are outside the model.';
  let primaryAction = {
    label: 'Verify node risk before bonding',
    href: '#simulator-assumptions',
  };

  if (invalidInputs) {
    severity = 'warning';
    statusLabel = 'Needs Attention';
    topRisk = 'Simulator needs positive bond and lock inputs';
    diagnosis = 'Enter a positive bond amount and lock period before treating any reward projection as useful operator context.';
    primaryAction = {
      label: 'Adjust inputs',
      href: '#simulator-inputs',
    };
  } else if (belowMinimumBond) {
    severity = 'warning';
    statusLabel = 'Needs Attention';
    topRisk = 'Bond amount is below active node minimum';
    diagnosis = `This ${formatRuneCompact(bondAmountRune)} scenario cannot be evaluated as an active-node scenario until it meets the current ${formatRuneCompact(minimumBondRune)} minimum bond.`;
    primaryAction = {
      label: 'Raise bond amount',
      href: '#simulator-inputs',
    };
  } else if (aggressiveAssumptions) {
    severity = 'warning';
    statusLabel = 'Needs Attention';
    topRisk = 'Scenario depends on aggressive assumptions';
    diagnosis = 'The reward estimate relies on unusually high APY or operator fee inputs. Treat the output as a stress case, not an expected return.';
    primaryAction = {
      label: 'Review assumptions',
      href: '#simulator-assumptions',
    };
  } else if (longLockWindow) {
    topRisk = 'Long lock window needs risk review';
    diagnosis = 'The reward estimate can be reviewed, but a long lock period makes slash, jail, churn, and liquidity risk more important than the headline reward total.';
  }

  return {
    severity,
    statusLabel,
    topRisk,
    diagnosis,
    primaryAction,
    headerMetrics: [
      {
        label: 'Scenario bond',
        value: formatRuneCompact(bondAmountRune),
        detail: belowMinimumBond ? 'Below active minimum' : 'Input amount',
      },
      {
        label: 'Lock period',
        value: `${Math.max(0, lockDays)}d`,
        detail: longLockWindow ? 'Long horizon' : 'Manual APY window',
      },
      {
        label: 'Portfolio after',
        value: formatRuneCompact(portfolioAfterRune),
        detail: currentBondRune > 0 ? 'Watched bond plus scenario' : 'Scenario only',
      },
    ],
    assumptionMetrics: [
      {
        id: 'estimate-model',
        label: 'Estimate model',
        value: 'Manual APY',
        detail: 'No live source or compounding',
        severity: 'info',
      },
      {
        id: 'risk-coverage',
        label: 'Risk coverage',
        value: 'Excludes slash and jail',
        detail: 'Inspect node risk before acting',
        severity: 'warning',
      },
      {
        id: 'fee-input',
        label: 'Fee input',
        value: formatOperatorFee(operatorFeeBps),
        detail: 'Applied against rewards',
        severity: operatorFeeBps > HIGH_OPERATOR_FEE_BPS ? 'warning' : 'info',
      },
      {
        id: 'minimum-bond',
        label: 'Minimum bond',
        value: belowMinimumBond ? 'Below minimum' : 'Meets active minimum',
        detail: belowMinimumBond
          ? formatRuneCompact(minimumBondRune)
          : `${formatRuneCompact(minimumBondRune)} threshold only`,
        severity: belowMinimumBond ? 'warning' : 'info',
      },
    ],
  };
}
