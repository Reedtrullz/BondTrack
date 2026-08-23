# BondTrack predecessor evidence manifest

This directory is a read-only, source-linked curation of historical QA and audit
evidence from the archived THORNode Watcher checkout. It is not current Heimdall
validation and it does not claim that the reported bugs or deployment observations
remain unchanged.

## Provenance

- Source checkout: `/Users/reidar/Projectos/THORNode Watcher`
- Nested Git repository: `thornode-watcher` (remote was `Reedtrullz/BondTrack`)
- Source branch: `staging`
- Source HEAD: `093f21acfe5babb7e22b619ecf64a639854e1c97`
- Predecessor archive marker also preserved: `392701c3d3335a19dbe4dec16673eeceff67a379`
- The three tracked reports copied below are byte-identical to the existing
  `docs/archive/` copies in Heimdall; they are repeated here to preserve their
  BondTrack-predecessor provenance. Existing archive files were not modified.
- The outer QA report, the dated dogfood report, and the seven screenshots were
  untracked evidence beside the nested repository; their association with the
  checkout is recorded here, not inferred from a Git blob.

## Recoverable private archive

The complete nested Git history and outer working tree are preserved outside the
repository (the archive directory is mode `700`; files are mode `600`):

`/Users/reidar/Documents/Project Archives/Projectos/2026-08-23/thornode-watcher-bondtrack-predecessor/`

- `BondTrack-all-refs.bundle` — SHA-256
  `a37d9adb3912aa556c07a212e1636717b3dcba6448c7ae1e59b8f05600016240`
- `working-tree-and-qa.tar.gz` — SHA-256
  `ad917ff48c7f11851c63a3342ec978b5a27b7a3fd45ab8abebffcd6927964d81`
- `SHA256SUMS` — checks both files above.
- `bundle-heads.txt` and `bundle-recovery.txt` — complete bundle heads and
  bounded clone verification.
- `working-tree-and-qa.list`, `outer-tree-manifest.tsv`, and
  `recovery-comparison.txt` — tar listing and bounded extraction comparison.

The bundle contains 15 heads and `git bundle verify` reports a complete history.
A bounded clone verified all 15 head objects, `392701c`, `093f21a`, and cloned
`HEAD=093f21a`. The tar contains 943 entries and excludes
`THORNode Watcher/thornode-watcher/.git`. Extraction comparison matched
`833` regular files and `42,146,617` bytes with a byte-identical SHA manifest.

## Curated files

The archived name is the path in this directory. Hashes are SHA-256 of the
copied file and were checked against the source before staging.

| Original path | Archived name | SHA-256 |
|---|---|---|
| `thornode-watcher/AUDIT-2026-04-30.md` | `AUDIT-2026-04-30.md` | `bef25e3101b7965fbe646a9a761f3aab91cd754dd2cb0b1bd5102b8f937726c3` |
| `thornode-watcher/UI_UX_AUDIT_REPORT.md` | `UI_UX_AUDIT_REPORT.md` | `af1729ce90cb5adb92765b2df41b8a261a480212f711d3b6b505c02a6922577a` |
| `thornode-watcher/LP_AUDIT_REPORT.md` | `LP_AUDIT_REPORT.md` | `d53a80ef2d70527be34a4504b131c6822234f6fb686f03352fec14207973ff91` |
| `QA_AUDIT_REPORT.md` | `QA_AUDIT_REPORT.md` | `f3167121d429a9724818626a7a43890083d9d68aed54f54d55a8acaf9858e852` |
| `dogfood-output/report.md` (2026-05-04) | `dogfood-output-report-2026-05-04.md` | `b23950b200ab28a34dbfb66b35bc9a13d284f88eff4a32a89e3796a31cc7d074` |
| `thornode-watcher/dogfood-output/report.md` (2025-05-03) | `dogfood-output-report-2025-05-03.md` | `6374748c0e614ea1b79e2427ae8c845c80e1bb51c9c9a3447f8b5925d229b0e7` |
| `portfolio-page.png` | `portfolio-page.png` | `bba51c7411513a8d700e1b644c069619280225c99277ee4c8c8aaee914f3b8d0` |
| `nodes-page.png` | `nodes-page.png` | `c5c0c67f3d91ab36918402e6aa871d18a9c4d9d5fd95ff85b08b88fa41fa0698` |
| `rewards-page.png` | `rewards-page.png` | `f1539e1964aad52179364d29146b8b0cba4bce538aa38d7b17d068193b9fd8a2` |
| `lp-page.png` | `lp-page.png` | `61d235578ab4db4f6dbbf969a60928f0148b15c9eddf7cd2bc9f9168bbbc5b8c` |
| `risk-page.png` | `risk-page.png` | `24394ef1e07c5388f331378f042bb4fb89aeef2df66bbb62cbe6daf4519fac9f` |
| `transactions-page.png` | `transactions-page.png` | `262c957d0c73f464c7a6a386fb46946d6b203d05030d1b21eb0166345b4e403c` |
| `changelogs-page.png` | `changelogs-page.png` | `df2457e252f21ddbb909afd4e01a313e4fb64f33e39a817e3405fb1517684de9` |

The screenshot set is the final-page set named by the 2026-04-29 UI/UX report.
The complete uncurated screenshot and browser-capture set remains only in the
private recovery tar.

## Deliberate exclusions

No Hermes conversation JSON, `.vercel` metadata, `.hermes` runtime/session state,
`.playwright-mcp` browser captures, raw browser screenshots, credentials, tokens,
environment files, dependencies, or build caches were copied into this Git
archive. Public THORChain addresses appearing in the reviewed reports are
historical test data, not credentials. The private recovery tar is a full outer
working-tree preservation and is not a source for public Git content.
