export interface LearnArticleSection {
  heading: string;
  body?: string[];
  list?: {
    kind: 'ordered' | 'unordered';
    label: string;
    items: string[];
  };
}

export interface LearnArticle {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  priority: string;
  useCase: string;
  dashboard: {
    label: string;
    href: string;
  };
  sections: LearnArticleSection[];
  nextSteps: Array<{
    label: string;
    href: string;
  }>;
}

export const articles: LearnArticle[] = [
  {
    slug: 'what-is-thorchain',
    title: 'What is THORChain?',
    description: 'Introduction to THORChain decentralized liquidity protocol',
    date: '2026-05-03',
    readTime: '5 min read',
    priority: 'Foundation',
    useCase: 'someone needs the protocol model before interpreting dashboard readings.',
    dashboard: {
      label: 'Command Center',
      href: '/dashboard',
    },
    sections: [
      {
        heading: 'Why it matters',
        body: [
          'THORChain is a decentralized liquidity protocol that lets users swap assets across different blockchains without a centralized exchange. For Heimdall users, the key point is operational: swaps, liquidity pools, and bonded nodes all affect RUNE demand, node incentives, and bond risk.',
        ],
      },
      {
        heading: 'Key Features',
        list: {
          kind: 'unordered',
          label: 'Key Features points',
          items: [
            '**Cross-Chain Swaps**: Swap BTC, ETH, RUNE, and other assets directly between blockchains.',
            '**Liquidity Pools**: Provide liquidity to earn fees and rewards.',
            '**Node Bonding**: Bond RUNE to operate a node or support an operator and earn block rewards.',
            '**Observed Risk Surface**: Track churn, jail, slashing, and source freshness before making bond decisions.',
          ],
        },
      },
      {
        heading: 'How It Works',
        body: [
          'THORChain uses a network of nodes that validate transactions and maintain liquidity pools. Nodes bond RUNE as collateral, and that bond can be affected by network status, node behavior, and operator configuration.',
        ],
      },
      {
        heading: 'Why Bond RUNE?',
        body: [
          'Bonding RUNE to a node can earn a share of rewards, but it also concentrates risk in the selected operator and current network conditions. Heimdall is designed to make that risk visible before action.',
        ],
      },
    ],
    nextSteps: [
      { label: 'Bonding Basics', href: '/learn/bonding-basics' },
      { label: 'Portfolio', href: '/dashboard/portfolio' },
      { label: 'Nodes', href: '/dashboard/nodes' },
    ],
  },
  {
    slug: 'bonding-basics',
    title: 'Bonding Basics',
    description: 'How to bond RUNE to nodes and earn rewards',
    date: '2026-05-03',
    readTime: '7 min read',
    priority: 'Action',
    useCase: 'planning a first bond, provider change, or operator-fee review.',
    dashboard: {
      label: 'Transactions',
      href: '/dashboard/transactions',
    },
    sections: [
      {
        heading: 'What is Bonding?',
        body: [
          'Bonding locks RUNE to a THORChain node. The bond acts as collateral that helps secure the network, and bond providers may earn a share of node rewards after operator fees.',
        ],
      },
      {
        heading: 'How to Bond',
        list: {
          kind: 'ordered',
          label: 'How to Bond steps',
          items: [
            '**Choose a Node**: Use the [Node Explorer](/dashboard/explorer) to compare candidate evidence, source checks, operator fees, and capacity, then reconfirm the wallet preview before signing.',
            '**Connect Wallet**: Connect a THORChain-capable wallet and confirm the chain/network before signing.',
            '**Enter Bond Amount**: Specify how much RUNE to bond and verify the memo before broadcast.',
            '**Submit Bond**: Sign the transaction and wait for confirmation before treating the position as active.',
          ],
        },
      },
      {
        heading: 'Understanding Rewards',
        list: {
          kind: 'unordered',
          label: 'Understanding Rewards points',
          items: [
            '**Block Rewards**: Nodes earn RUNE for validating blocks.',
            '**Transaction Fees**: Nodes receive a share of fees from network activity.',
            '**Operator Fees**: Operators take a configured fee before distributing rewards to bond providers.',
          ],
        },
      },
      {
        heading: 'Risks',
        list: {
          kind: 'unordered',
          label: 'Risks points',
          items: [
            '**Churn Risk**: Nodes can leave the active set, pausing or changing reward expectations.',
            '**Slashing**: Nodes can lose bond for severe operational faults.',
            '**Unbond Timing**: Unbonding depends on node state and network rules, so inspect risk context before acting.',
          ],
        },
      },
    ],
    nextSteps: [
      { label: 'Bond Simulator', href: '/dashboard/simulator' },
      { label: 'Provider Exposure', href: '/learn/health-score-guide' },
      { label: 'Portfolio', href: '/dashboard/portfolio' },
    ],
  },
  {
    slug: 'lp-impermanent-loss',
    title: 'LP & Impermanent Loss',
    description: 'Understanding liquidity provision and impermanent loss',
    date: '2026-05-03',
    readTime: '10 min read',
    priority: 'Exposure',
    useCase: 'LP value, impermanent loss, or pool exposure needs context before a withdraw decision.',
    dashboard: {
      label: 'LP',
      href: '/dashboard/lp',
    },
    sections: [
      {
        heading: 'What is an LP?',
        body: [
          'A liquidity provider adds assets to a THORChain pool and earns a share of pool fees. In Heimdall, LP views should be read with source checks because historical entry data and current price data can arrive from different systems.',
        ],
      },
      {
        heading: 'Impermanent Loss Explained',
        body: [
          'Impermanent loss appears when the price ratio between pooled assets changes. It becomes realized only if you withdraw at that changed ratio, so the useful question is whether the current estimate has enough source context to support an action.',
        ],
      },
      {
        heading: 'What to Inspect',
        list: {
          kind: 'unordered',
          label: 'What to Inspect points',
          items: [
            '**Source-loaded values**: Current pool/member data that returned from Heimdall source checks; loaded data still needs freshness and completeness review.',
            '**Estimated values**: Derived entry, price, or IL calculations that depend on historical data.',
            '**Data confidence**: Source freshness and degraded calls before interpreting return metrics.',
          ],
        },
      },
      {
        heading: 'Using the IL Calculator',
        body: [
          'Use the [LP Page](/dashboard/lp) to inspect source-backed positions and model impermanent loss. Treat calculator output as a decision aid, not a source-confirmed balance.',
        ],
      },
    ],
    nextSteps: [
      { label: 'LP Positions', href: '/dashboard/lp' },
      { label: 'IL Calculator', href: '/dashboard/lp' },
      { label: 'Yield Benchmarking', href: '/learn/yield-benchmarking' },
    ],
  },
  {
    slug: 'yield-benchmarking',
    title: 'Yield Benchmarking',
    description: 'Compare your node\'s yield to network averages',
    date: '2026-05-03',
    readTime: '6 min read',
    priority: 'Return',
    useCase: 'reward performance looks weak and needs network-relative context.',
    dashboard: {
      label: 'Rewards',
      href: '/dashboard/rewards',
    },
    sections: [
      {
        heading: 'What is APY?',
        body: [
          'APY estimates annual return from rewards and fees. For bond providers, APY is most useful when paired with operator fee leakage, source freshness, and node risk.',
        ],
      },
      {
        heading: 'Network Average vs. Your Node',
        list: {
          kind: 'unordered',
          label: 'Network Average vs. Your Node points',
          items: [
            '**Network Average**: A fallback context line, not a guarantee for your node.',
            '**Top Nodes**: Useful for comparison only after accounting for fees, churn, and slash risk.',
            '**Your Node**: The return path that matters most for action decisions.',
          ],
        },
      },
      {
        heading: 'How to Benchmark',
        list: {
          kind: 'ordered',
          label: 'How to Benchmark steps',
          items: [
            'Open [Rewards](/dashboard/rewards) and start with the net outcome.',
            'Inspect fee leakage before comparing headline APY.',
            'Use [Node Explorer](/dashboard/explorer) only after risk and source checks look acceptable.',
          ],
        },
      },
      {
        heading: 'Factors Affecting APY',
        list: {
          kind: 'unordered',
          label: 'Factors Affecting APY points',
          items: [
            '**Uptime**: Nodes with stronger operational performance tend to earn more consistently.',
            '**Operator Fees**: Higher fees reduce provider return even when node-level APY looks strong.',
            '**Bond Size**: Larger bonds can change reward share and capacity dynamics.',
          ],
        },
      },
    ],
    nextSteps: [
      { label: 'Rewards', href: '/dashboard/rewards' },
      { label: 'Node Explorer', href: '/dashboard/explorer' },
      { label: 'Provider Exposure', href: '/learn/health-score-guide' },
    ],
  },
  {
    slug: 'health-score-guide',
    title: 'Provider Exposure Guide',
    description: 'How Heimdall labels bonded-provider exposure for review',
    date: '2026-05-03',
    readTime: '4 min read',
    priority: 'Start here',
    useCase: 'a dashboard status needs explanation before action.',
    dashboard: {
      label: 'Risk',
      href: '/dashboard/risk',
    },
    sections: [
      {
        heading: 'What the review state is for',
        body: [
          'Heimdall\'s Provider Exposure review state helps you quickly assess whether a bonded-provider position needs review. It is a triage signal, not a replacement for inspecting slash context, source freshness, and transaction safety.',
        ],
      },
      {
        heading: 'Review State Guide',
        list: {
          kind: 'unordered',
          label: 'Review State Guide points',
          items: [
            '**No bonded exposure**: Heimdall did not find a bonded-provider position for the selected address.',
            '**No exposure issue visible**: Heimdall found bonded exposure, but no jail, slash, churn, or status signal currently stands out.',
            '**Needs review**: One or more signals deserves operator attention before changing bond.',
            '**Critical review**: Jail, non-active status, high slash exposure, or stacked risk signals need attention before action.',
          ],
        },
      },
      {
        heading: 'Calculation Factors',
        list: {
          kind: 'ordered',
          label: 'Calculation Factors steps',
          items: [
            '**Jail and node status**: Jailed nodes and non-active nodes are the strongest review signals.',
            '**Slash exposure**: Warning starts at 50 slash points and critical review starts at 200; high historical slash is bounded so it does not dominate every other signal by itself.',
            '**Yield-guard flags**: Lowest-bond and leave-request signals raise review priority because they can affect provider continuity.',
            '**Separate trust gates**: Source freshness and transaction safety are shown beside the review state, but they are not hidden inside it.',
          ],
        },
      },
      {
        heading: 'Resolving Review Signals',
        list: {
          kind: 'unordered',
          label: 'Resolving Review Signals points',
          items: [
            '**Review jailed or non-active nodes first**: These are the clearest provider-exposure risks.',
            '**Watch slash thresholds**: Treat 50+ slash points as a review signal and 200+ as critical context, not an automatic command to unbond.',
            '**Check churn and leave signals**: Inspect lowest-bond and requested-to-leave flags before adding or removing bond.',
            '**Use source checks before action**: A calm review state still needs current THORNode and Midgard data before BOND memo review.',
          ],
        },
      },
    ],
    nextSteps: [
      { label: 'Portfolio', href: '/dashboard/portfolio' },
      { label: 'Bonding Basics', href: '/learn/bonding-basics' },
      { label: 'Bond Simulator', href: '/dashboard/simulator' },
    ],
  },
];

export const articleBySlug: Partial<Record<string, LearnArticle>> = Object.fromEntries(
  articles.map((article) => [article.slug, article])
);
