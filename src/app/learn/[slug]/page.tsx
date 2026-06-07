import { notFound } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

interface Article {
  slug: string;
  title: string;
  description: string;
  content: string;
  date: string;
  readTime: string;
}

const articles: Record<string, Article> = {
  'what-is-thorchain': {
    slug: 'what-is-thorchain',
    title: 'What is THORChain?',
    description: 'Introduction to THORChain decentralized liquidity protocol',
    date: '2026-05-03',
    readTime: '5 min read',
    content: `
# What is THORChain?

THORChain is a decentralized liquidity protocol that allows users to swap assets across different blockchains without needing a centralized exchange. It enables trustless trading, liquidity provision, and bonding for node operators.

## Key Features
- **Cross-Chain Swaps**: Swap BTC, ETH, RUNE, and other assets directly between blockchains.
- **Liquidity Pools**: Provide liquidity to earn fees and rewards.
- **Node Bonding**: Bond RUNE to operate a node and earn block rewards.
- **Impermanent Loss Protection**: LP positions are protected against IL after 100 days.

## How It Works
THORChain uses a network of nodes that validate transactions and maintain liquidity pools. Nodes bond RUNE (the native token) to participate, and are rewarded with block rewards and fees.

## Why Bond RUNE?
Bonding RUNE to a node allows you to earn a share of the node's rewards. Your bond helps secure the network and earns you a portion of the block rewards and transaction fees.

## Next Steps
- Learn about [Bonding Basics](/learn/bonding-basics)
- Check your [Portfolio](/dashboard/portfolio)
- Explore [Nodes](/dashboard/nodes) to bond to
    `,
  },
  'bonding-basics': {
    slug: 'bonding-basics',
    title: 'Bonding Basics',
    description: 'How to bond RUNE to nodes and earn rewards',
    date: '2026-05-03',
    readTime: '7 min read',
    content: `
# Bonding Basics

Bonding RUNE to a THORChain node is a way to earn rewards by helping secure the network. This guide explains the basics of bonding, how to choose a node, and what to expect.

## What is Bonding?
Bonding is the process of locking RUNE tokens to a THORChain node. The bonded RUNE acts as collateral that ensures the node acts honestly. In return, bonders earn a share of the node's rewards.

## How to Bond
1. **Choose a Node**: Use the [Node Explorer](/dashboard/explorer) to find a node with good uptime, low fees, and a strong health score.
2. **Connect Wallet**: Connect your THORChain wallet (e.g., XDefi, Keystore).
3. **Enter Bond Amount**: Specify how much RUNE you want to bond.
4. **Submit Bond**: Sign the transaction and wait for it to be confirmed.

## Understanding Rewards
- **Block Rewards**: Nodes earn RUNE for each block they validate.
- **Transaction Fees**: Nodes earn a share of the fees from swaps and other transactions.
- **Operator Fees**: Node operators take a fee (e.g., 10%) before distributing rewards to bonders.

## Risks
- **Churn Risk**: Nodes can be churned out of the active set, pausing rewards.
- **Slashing**: Nodes can be slashed (lose bond) for downtime or double-signing.
- **Bonding Window**: You can only unbond during specific windows (usually every 24h).

## Next Steps
- Use the [Bond Simulator](/dashboard/simulator) to test bonding scenarios
- Learn about [Health Scores](/learn/health-score-guide)
- Check your [Portfolio](/dashboard/portfolio) to manage bonds
    `,
  },
  'lp-impermanent-loss': {
    slug: 'lp-impermanent-loss',
    title: 'LP & Impermanent Loss',
    description: 'Understanding liquidity provision and impermanent loss',
    date: '2026-05-03',
    readTime: '10 min read',
    content: `
# LP & Impermanent Loss

Liquidity Provision (LP) allows you to earn fees by providing assets to THORChain pools. However, LP positions are subject to Impermanent Loss (IL) when asset prices change.

## What is an LP?
An LP (Liquidity Provider) adds equal values of two assets (e.g., RUNE and BTC) to a pool. In return, you earn a share of the pool's trading fees.

## Impermanent Loss Explained
IL occurs when the price ratio of the two assets in a pool changes. The more the ratio changes, the larger the IL. IL is "impermanent" because it only becomes a realized loss if you withdraw from the pool.

## THORChain's IL Protection
THORChain offers IL protection for up to 100 days:
- **Day 0-1**: 0% protection
- **Day 1-30**: 33% protection
- **Day 30-100**: 66% protection
- **Day 100+**: 100% protection

## Using the IL Calculator
Visit the [LP Page](/dashboard/lp) to use our Impermanent Loss Calculator. Enter your entry prices, current prices, and deposit amounts to estimate your IL.

## Next Steps
- Check your [LP Positions](/dashboard/lp)
- Use the [IL Calculator](/dashboard/lp) to estimate loss
- Learn about [Yield Benchmarking](/learn/yield-benchmarking)
    `,
  },
  'yield-benchmarking': {
    slug: 'yield-benchmarking',
    title: 'Yield Benchmarking',
    description: 'Compare your node\'s yield to network averages',
    date: '2026-05-03',
    readTime: '6 min read',
    content: `
# Yield Benchmarking

Yield Benchmarking allows you to compare your node's APY (Annual Percentage Yield) to the network average and top-performing nodes. This helps you identify if your bond is underperforming.

## What is APY?
APY measures the annual return on your bond, including compounding. THORChain nodes earn APY from block rewards and transaction fees.

## Network Average vs. Your Node
- **Network Average**: The average APY of all active nodes.
- **Top Nodes**: The top 10% of nodes by APY.
- **Your Node**: The APY of the node(s) you're bonded to.

## How to Benchmark
1. Visit your [Portfolio](/dashboard/portfolio) to see your node's APY.
2. Compare it to the **Network Average** and **Top Nodes** displayed there.
3. If your APY is below average, consider switching to a higher-performing node.

## Factors Affecting APY
- **Uptime**: Nodes with higher uptime earn more rewards.
- **Operator Fees**: Lower fees mean higher APY for bonders.
- **Bond Size**: Nodes with larger bonds earn more block rewards.

## Next Steps
- Check your [Portfolio](/dashboard/portfolio) for APY comparison
- Use the [Node Explorer](/dashboard/explorer) to find high-yield nodes
- Learn about [Health Scores](/learn/health-score-guide)
    `,
  },
  'health-score-guide': {
    slug: 'health-score-guide',
    title: 'Health Score Guide',
    description: 'How Heimdall calculates your portfolio health score',
    date: '2026-05-03',
    readTime: '4 min read',
    content: `
# Health Score Guide

Heimdall's Health Score (A-F) helps you quickly assess the health of your bonded portfolio. This guide explains how the score is calculated and what it means.

## Score Scale
- **A (90-100)**: Excellent — Strong bonds, low risk
- **B (80-89)**: Good — Minor issues to address
- **C (70-79)**: Fair — Some risks need attention
- **D (60-69)**: Poor — High risk, needs improvement
- **F (0-59)**: Critical — Immediate action required

## Calculation Factors
1. **Bond Diversification (30 points)**: Spread bonds across multiple nodes.
2. **Node Health (40 points)**: Average health of nodes you're bonded to.
3. **Churn Risk (20 points)**: Penalty for nodes likely to be churned.
4. **Operator Fees (10 points)**: Penalty for high-fee nodes.

## Improving Your Score
- **Diversify**: Bond to 3-5 nodes instead of 1-2.
- **Choose Healthy Nodes**: Use the [Node Explorer](/dashboard/explorer) to find nodes with high health scores.
- **Avoid High Fees**: Choose nodes with operator fees <15%.
- **Monitor Churn Risk**: Unbond from nodes with high churn risk.

## Next Steps
- Check your [Portfolio](/dashboard/portfolio) for your current Health Score
- Learn about [Bonding Basics](/learn/bonding-basics)
- Use the [Bond Simulator](/dashboard/simulator) to test improvements
    `,
  },
};

