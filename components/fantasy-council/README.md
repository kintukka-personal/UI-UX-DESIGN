# Draft Council

The [AI Council](../ai-council/) set up as a draft companion for an ESPN fantasy basketball points league. Nine personas sit on the ring. Each has a **role**, the **skills** it uses and the **data** it reads, and all of them point at one data repo: [Kintukka2/NBA-FANTASY](https://github.com/Kintukka2/NBA-FANTASY).

Plain HTML, CSS and vanilla JS, with no dependencies. It is built on the same classes and orb renderer as AI Council (`ui-council`).

![The Draft Council mid-session: Coach speaking at the front, the rest listening](preview.png)

## The personas

Every persona follows the same framework: **name, role, skills to use, and the paths it reads in the data repo.**

| Persona | Role | What they do in the draft | Skills | Reads from the repo |
| --- | --- | --- | --- | --- |
| **Coach** | Draft strategist (chair) | Frames each pick against the league settings and draft slot, calls on the right members, then makes the call | `analysis-planning`, `stakeholder-requirements-gathering`, `insight-synthesis`, `executive-summary-generator` | `league/settings.yaml`, `analysis/` |
| **Archivist** | Data steward | Checks every file before anyone uses it, reconciles ESPN against other sources, keeps the data dictionary, hands out context packs | `programmatic-eda`, `data-quality-audit`, `schema-mapper`, `metric-reconciliation`, `data-catalog-entry`, `context-packager` | `data/raw/`, `data/clean/`, `docs/data-dictionary.md` |
| **Cipher** | Projections | Projects ESPN fantasy points per game and per season, as a range | `data:statistical-analysis`, `time-series-analysis`, `semantic-model-builder`, `methodology-explainer` | `data/clean/game_logs/`, `league/settings.yaml`, `analysis/projections.csv` |
| **Ledger** | Value & ADP | Points over replacement by position, tiers, and players going too early or too late against ESPN's ADP | `segmentation-analysis`, `impact-quantification`, `data:analyze` | `analysis/projections.csv`, `data/clean/adp/`, `analysis/tiers.csv` |
| **Medic** | Availability | Expected games played from injury history, age and rest patterns, plus current injury news | `cohort-analysis`, `root-cause-investigation`, `deep-research` | `data/clean/injuries/`, `data/clean/game_logs/` |
| **Scout** | Role & opportunity | Minutes, usage, team changes and rookies. Uses with/without-teammate splits to size each change | `deep-research`, `research`, `ab-test-analysis`, `data:explore-data` | `data/clean/depth_charts/`, `data/clean/transactions/`, `data/clean/game_logs/` |
| **Tempo** | Schedule | Games per fantasy week, back-to-backs and the fantasy playoff weeks, as a tiebreaker | `data:write-query`, `query-validation`, `visualization-builder` | `data/clean/schedule/`, `league/settings.yaml` |
| **Vex** | Sceptic | Challenges every pick, logs the assumptions behind it, and describes how it busts | `grilling`, `analysis-assumptions-log`, `analysis-qa-checklist`, `peer-review-template` | `analysis/`, `docs/assumptions.md` |
| **Quill** | Scribe | Keeps the ranked cheat sheet and live draft board, and writes up each pick with its reasons | `xlsx`, `dataviz`, `dashboard-specification`, `data:build-dashboard`, `data-narrative-builder` | `analysis/`, `board/draft_board.xlsx` |

### Why these skills

Most of the skills come from the data-analytics skills pack, the same 31 skills as the `data-analytics-skills-main.zip` uploaded to the NBA-FANTASY repo. The rest are the `data:` plugin skills (`data:analyze`, `data:statistical-analysis` and others), plus `xlsx`, `dataviz`, `deep-research`, `research` and `grilling`. A few are repurposed for basketball:

- `ab-test-analysis` lets Scout compare a player's output with and without a teammate on the floor, which is a split test like any other.
- `cohort-analysis` lets Medic compare games played across groups of similar players, such as age bands or players coming back from the same injury.
- `segmentation-analysis` builds Ledger's tiers. Players in a tier are close enough in value to swap.
- `semantic-model-builder` lets Cipher define the fantasy points formula once, so every member uses the same one.
- `metric-reconciliation` catches ESPN numbers that disagree with other sources before they reach the board.

Some skills in the pack don't fit a draft and are left out: `funnel-analysis` and the SaaS metrics in `business-metrics-calculator`. You can still add any skill to any persona from the panel.

In this Claude Code environment the pack's skills are named with an `anthropic-skills:` prefix, for example `anthropic-skills:programmatic-eda`. The panel shows the short names.

## Suggested layout for the data repo

The NBA-FANTASY repo only has a README so far. The personas expect this layout. Change their sources in the panel, or in `PRESETS` in `script.js`, if you organise it differently.

```
league/settings.yaml           teams, roster slots, draft slot, scoring
data/raw/                      downloads, untouched
data/clean/
  game_logs/                   one row per player per game
  adp/                         ESPN average draft position
  injuries/                    injury history
  depth_charts/                rotations and starters
  transactions/                trades, signings, rookies
  schedule/                    the season schedule
docs/data-dictionary.md        what every column means (Archivist)
docs/assumptions.md            the assumption log (Vex)
analysis/                      projections.csv, tiers.csv, availability.csv …
board/draft_board.xlsx         the cheat sheet (Quill)
```

## Scoring

The panel shows ESPN's default points-league scoring. Every persona pack includes it:

| PTS | 3PM | FGM | FGA | FTM | FTA | REB | AST | STL | BLK | TOV |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| +1 | +1 | +2 | −1 | +1 | −1 | +1 | +2 | +4 | +4 | −2 |

Leagues can change these weights, so check yours under ESPN's league settings and edit `SCORING` in `script.js` to match.

## What's on screen

Everything from [AI Council](../ai-council/) works the same way: the ring, the five orb states, drag and keyboard, Convene, the weighted vote, adding and removing members, and saving edits in the browser. This version adds:

- **Draft question** replaces Motion. The default is "Take a big man with our first pick". The scripted lines talk about tiers, ADP, games played and four-point steals and blocks. They don't name or rate real players.
- **Data repo** links to NBA-FANTASY. **Scoring** shows the ESPN weights.
- **Skills** for the selected member are listed as chips. Remove one with ×, or add one from the catalogue with **+ Add a skill**. Each card shows how many skills that member has.
- **Reads from the repo** lists the member's paths, one per line.
- **Persona pack** writes the member out as instructions: brief, skills, repo and paths, scoring, lean and vote weight. **Copy pack** copies it, ready to paste into an agent's instructions.

## Plug in real agents

`window.Council` works the same as in [AI Council](../ai-council/#plug-in-real-agents), with a few additions:

| Call | What it does |
| --- | --- |
| `Council.pack(id)` | The member's persona pack, as Markdown |
| `Council.repo` | `{ name, url }` of the data repo |
| `Council.scoring` | The scoring weights, as `[stat, points]` pairs |
| `Council.skills` | The skills catalogue |
| `Council.get(id)` | Now includes `skills` and `sources` |

A real run sends each member's `Council.pack(id)` as its instructions, with the draft question as the prompt. It sets the member to `thinking` while the request runs, `speaking` while the answer streams into `Council.say(id, text)`, then back to `listening`.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The stage, the floor caption and the side panel |
| `style.css` | AI Council's styles, plus the scoring grid, skill chips and persona pack |
| `script.js` | The personas, skills catalogue, scoring and data repo, on top of AI Council's ring, orbs, panel and API |
| `preview.png` | A still at 1440 × 900, mid-session |
