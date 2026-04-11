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
    title: 'Solana unhalted, EVM chains bug, ADR-23 passed',
    date: 'Mar 2026',
    fullDate: 'March 2026',
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
    title: 'Ethereum Bifrost issue, ADR-022/023, Solana launch',
    date: 'Feb 2026',
    fullDate: 'February 2026',
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
    title: 'Limit orders paused, BCH bug, v3.15 adopted, Solana prep',
    date: 'Jan 2026',
    fullDate: 'January 2026',
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
    title: 'v3.14 release, advanced trading features',
    date: 'Dec 2025',
    fullDate: 'December 2025',
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
    title: 'v3.12/13, Limit orders, Memoless, UTXO exploit',
    date: 'Nov 2025',
    fullDate: 'November 2025',
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
  },
  {
    id: 'oct-2025',
    title: 'Limit orders attempt, block halt, BSC issues',
    date: 'Oct 2025',
    fullDate: 'October 2025',
    content: [
      {
        type: 'feature',
        title: 'Base Layer Limit Orders Attempted Launch',
        description: 'On 6-Oct, Base Layer Limit Orders were briefly enabled, before being disabled to investigate a potential bug. Another attempt was made on 10-Oct, but was again disabled.',
        links: [
          { text: 'Advanced Swap Queue Docs', url: 'https://dev.thorchain.org/swap-guide/advanced-swap-queue.html' }
        ]
      },
      {
        type: 'bug',
        title: 'Block Production Halted',
        description: 'On 7-Oct, a divide-by-zero bug caused THORChain\'s block production to be halted. A quick fix (v3.11.1) was updated and adopted in around 5 hours, and trading was re-enabled another 4.5 hours later.',
      },
      {
        type: 'chain',
        title: 'BSC Issues',
        description: 'BSC syncing was causing issues, and after v3.11.1 update above, BSC remained halted. On 9-Oct, v3.11.2 update was released to alleviate this, and shortly after, BSC trading was unhalted.',
      },
      {
        type: 'update',
        title: 'Raising the TVL Cap',
        description: 'On 24-Oct, Nodes were called to vote to raise the TVL Cap. On 28-Oct, this mimir vote was passed.',
      }
    ]
  },
  {
    id: 'sep-2025',
    title: 'TRON integration, EdDSA support, ADR-21 Marketing',
    date: 'Sep 2025',
    fullDate: 'TRON integration live, EdDSA, ADR-21 Marketing',
    content: [
      {
        type: 'chain',
        title: 'TRON Integration',
        description: 'TRON has been added as a supported chain, including liquidity pools for TRX and USDT.',
      },
      {
        type: 'feature',
        title: 'EdDSA Support',
        description: 'EdDSA signing support was added, enabling future integrations for Solana, Sui, and TON.',
      },
      {
        type: 'adr',
        title: 'ADR-21 Marketing Budget',
        description: 'ADR-21 passed a governance vote, establishing a permanent marketing fund sourced from Treasury and 5% of protocol revenue.',
      }
    ]
  },
  {
    id: 'aug-2025',
    title: 'TRON ready, Advanced Swap Queue dev, Security incident',
    date: 'Aug 2025',
    fullDate: 'TRON ready, Advanced Swap Queue dev, Security incident',
    content: [
      {
        type: 'chain',
        title: 'TRON Integration',
        description: 'TRON integration has been completed and scheduled to go live in July 2025.',
      },
      {
        type: 'feature',
        title: 'Advanced Swap Queue',
        description: 'Advanced Swap Queue with Limit Orders was being developed.',
      },
      {
        type: 'bug',
        title: 'Security Incident',
        description: 'An incident occurred on 9-September 2025 where private keys held by THORChain founder JP THOR were compromised. The team\'s preventative security measures successfully prevented the THORChain network from any adverse effect. No funds of THORChain, THORChain Treasury, or THORChain community were affected.',
      }
    ]
  },
  {
    id: 'jul-2025',
    title: 'TRON integration complete, Advanced Swap Queue dev',
    date: 'Aug 1, 2025',
    fullDate: 'August 1, 2025',
    content: [
      {
        type: 'chain',
        title: 'TRON Integration Complete',
        description: 'Native TRX and USDT swaps live on THORChain.',
      },
      {
        type: 'feature',
        title: 'Advanced Swap Queue Development',
        description: 'Advanced Swap Queue with Limit Orders was in development.',
      }
    ]
  },
  {
    id: 'jun-2025',
    title: 'XRP Chain, TCY launch, TRON integration',
    date: 'Jun 2025',
    fullDate: 'XRP Chain, TCY launch, TRON integration',
    content: [
      {
        type: 'chain',
        title: 'XRP Chain Integration',
        description: 'XRP Chain was added to THORChain, enabling users to swap permissionlessly from XRP Ledger.',
      },
      {
        type: 'feature',
        title: 'TCY Launch',
        description: 'TCY is launched on THORChain. Lending and Savers participants of THORFi can claim and stake TCY to earn a portion of THORChain\'s income.',
      },
      {
        type: 'chain',
        title: 'TRON Integration',
        description: 'TRON integration was completed and scheduled to go live in July 2025.',
      }
    ]
  },
  {
    id: 'may-2025',
    title: 'XRP swaps live, TCY launched, THORFi unwind',
    date: 'May 2025',
    fullDate: 'XRP swaps live, TCY launched, THORFi unwind',
    content: [
      {
        type: 'chain',
        title: 'Decentralized XRP Swaps',
        description: 'THORChain completed its integration of the XRP Ledger, enabling native XRP swaps across any other chain supported by THORChain.',
      },
      {
        type: 'feature',
        title: 'TCY Launch',
        description: 'TCY launched on THORChain.',
      },
      {
        type: 'feature',
        title: 'THORFi Unwind',
        description: 'THORFi lending and savers have been sunset. The TCY claims process was being developed.',
      }
    ]
  },
  {
    id: 'apr-2025',
    title: 'XRP ready, Base added, THORFi unwind begins',
    date: 'Apr 2025',
    fullDate: 'XRP ready, Base added, THORFi unwind begins',
    content: [
      {
        type: 'chain',
        title: 'XRP Swaps Coming',
        description: 'THORChain\'s integration of XRP Ledger is complete and ready for mainnet deployment. XRP support will go live in May 2025, enabling cross-chain native XRP swaps to Bitcoin, USDT, and more.',
      },
      {
        type: 'chain',
        title: 'Base Chain Integration',
        description: 'Base was added to THORChain. Available assets include ETH, USDC, and cbBTC.',
      },
      {
        type: 'feature',
        title: 'THORFi Unwind',
        description: 'Lending and Savers features have been sunset. Proposal 6 passed governance for TCY.',
      },
      {
        type: 'update',
        title: 'Cosmos SDK v0.50',
        description: 'THORChain\'s Cosmos SDK version was updated to v0.50.',
      }
    ]
  },
  {
    id: 'mar-2025',
    title: 'Base added, CosmWasm, Token Factory, block rewards deprecated',
    date: 'Mar 2025',
    fullDate: 'Base added, CosmWasm, Token Factory, block rewards deprecated',
    content: [
      {
        type: 'chain',
        title: 'Base Chain Integration',
        description: 'Base was added to THORChain. Available assets include ETH, USDC, and cbBTC. Other assets are whitelisted for pool.',
      },
      {
        type: 'feature',
        title: 'Lending & Savers Unwind',
        description: 'Lending and Savers features have been sunset. Proposal 6 passed governance for TCY and Prop 6.',
      },
      {
        type: 'feature',
        title: 'CosmWasm Support',
        description: 'CosmWasm support was added.',
      },
      {
        type: 'feature',
        title: 'Token Factory',
        description: 'Cosmos Token Factory was added to THORChain, allowing the creation of new tokens on THORChain network.',
      },
      {
        type: 'update',
        title: 'Block Rewards Deprecated',
        description: 'Nodes voted to deprecate block rewards. Now, 100% of all fees paid to liquidity providers and node operators are distributed.',
      },
      {
        type: 'update',
        title: 'Admin Mimir Removed',
        description: 'Removal of Admin Mimir.',
      }
    ]
  },
  {
    id: 'feb-2025',
    title: 'Base integration, THORFi recovery, EdDSA development',
    date: 'Feb 2025',
    fullDate: 'Base integration, THORFi recovery, EdDSA development',
    content: [
      {
        type: 'chain',
        title: 'Base Chain Integration',
        description: 'Base chain integration was in progress.',
      },
      {
        type: 'feature',
        title: 'THORFi Recovery',
        description: 'THORFi recovery is a top priority. The Maya team is working on delivering Prop6 and TCY.',
      },
      {
        type: 'feature',
        title: 'EdDSA Signing',
        description: 'THORChain was built using ECDSA vaults. THORChain needs to add EdDSA to add new chains such as Solana, Cardano, TON, and SUI.',
      }
    ]
  },
  {
    id: 'jan-2025',
    title: 'Base live, Rujira soft-launch, Proposal 6 passed',
    date: 'Jan 2025',
    fullDate: 'Base live, Rujira soft-launch, Proposal 6 passed',
    content: [
      {
        type: 'chain',
        title: 'Base Chain',
        description: 'THORChain support for Base chain is now live.',
      },
      {
        type: 'feature',
        title: 'Rujira App Layer',
        description: 'Rujira Swap was soft-launched, enabling direct swaps with THORChain base layer pools.',
      },
      {
        type: 'adr',
        title: 'Proposal 6',
        description: 'Proposal 6 passed governance for THORFi recovery.',
      }
    ]
  },
  {
    id: 'dec-2024',
    title: 'Min swap fee, Cosmos SDK v0.50, RUNE burn, wallet integrations',
    date: 'Dec 2024',
    fullDate: 'Min swap fee, Cosmos SDK v0.50, RUNE burn, wallet integrations',
    content: [
      {
        type: 'update',
        title: 'Min Swap Fee to 8bps',
        description: 'The nodes voted to change the minimum liquidity fee to 8bps (or 0.08%).',
      },
      {
        type: 'update',
        title: 'Incentive Pendulum Changes',
        description: 'The incentive pendulum has been modified to its original form, undoing the change to using Effective Security.',
      },
      {
        type: 'update',
        title: 'Cosmos SDK v0.50',
        description: 'THORChain\'s Cosmos SDK version was updated to v0.50. This was a required update to enable future functionality.',
      },
      {
        type: 'update',
        title: 'RUNE Burn',
        description: 'The nodes voted and passed a vote that burns 5% of the system income.',
      },
      {
        type: 'chain',
        title: 'New Integrations',
        description: 'Ledger Live (via SwapKit), Bitget Wallet, Gem Wallet added.',
      }
    ]
  },
  {
    id: 'nov-2024',
    title: 'Cosmos SDK v0.50 upgrade, App layer focus',
    date: 'Nov 2024',
    fullDate: 'Cosmos SDK v0.50 upgrade, App layer focus',
    content: [
      {
        type: 'update',
        title: 'Cosmos SDK v0.50',
        description: 'THORChain\'s Cosmos SDK version was being updated to v0.50.',
      },
      {
        type: 'feature',
        title: 'App Layer Development',
        description: 'Focus on THORChain App Layer development.',
      }
    ]
  },
  {
    id: 'oct-2024',
    title: 'V3 release prep, min swap fee to 8bps',
    date: 'Nov 1, 2024',
    fullDate: 'November 1, 2024',
    content: [
      {
        type: 'update',
        title: 'V3 Release Preparation',
        description: 'THORChain v3 release was being prepared.',
      },
      {
        type: 'update',
        title: 'Min Swap Fee Update',
        description: 'Nodes voted to change the minimum liquidity fee to 8bps.',
      }
    ]
  },
  {
    id: 'sep-2024',
    title: 'V3 development, THORFi recovery planning',
    date: 'Oct 2, 2024',
    fullDate: 'October 2, 2024',
    content: [
      {
        type: 'update',
        title: 'V3 Development',
        description: 'THORChain v3 development progressing.',
      },
      {
        type: 'feature',
        title: 'THORFi Recovery',
        description: 'THORFi recovery planning and implementation.',
      },
      {
        type: 'update',
        title: 'Planned Obsolescence',
        description: 'Continued progress towards removing admin keys.',
      }
    ]
  },
  {
    id: 'aug-2024',
    title: 'V3 dev, THORFi unwind, protocol upgrades',
    date: 'Sep 6, 2024',
    fullDate: 'September 6, 2024',
    content: [
      {
        type: 'update',
        title: 'V3 Development',
        description: 'THORChain v3 development ongoing.',
      },
      {
        type: 'feature',
        title: 'THORFi Unwind',
        description: 'THORFi lending and savers unwind planning.',
      },
      {
        type: 'update',
        title: 'Protocol Upgrades',
        description: 'Network upgrades and improvements in progress.',
      }
    ]
  },
  {
    id: 'may-jun-2024',
    title: 'May-Jun 2024',
    date: 'Jul 5, 2024',
    fullDate: 'July 5, 2024',
    content: [
      {
        type: 'feature',
        title: 'Lending Protocol',
        description: 'Lending protocol live - users can borrow RUNE against BTC/ETH collateral.',
      },
      {
        type: 'feature',
        title: 'THORFi Growth',
        description: 'THORFi (Lending + Savers) gaining adoption.',
      },
      {
        type: 'update',
        title: 'Chain Integrations',
        description: 'New chain integrations in development.',
      },
      {
        type: 'feature',
        title: 'Mimir V2',
        description: 'Mimir V2 implementation for planned obsolescence.',
      }
    ]
  },
  {
    id: 'apr-2024',
    title: 'April 2024',
    date: 'May 7, 2024',
    fullDate: 'May 7, 2024',
    content: [
      {
        type: 'feature',
        title: 'Lending Protocol',
        description: 'Lending protocol development complete - launching on Mainnet.',
      },
      {
        type: 'feature',
        title: 'Savers Vaults',
        description: 'Savers Vaults - Deposit BTC, Earn BTC on Layer 1 assets.',
      },
      {
        type: 'update',
        title: 'Network Upgrades',
        description: 'THORChain network upgrades in progress.',
      }
    ]
  },
  {
    id: 'mar-2024',
    title: 'March 2024',
    date: 'Apr 2, 2024',
    fullDate: 'April 2, 2024',
    content: [
      {
        type: 'feature',
        title: 'Lending Launch',
        description: 'Lending protocol preparing for launch - collateralized borrowing against BTC/ETH.',
      },
      {
        type: 'feature',
        title: 'THORFi',
        description: 'THORFi suite (Lending + Savers) development progressing.',
      },
      {
        type: 'update',
        title: 'Planned Obsolescence',
        description: 'Progress towards removing admin keys and decentralization.',
      }
    ]
  },
  {
    id: 'feb-2024',
    title: 'February 2024',
    date: 'Mar 4, 2024',
    fullDate: 'March 4, 2024',
    content: [
      {
        type: 'feature',
        title: 'Lending Development',
        description: 'Lending protocol in final development stages.',
      },
      {
        type: 'feature',
        title: 'Savers Vaults',
        description: 'Savers Vaults growing - single-sided yield on L1 assets.',
      },
      {
        type: 'update',
        title: 'Security Audits',
        description: 'Security audits ongoing for Lending protocol.',
      }
    ]
  },
  {
    id: 'jan-2024',
    title: 'January 2024',
    date: 'Feb 5, 2024',
    fullDate: 'February 5, 2024',
    content: [
      {
        type: 'feature',
        title: 'Lending Protocol',
        description: 'Lending protocol development ongoing - non-custodial, collateralized borrowing.',
      },
      {
        type: 'feature',
        title: 'Savers Growth',
        description: 'Savers Vaults TVL growing as users provide single-sided liquidity.',
      },
      {
        type: 'update',
        title: 'Cosmos SDK Upgrade',
        description: 'Planning for Cosmos SDK upgrade in 2024.',
      }
    ]
  },
  {
    id: 'q4-2023',
    title: 'Q4 2023',
    date: 'Jan 23, 2024',
    fullDate: 'January 23, 2024',
    content: [
      {
        type: 'feature',
        title: 'Mimir V2',
        description: 'Moves towards final stages of Planned Obsolescence.',
      },
      {
        type: 'feature',
        title: 'Min Swap Fee to 8bps',
        description: 'Nodes voted to change minimum liquidity fee to 8bps (0.08%) for L1 to L1 swap.',
      },
      {
        type: 'feature',
        title: 'Affiliate Improvements',
        description: 'Affiliate participating strongly with notable interfaces including Trust Wallet, THORSwap, THORWallet, ShapeShift, Asgardex.',
      },
      {
        type: 'feature',
        title: 'Memoless Transactions',
        description: 'In pipeline for early 2024.',
      },
      {
        type: 'feature',
        title: 'Batched Outbounds',
        description: 'In pipeline for early 2024.',
      },
      {
        type: 'feature',
        title: 'Orderbook (Limit Orders)',
        description: 'In pipeline for early 2024.',
      }
    ]
  },
  {
    id: 'q3-2023',
    title: 'Q3 2023',
    date: 'Oct 4, 2023',
    fullDate: 'October 4, 2023',
    content: [
      {
        type: 'feature',
        title: 'Lending Protocol',
        description: 'Long awaited Lending protocol is live. Users deposit native BTC or ETH as collateral and receive RUNE. No liquidations, no interest, no expiration. From Aug 20 to Sep 30, 455 loans opened, over 1M RUNE earned.',
      },
      {
        type: 'feature',
        title: 'Streaming Swaps',
        description: 'Added, making THORChain a strong competitor to centralized exchanges. Massive lift in daily volume.',
      },
      {
        type: 'chain',
        title: 'BNB Smart Chain',
        description: 'Added to THORChain.',
      },
      {
        type: 'feature',
        title: 'TOR Unit',
        description: 'TOR (THOR.TOR) is a non-transferable unit of account within THORChain, designed to match $1 USD value.',
      },
      {
        type: 'feature',
        title: 'Savers Streaming',
        description: 'Enabled Streaming Swaps for Savers and Lending.',
      },
      {
        type: 'chain',
        title: 'Ledger Live',
        description: 'THORSwap app released in Ledger Live.',
      }
    ]
  },
  {
    id: 'q2-2023',
    title: 'Q2 2023',
    date: 'Jun 2023',
    fullDate: 'June 2023',
    content: [
      {
        type: 'chain',
        title: 'BNB Smart Chain (BNB)',
        description: 'BNB Chain added to THORChain.',
      },
      {
        type: 'feature',
        title: 'Lending Protocol',
        description: 'Lending development progressed throughout Q2.',
      }
    ]
  },
  {
    id: 'q1-2023',
    title: 'Q1 2023',
    date: 'Mar 2023',
    fullDate: 'March 2023',
    content: [
      {
        type: 'adr',
        title: 'Planned Obsolescence',
        description: 'Protocol continues ensuring goals of decentralization, minimal intervention. Set for completion in 2023.',
      },
      {
        type: 'chain',
        title: 'BNB Smart Chain',
        description: 'BSC integration in progress.',
      },
      {
        type: 'feature',
        title: 'Wallet Integrations',
        description: 'New wallets integrating THORChain for swaps and yield.',
      },
      {
        type: 'feature',
        title: 'Exchange Integrations',
        description: 'New exchange integrations being worked on.',
      }
    ]
  },
  {
    id: 'q4-2022',
    title: 'Q4 2022',
    date: 'Dec 2022',
    fullDate: 'December 2022',
    content: [
      {
        type: 'chain',
        title: 'Mainnet Launch',
        description: 'Mainnet announced in June 2022 with massive Binance promotion.',
      },
      {
        type: 'chain',
        title: 'ATOM (Cosmos Hub) Launch',
        description: 'Gaia Chain voted to go to Mainnet.',
      },
      {
        type: 'chain',
        title: 'Avalanche AVAX',
        description: 'Avalanche C-Chain integration completed. Native asset swaps available.',
        links: [
          { text: 'Medium Article', url: 'https://medium.com/thorchain/thorchain-integration-of-avalanche-c-chain-complete-de8786ac7435' }
        ]
      },
      {
        type: 'feature',
        title: 'THORNames',
        description: 'THORNames now live on Mainnet.',
      },
      {
        type: 'feature',
        title: 'Kill Switch',
        description: 'KillSwitch activated for non-native RUNE (BEP2 & ERC20) at block 6500000 on July 19, 2022.',
      },
      {
        type: 'feature',
        title: 'Savers Vaults',
        description: 'Deposit BTC, Earn BTC. Yield on Layer 1 assets.',
        links: [
          { text: 'Medium Article', url: 'https://medium.com/thorchain/savers-vaults-on-thorchain-67e346eb641f' }
        ]
      },
      {
        type: 'bug',
        title: 'Network Halt (Oct 27, 2022)',
        description: 'THORChain halted due to software bug (cosmos.Uint string in memo handling). Fixed after ~20 hours.',
        links: [
          { text: 'CoinDesk', url: 'https://www.coindesk.com/tech/2022/10/27/thorchain-suffers-an-outage-due-to-software-bug' }
        ]
      }
    ]
  },
  {
    id: 'q3-2022',
    title: 'Q3 2022',
    date: 'Oct 2022',
    fullDate: 'October 21, 2022',
    content: [
      {
        type: 'chain',
        title: 'Avalanche AVAX Integration',
        description: 'AVAX has been on Stagenet for a few weeks. Plan is for minor patches via v1.96 and then launch to Mainnet in 1-2 weeks.',
      },
      {
        type: 'chain',
        title: 'Next Chain Vote',
        description: 'Chain vote started on Developer Discord with 20 chain choices. Haven leading with 31 votes, BNB Smart Chain with 20 votes, DASH with 10 votes.',
      },
      {
        type: 'feature',
        title: 'Protocol Owned Liquidity (POL)',
        description: 'POL was implemented in v1.95 and now in Stagenet.',
      },
      {
        type: 'feature',
        title: 'Single Sided Yield',
        description: 'Expected to be implemented in v1.96.',
      },
      {
        type: 'feature',
        title: 'ADR004: Asgard Onchain Keyshare Backup',
        description: 'Intended to encrypt and backup the Asgard keyshare generated every node churn (~7 days).',
      },
      {
        type: 'chain',
        title: 'Terra LUNA Airdrop',
        description: 'Terraform Labs (TFL) indicated LUNA airdrop for LUNC/UST THORChain LPs. Users claim in September.',
        links: [
          { text: 'Terra Agora', url: 'https://agora.terra.money/discussion/6647-final-proposal-terra-phoenix-airdrop' }
        ]
      }
    ]
  },
  {
    id: 'end-aug-2022',
    title: 'End Aug 2022',
    date: 'Aug 2022',
    fullDate: 'Next chain vote, AVAX Stagenet, POL progress',
    content: [
      {
        type: 'chain',
        title: 'Next Chain Vote & Privacy Discussions',
        description: 'Chain vote started on Developer Discord with 20 chain choices. At time of writing, Haven is leading with 31 votes, BNB Smart Chain with 20 votes, and DASH with 10 votes. In the light of the Tornado Cash sanctions, there was a vigorous debate of node dependency on cloud computing, risk, and privacy.',
      },
      {
        type: 'chain',
        title: 'Avalanche AVAX Integration',
        description: 'AVAX has been on Stagenet for a few weeks now. Plan is for some minor patches via v1.96 and then will be launched to Mainnet in 1–2 weeks.',
      },
      {
        type: 'chain',
        title: 'Terra LUNA Airdrop',
        description: 'Terraform Labs (TFL) has indicated LUNA airdrop for LUNC/UST THORChain LPs for pre/post-crash snapshot. Users will need to claim in September.',
        links: [
          { text: 'Terra Agora', url: 'https://agora.terra.money/discussion/6647-final-proposal-terra-phoenix-airdrop' }
        ]
      },
      {
        type: 'adr',
        title: 'ADR004: Asgard Onchain Keyshare Backup',
        description: 'This is intended to encrypt and backup the Asgard keyshare (which are generated afresh every node churn, around 7 days) onchain. In case any nodes are accidentally shut down, this will ensure a way to spin-up new nodes and recover the network.',
      },
      {
        type: 'feature',
        title: 'Protocol Owned Liquidity (POL)',
        description: 'POL was implemented in v1.95 and now in Stagenet.',
      },
      {
        type: 'feature',
        title: 'Single Sided Yield',
        description: 'Expected to be implemented in v1.96.',
      },
      {
        type: 'feature',
        title: 'Order Book',
        description: 'Order book design is expected shortly after.',
      }
    ]
  },
  {
    id: 'mid-sep-2022',
    title: 'Mid Sep 2022',
    date: 'Apr 3, 2024',
    fullDate: 'April 3, 2024',
    content: [
      {
        type: 'chain',
        title: 'AVAX Mainnet Launch',
        description: 'Avalanche (AVAX) has been launched to Mainnet.',
      },
      {
        type: 'chain',
        title: 'Next Chain Voting',
        description: 'BNB Smart Chain won the Next Chain Vote with 20 votes. Development focus is now on BSC integration.',
      },
      {
        type: 'feature',
        title: 'ADR004 Adoption',
        description: 'ADR004 (Asgard Onchain Keyshare Backup) adopted to ensure network resilience.',
      },
      {
        type: 'feature',
        title: 'Single Sided Yield Development',
        description: 'Single Sided Yield (Savers Vaults) development progressing.',
      }
    ]
  },
  {
    id: 'early-oct-2022',
    title: 'Early Oct 2022',
    date: 'Apr 3, 2024',
    fullDate: 'April 3, 2024',
    content: [
      {
        type: 'chain',
        title: 'BNB Smart Chain Integration',
        description: 'BNB Smart Chain integration in progress.',
      },
      {
        type: 'feature',
        title: 'Savers Vaults Testing',
        description: 'Savers Vaults (Single Sided Yield) being tested on Stagenet.',
      },
      {
        type: 'feature',
        title: 'Order Book Design',
        description: 'Order book design work ongoing.',
      }
    ]
  },
  {
    id: 'early-nov-2022',
    title: 'Early Nov 2022',
    date: 'Apr 3, 2024',
    fullDate: 'April 3, 2024',
    content: [
      {
        type: 'chain',
        title: 'BNB Smart Chain Progress',
        description: 'BNB Smart Chain integration progressing on Stagenet.',
      },
      {
        type: 'feature',
        title: 'Savers Vaults Preparation',
        description: 'Savers Vaults preparing for Mainnet launch.',
      },
      {
        type: 'update',
        title: 'Network Stability',
        description: 'THORChain continues to operate smoothly through market volatility.',
      }
    ]
  },
  {
    id: 'end-nov-2022',
    title: 'End Nov 2022',
    date: 'Apr 3, 2024',
    fullDate: 'April 3, 2024',
    content: [
      {
        type: 'chain',
        title: 'BNB Smart Chain Launch',
        description: 'BNB Smart Chain integration nearing completion.',
      },
      {
        type: 'feature',
        title: 'Savers Vaults',
        description: 'Savers Vaults expected to launch soon.',
      },
      {
        type: 'bug',
        title: 'Network Halt (Oct 27, 2022)',
        description: 'THORChain halted due to software bug (cosmos.Uint string in memo handling). Fixed after ~20 hours.',
        links: [
          { text: 'CoinDesk', url: 'https://www.coindesk.com/tech/2022/10/27/thorchain-suffers-an-outage-due-to-software-bug' }
        ]
      }
    ]
  },
  {
    id: 'mid-dec-2022',
    title: 'Mid Dec 2022',
    date: 'Apr 3, 2024',
    fullDate: 'April 3, 2024',
    content: [
      {
        type: 'chain',
        title: 'BNB Smart Chain',
        description: 'BNB Smart Chain integration ongoing.',
      },
      {
        type: 'feature',
        title: 'Savers Vaults',
        description: 'Savers Vaults development nearing completion.',
      },
      {
        type: 'feature',
        title: 'THORNames',
        description: 'THORNames development progressing.',
      }
    ]
  },
  {
    id: 'end-jan-2023',
    title: 'End Jan 2023',
    date: 'Apr 3, 2024',
    fullDate: 'April 3, 2024',
    content: [
      {
        type: 'chain',
        title: 'BNB Smart Chain Launch',
        description: 'BNB Smart Chain added to THORChain enabling BNB and BEP-20 asset swaps.',
      },
      {
        type: 'feature',
        title: 'Savers Vaults',
        description: 'Savers Vaults (Single Sided Yield) preparing for Mainnet launch.',
      },
      {
        type: 'feature',
        title: 'THORNames Testing',
        description: 'THORNames being tested on Stagenet.',
      },
      {
        type: 'update',
        title: 'Network Improvements',
        description: 'THORChain continues to improve network stability and performance.',
      }
    ]
  },
  {
    id: 'early-mar-2023',
    title: 'Early Mar 2023',
    date: 'Apr 3, 2024',
    fullDate: 'April 3, 2024',
    content: [
      {
        type: 'feature',
        title: 'Savers Vaults Launch',
        description: 'Savers Vaults live on Mainnet -用户提供单一资产流动性，提供无无常损失收益.',
      },
      {
        type: 'feature',
        title: 'THORNames',
        description: 'THORNames preparing for Stagenet launch.',
      },
      {
        type: 'feature',
        title: 'Planned Obsolescence',
        description: 'THORChain continues to work towards planned obsolescence - removing admin keys.',
      }
    ]
  },
  {
    id: 'mar-2023',
    title: 'THORNames live, Savers growth, v2 migration planning',
    date: 'Apr 3, 2024',
    fullDate: 'April 3, 2024',
    content: [
      {
        type: 'feature',
        title: 'THORNames Launch',
        description: 'THORNames now live on Mainnet.',
      },
      {
        type: 'feature',
        title: 'Savers Vaults Adoption',
        description: 'Savers Vaults gaining traction with users providing single-sided liquidity.',
      },
      {
        type: 'update',
        title: 'v2 Migration',
        description: 'THORChain v2 (Cosmos SDK upgrade) planning in progress.',
      }
    ]
  },
  {
    id: 'apr-2023',
    title: 'Lending development, Cosmos SDK upgrade, THORFi progress',
    date: 'Apr 3, 2024',
    fullDate: 'April 3, 2024',
    content: [
      {
        type: 'feature',
        title: 'Lending Development',
        description: 'Lending protocol development progressing - collateralized borrowing against BTC/ETH.',
      },
      {
        type: 'feature',
        title: 'Savers Growth',
        description: 'Savers Vaults TVL growing as users provide single-sided liquidity.',
      },
      {
        type: 'update',
        title: 'Cosmos SDK v0.47',
        description: 'Upgrading to Cosmos SDK v0.47 in progress.',
      }
    ]
  },
  {
    id: 'may-2023',
    title: 'Lending protocol, security audits, THORFi development',
    date: 'Apr 3, 2024',
    fullDate: 'April 3, 2024',
    content: [
      {
        type: 'feature',
        title: 'Lending Protocol',
        description: 'Lending protocol in development - non-custodial, collateralized borrowing.',
      },
      {
        type: 'feature',
        title: 'Savers Vaults',
        description: 'Savers Vaults continues to grow - Deposit BTC, Earn BTC.',
      },
      {
        type: 'update',
        title: 'Security Audits',
        description: 'Ongoing security audits for Lending protocol.',
      }
    ]
  },
  {
    id: 'jun-2023',
    title: 'Lending progress, THORFi, network upgrades',
    date: 'Apr 3, 2024',
    fullDate: 'April 3, 2024',
    content: [
      {
        type: 'feature',
        title: 'Lending Progress',
        description: 'Lending protocol development continuing - targeting release in Q3.',
      },
      {
        type: 'feature',
        title: 'THORFi Development',
        description: 'THORFi suite (Lending + Savers) development progressing.',
      },
      {
        type: 'update',
        title: 'Network Upgrades',
        description: 'THORChain network upgrades in progress for improved performance.',
      }
    ]
  },
  {
    id: 'jul-2023',
    title: 'Lending launch prep, THORFi ecosystem',
    date: 'Apr 3, 2024',
    fullDate: 'April 3, 2024',
    content: [
      {
        type: 'feature',
        title: 'Lending Launch Preparation',
        description: 'Lending protocol preparing for launch.',
      },
      {
        type: 'feature',
        title: 'THORFi',
        description: 'THORFi ecosystem development ongoing.',
      },
      {
        type: 'update',
        title: 'Chain Integrations',
        description: 'New chain integrations being evaluated.',
      }
    ]
  },
  {
    id: 'aug-2023',
    title: 'Lending protocol, THORFi, planned obsolescence',
    date: 'Apr 3, 2024',
    fullDate: 'April 3, 2024',
    content: [
      {
        type: 'feature',
        title: 'Lending Protocol',
        description: 'Lending protocol development ongoing.',
      },
      {
        type: 'feature',
        title: 'THORFi Progress',
        description: 'THORFi suite development continuing.',
      },
      {
        type: 'update',
        title: 'Planned Obsolescence',
        description: 'Progress towards removing admin keys and decentralization.',
      }
    ]
  },
  {
    id: 'sep-2023',
    title: 'Lending progress, THORFi development, streaming swaps',
    date: 'Apr 3, 2024',
    fullDate: 'April 3, 2024',
    content: [
      {
        type: 'feature',
        title: 'Lending Progress',
        description: 'Lending protocol nearing completion.',
      },
      {
        type: 'feature',
        title: 'THORFi Development',
        description: 'THORFi suite development progressing.',
      },
      {
        type: 'update',
        title: 'Protocol Upgrades',
        description: 'Network upgrades and improvements in progress.',
      }
    ]
  },
  {
    id: 'oct-2023',
    title: 'Lending launch, THORFi, network stability',
    date: 'Apr 3, 2024',
    fullDate: 'April 3, 2024',
    content: [
      {
        type: 'feature',
        title: 'Lending Launch',
        description: 'Lending protocol preparing for launch.',
      },
      {
        type: 'feature',
        title: 'THORFi',
        description: 'THORFi development ongoing.',
      },
      {
        type: 'update',
        title: 'Network Stability',
        description: 'THORChain network operating smoothly.',
      }
    ]
  },
  {
    id: 'nov-2023',
    title: 'Lending protocol, THORFi, protocol improvements',
    date: 'Apr 3, 2024',
    fullDate: 'April 3, 2024',
    content: [
      {
        type: 'feature',
        title: 'Lending Protocol',
        description: 'Lending protocol in development.',
      },
      {
        type: 'feature',
        title: 'THORFi',
        description: 'THORFi suite development continuing.',
      },
      {
        type: 'update',
        title: 'Protocol Improvements',
        description: 'Continuous protocol improvements and upgrades.',
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