function renderInlineMarkdown(text: string): ReactNode[] {
  const tokens = text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g).filter(Boolean);

  return tokens.map((token, index) => {
    const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      if (href.startsWith('/')) {
        return (
          <Link key={`${href}-${index}`} href={href} className="text-cyan-600 underline underline-offset-4 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300">
            {label}
          </Link>
        );
      }

      return (
        <a key={`${href}-${index}`} href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-600 underline underline-offset-4 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300">
          {label}
        </a>
      );
    }

    const strongMatch = /^\*\*([^*]+)\*\*$/.exec(token);
    if (strongMatch) {
      return <strong key={`${strongMatch[1]}-${index}`}>{strongMatch[1]}</strong>;
    }

    return <span key={`${token}-${index}`}>{token}</span>;
  });
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = articles[slug];

  if (!article) {
    notFound();
  }

  return (
    <div>
      {/* Back Button */}
      <div className="mb-8">
        <Link href="/learn">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Learn
          </Button>
        </Link>
      </div>

      {/* Article Header */}
      <div className="mb-12">
        <div className="mb-4 flex items-center gap-4 text-sm text-zinc-500">
          <span>{article.date}</span>
          <span>•</span>
          <span>{article.readTime}</span>
        </div>
        <h1 className="font-display text-4xl font-bold text-zinc-900 dark:text-zinc-100">
          {article.title}
        </h1>
        <p className="mt-4 text-lg text-zinc-500 dark:text-zinc-400">
          {article.description}
        </p>
      </div>

      {/* Article Content */}
      <Card className="border-zinc-200 bg-white/80 shadow-md backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
        <CardContent className="prose prose-zinc max-w-none p-6 dark:prose-invert">
          {article.content.split('\n').map((line, i) => {
            if (line.startsWith('# ')) {
              return <h1 key={i} className="font-display text-3xl font-bold">{line.slice(2)}</h1>;
            } else if (line.startsWith('## ')) {
              return <h2 key={i} className="font-display text-2xl font-bold mt-8">{line.slice(3)}</h2>;
            } else if (line.startsWith('### ')) {
              return <h3 key={i} className="font-display text-xl font-bold mt-6">{line.slice(4)}</h3>;
            } else if (line.startsWith('- ')) {
              return <li key={i} className="ml-6">{renderInlineMarkdown(line.slice(2))}</li>;
            } else if (line.startsWith('1. ')) {
              return <li key={i} className="ml-6 list-decimal">{renderInlineMarkdown(line.slice(3))}</li>;
            } else if (line.trim() === '') {
              return <br key={i} />;
            } else {
              return <p key={i} className="my-4">{renderInlineMarkdown(line)}</p>;
            }
          })}
        </CardContent>
      </Card>

      {/* Next Steps */}
      <div className="mt-12 rounded-xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
        <h3 className="font-display text-lg font-bold">Related Articles</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.values(articles)
            .filter(a => a.slug !== article.slug)
            .slice(0, 3)
            .map(a => (
              <Link href={`/learn/${a.slug}`} key={a.slug}>
                <Button variant="outline">
                  {a.title}
                </Button>
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
