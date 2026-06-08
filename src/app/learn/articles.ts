export interface LearnArticle {
  slug: string;
  title: string;
  description: string;
  readTime: string;
}

export const articles: LearnArticle[] = [
  {
    slug: 'what-is-thorchain',
    title: 'What is THORChain?',
    description: 'Introduction to THORChain decentralized liquidity protocol',
    readTime: '5 min read',
  },
  {
    slug: 'bonding-basics',
    title: 'Bonding Basics',
    description: 'How to bond RUNE to nodes and earn rewards',
    readTime: '7 min read',
  },
  {
    slug: 'lp-impermanent-loss',
    title: 'LP & Impermanent Loss',
    description: 'Understanding liquidity provision and impermanent loss',
    readTime: '10 min read',
  },
  {
    slug: 'yield-benchmarking',
    title: 'Yield Benchmarking',
    description: 'Compare your node\'s yield to network averages',
    readTime: '6 min read',
  },
  {
    slug: 'health-score-guide',
    title: 'Health Score Guide',
    description: 'How Heimdall calculates your portfolio health score',
    readTime: '4 min read',
  },
];
