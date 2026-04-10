import useSWR from 'swr';

export interface ChangelogItem {
  id: string;
  title: string;
  date: string;
  fullDate: string;
  content: ChangelogEntry[];
}

export interface ChangelogEntry {
  type: 'update' | 'adr' | 'chain' | 'feature' | 'bug';
  title: string;
  description: string;
  links?: { text: string; url: string }[];
}

const CHANGELOG_DATA: ChangelogItem[] = [
  {
    id: 'mar-2026',
    title: 'March 2026',
    date: 'Apr 1, 2026',
    fullDate: 'April 1, 2026',
    content: [
      {
        type: 'update',
        title: 'Update v3.16',
        description: 'On 5-Mar, update v3.16 was adopted. Shortly thereafter, Solana trading was unhalted after a double-spend bug was patched (Solana was previously halted since 25-Feb due to the bug). However, there was an EVM bug which necessitated halting of EVM chains. After patch v3.16.1 was pushed, EVM chains were re-enabled.',
        links: [
          { text: 'v3.16.0 Release', url: 'https://gitlab.com/thorchain/thornode/-/releases/v3.16.0' }
        ]
      },
      {
        type: 'adr',
        title: 'ADR-23: Reserve Restructuring',
        description: 'On 6-Mar, nodes were called to vote on ADR-23. On 19-Mar, the ADR was passed. Implementation is expected with update v3.17.',
        links: [
          { text: 'ADR-023: RUNE Supply Restructure', url: 'https://gitlab.com/boonew/thornode/-/blob/develop/docs/architecture/adr-023-rune-supply-restructure.md' }
        ]
      },
      {
        type: 'update',
        title: 'Update v3.16.2',
        description: 'On 13-Mar, v3.16.2 was pushed to resolve a bug with LTC/UTXO vault churning.',
      },
      {
        type: 'adr',
        title: 'ADR-24: System Income to Protocol Owned Liquidity',
        description: 'On 15-Mar, node started voting on ADR-24: Revenue to POL.',
        links: [
          { text: 'ADR-024: Revenue POL', url: 'https://gitlab.com/boonew/thornode/-/blob/develop/docs/architecture/adr-024-revenue-pol.md' }
        ]
      },
      {
        type: 'chain',
        title: 'Nine Realms Transition',
        description: 'On 17-Mar, announcement made about Nine Realms transition.',
      }
    ]
  },
  {
    id: 'feb-2026',
    title: 'February 2026',
    date: 'Mar 2, 2026',
    fullDate: 'March 2, 2026',
    content: [
      {
        type: 'bug',
        title: 'Ethereum Auto-solvency Halt Bifrost Issue',
        description: 'Starting on 1-Feb, Ethereum Chain Auto-solvency kept halting, due to a Bifrost issue. On 3-Feb, update v3.15.1 was released to patch this.',
      },
      {
        type: 'adr',
        title: 'ADR-022 Per Block Swap Scoring',
        description: 'On 3-Feb, ADR-022 was formally published. With no nodes dissenting, this will be implemented in v3.16.',
        links: [
          { text: 'ADR-022 MR', url: 'https://gitlab.com/thorchain/thornode/-/merge_requests/4436/diffs' }
        ]
      },
      {
        type: 'bug',
        title: 'Tron Stuck Outbound Issue',
        description: 'Starting on 6-Feb, many Tron outbounds were stuck. On 9-Feb, update v3.15.2 was released to patch this.',
      },
      {
        type: 'bug',
        title: 'Limit Swap Bug',
        description: 'On 16-Feb, a bug was identified for Limit Swaps, and Limit Swaps were suspended until patch on v3.16.',
      },
      {
        type: 'adr',
        title: 'ADR-023: Reserve Supply Restructure',
        description: 'On 17-Feb, ADR-023 was formally published. There will be a full node vote for this ADR.',
        links: [
          { text: 'ADR-023: RUNE Supply Restructure', url: 'https://gitlab.com/boonew/thornode/-/blob/develop/docs/architecture/adr-023-rune-supply-restructure.md' }
        ]
      },
      {
        type: 'feature',
        title: 'Solana Launched!',
        description: 'On 22-Feb, Solana Asgard Vaults were created during node churn. On 24-Feb, the Solana pool was seeded, and trading was enabled. On 26-Feb, Solana trading was halted due to a double-spend bug. Patch expected on v3.16.',
      }
    ]
  },
  {
    id: 'jan-2026',
    title: 'January 2026',
    date: 'Feb 11, 2026',
    fullDate: 'February 11, 2026',
    content: [
      {
        type: 'bug',
        title: 'Limit Orders, LP Actions and Churns Paused',
        description: 'On 12-Jan, Limit Orders, LP actions (add/withdraw) and Churns were paused, due to a responsible disclosure. This was resolved after 22-Jan with update v3.15.',
      },
      {
        type: 'bug',
        title: 'Bitcoin Cash Trading Paused',
        description: 'On 13-Jan, nodes paused BCH trading due a bug when sending to P2SH addresses. This was resolved after 22-Jan with update v3.15.',
      },
      {
        type: 'chain',
        title: 'XRP Halt',
        description: 'On 17-Jan, XRP was halted due to a config upgrade issue. Patch was done and XRP unhalted on 20-Jan.',
      },
      {
        type: 'update',
        title: 'Update v3.15',
        description: 'On 22-Jan, update v3.15 was adopted.',
        links: [
          { text: 'v3.15.0 Release', url: 'https://gitlab.com/thorchain/thornode/-/releases/v3.15.0' },
          { text: 'Blog Post', url: 'https://blog.thorchain.org/protocol-upgrade-v3-15-0/' }
        ]
      },
      {
        type: 'feature',
        title: 'Solana Chain Preparation',
        description: 'On 23-Jan, nodes started their preparation for Solana.',
      }
    ]
  },
  {
    id: 'dec-2025',
    title: 'December 2025',
    date: 'Jan 5, 2026',
    fullDate: 'January 5, 2026',
    content: [
      {
        type: 'update',
        title: 'Update v3.14',
        description: 'December saw the release of v3.14 with various improvements and bug fixes.',
      },
      {
        type: 'feature',
        title: 'Advanced Trading Features',
        description: 'Continued enhancements to the Advanced Swap Queue and limit order functionality.',
      }
    ]
  },
  {
    id: 'nov-2025',
    title: 'November 2025',
    date: 'Dec 8, 2025',
    fullDate: 'December 8, 2025',
    content: [
      {
        type: 'update',
        title: 'Update v3.12.0',
        description: 'On 4-Nov, v3.12.0 was updated.',
        links: [
          { text: 'v3.12.0 Release', url: 'https://gitlab.com/thorchain/thornode/-/releases/v3.12.0' }
        ]
      },
      {
        type: 'feature',
        title: 'Limit Orders Enabled',
        description: 'On 6-Nov, Limit Orders were enabled.',
        links: [
          { text: 'Advanced Swap Queue', url: 'https://dev.thorchain.org/swap-guide/advanced-swap-queue.html' }
        ]
      },
      {
        type: 'feature',
        title: 'Memoless Enabled',
        description: 'On 6-Nov, Memoless was enabled. Very soon after, swap.thorchain.org also implemented it.',
        links: [
          { text: 'Memoless Documentation', url: 'https://dev.thorchain.org/concepts/memos.html#reference-memo---memoless-transactions' }
        ]
      },
      {
        type: 'bug',
        title: 'Mimir Change for Advanced Swap Queue Bug Fix',
        description: 'On 14-Nov, a bug found for the Advanced Swap Queue (i.e. Limit Swaps) necessitated a mimir change for the Derived Min Depth.',
      },
      {
        type: 'bug',
        title: 'UTXO Trading and Signing Paused',
        description: 'On 15-Nov, a responsibly disclosed potential exploit led to a trading halt, adoption of patch v3.12.2, before trading reenabled after around 7.5 hours.',
      },
      {
        type: 'update',
        title: 'Update v3.13.0',
        description: 'On 20-Nov, v3.13.0 was updated.',
        links: [
          { text: 'v3.13.0 Release', url: 'https://gitlab.com/thorchain/thornode/-/releases/v3.13.0' }
        ]
      },
      {
        type: 'feature',
        title: 'Mimir Change Proposal: Improving Swap Queue Throughput',
        description: 'On 25-Nov, devs proposed to amend the MinSwapsPerBlock mimir to improve the swap queue throughput. This was passed on 1-Dec.',
      }
    ]
  }
];

async function fetcher() {
  // In a real implementation, this could fetch from an API or RSS feed
  // For now, we return the static data
  return CHANGELOG_DATA;
}

export function useChangelogs() {
  const { data, error, isLoading, mutate } = useSWR<ChangelogItem[]>(
    'changelogs',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  return {
    changelogs: data || [],
    isLoading,
    isError: !!error,
    refresh: mutate,
  };
}

export function getTypeColor(type: ChangelogEntry['type']) {
  switch (type) {
    case 'update':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    case 'adr':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800';
    case 'chain':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800';
    case 'feature':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
    case 'bug':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
    default:
      return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
  }
}

export function getTypeLabel(type: ChangelogEntry['type']) {
  switch (type) {
    case 'update':
      return 'Protocol Update';
    case 'adr':
      return 'ADR';
    case 'chain':
      return 'Chain Status';
    case 'feature':
      return 'New Feature';
    case 'bug':
      return 'Bug Fix';
    default:
      return 'Update';
  }
}