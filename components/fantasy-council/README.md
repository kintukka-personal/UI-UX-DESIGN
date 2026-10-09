# Draft Council

The [AI Council](../ai-council/) set up as a draft companion for an ESPN fantasy basketball points league. Nine voting personas and one non-voting researcher, Wire, sit on the ring. Each has a **role**, the **skills** it uses and the **data** it reads, and all of them point at one data repo: [Kintukka2/NBA-FANTASY](https://github.com/Kintukka2/NBA-FANTASY).

Plain HTML, CSS and vanilla JS, with no dependencies. It is built on the same classes and orb renderer as AI Council (`ui-council`).

![The Draft Council mid-session: Coach speaking at the front, the rest listening](preview.png)

## The personas

Every persona follows the same framework: **name, role, skills to use, and the paths it reads in the data repo.**

| Persona | Role | Votes | What they do | Skills |
| --- | --- | ---: | --- | --- |
| **Coach** | Draft strategist (chair) | 3 | Frames each pick against the league settings and our slot (6 of 8), then makes the call. Breaks ties as chair | `analysis-planning`, `insight-synthesis`, `executive-summary-generator`, `data:analyze` |
| **Archivist** | Data steward | 2 | Checks every number against its column and file before anyone uses it, and flags thin samples | `programmatic-eda`, `data-quality-audit`, `schema-mapper`, `metric-reconciliation`, `data-catalog-entry`, `context-packager` |
| **Cipher** | Projections | 2 | Owns the league-scored fantasy-points number, always as a range | `data:statistical-analysis`, `time-series-analysis`, `semantic-model-builder`, `methodology-explainer` |
| **Ledger** | Value & ADP | 2 | Finds the gap between ADP (standard scoring) and what a player scores here, at our next turn | `segmentation-analysis`, `impact-quantification`, `data:analyze` |
| **Medic** | Availability | 2 | Discounts every option by expected games missed, from the injury board and games played | `cohort-analysis`, `root-cause-investigation`, `time-series-analysis`, `research` |
| **Scout** | Role & opportunity | 2 | Minutes, usage, team changes and rookies: does last season's number still fit this season's role? | `research`, `data:explore-data`, `segmentation-analysis`, `impact-quantification` |
| **Tempo** | Roster & schedule | 2 | Position eligibility, the max-4 G rule, bench depth, weekly adds and the fantasy playoff weeks | `data:write-query`, `query-validation`, `domain-modeling` |
| **Vex** | Sceptic | 2 | Attacks every option, logs the assumption behind it, and describes how it busts | `grilling`, `analysis-assumptions-log`, `analysis-qa-checklist`, `peer-review-template` |
| **Quill** | Scribe | 2 | Keeps the council consistent with its earlier verdicts in council/sessions/ | `data-narrative-builder`, `analysis-documentation`, `analysis-retrospective`, `insight-synthesis` |
| **Wire** | Researcher (non-voting) | 0 | Before every meeting, searches the web for the latest news on the players in the question and writes a sourced briefing to `docs/research/`. Speaks first, never votes | tools: `WebSearch`, `WebFetch` |

Every member has 2 votes except Coach, the chair, with 3: 19 in total, so a majority is 10 and the closest result is 10 to 9. A yes/no vote can never tie. Wire has 0.

### Why these skills

Most of the skills come from the data-analytics skills pack, the same 31 skills as the `data-analytics-skills-main.zip` uploaded to the NBA-FANTASY repo. The rest are the `data:` plugin skills (`data:analyze`, `data:statistical-analysis` and others), plus `research` and `grilling`. Every skill on a preset is one the member can actually apply to a ballot. A few are repurposed for basketball:

- `cohort-analysis` lets Medic compare games played across groups of similar players, such as age bands or players coming back from the same injury.
- `time-series-analysis` lets Medic read a player's games-played trend across seasons, not just last season.
- `segmentation-analysis` builds Ledger's tiers, and lets Scout group players by role change (minutes up, minutes down, new team).
- `domain-modeling` lets Tempo model the roster rules (slots, the guard cap, bench, adds) once and check every option against them.
- `semantic-model-builder` lets Cipher define the fantasy points formula once, so every member uses the same one.
- `metric-reconciliation` catches ESPN numbers that disagree with other sources before they reach the board.
- `analysis-documentation` and `analysis-retrospective` let Quill write each verdict up and check it against how the pick turned out.

Skills that don't change a ballot are left off the presets: output tools (`xlsx`, `dataviz`, dashboards), `ab-test-analysis`, `funnel-analysis` and the SaaS metrics in `business-metrics-calculator`. You can still add any skill to any persona from the panel.

In this Claude Code environment the pack's skills are named with an `anthropic-skills:` prefix, for example `anthropic-skills:programmatic-eda`. The panel shows the short names.

## Connected to NBA-FANTASY

The personas are wired to the real repo. `PRESETS` in `script.js` mirrors
[`council/members.json`](https://github.com/Kintukka2/NBA-FANTASY/blob/main/council/members.json),
which is the single source of truth for every member's role, skills,
sources and vote weight. Every member reviews two folders, `docs/` and `data/`:

| Persona | Starts from |
| --- | --- |
| Coach | `docs/league-rules.md`, `docs/scoring.md`, `data/raw/league_settings.csv` |
| Archivist | `docs/data-dictionary.md`, `docs/methodology.md`, `data/raw/`, `data/processed/verification.csv` |
| Cipher | `data/processed/players_scored.csv`, `data/raw/actuals_2026.csv`, `data/raw/projections_2027.csv` |
| Ledger | `data/processed/players_scored.csv` (ADP against league-scored points), `docs/offseason-impact.md` |
| Medic | `docs/offseason-impact.md` §1 injury board, `Injury`, `A_GP`, `P_GP` |
| Scout | `docs/offseason-impact.md` §2–§7 |
| Tempo | `docs/league-rules.md` roster, waivers and playoffs (renamed **Roster & schedule**: the repo has no schedule file) |
| Vex | the known traps in every doc, §7 unresolved, Appendix A |
| Quill | `council/sessions/`, the council's own record |
| Wire | the web, last 14 days first; writes `docs/research/<YYYYMMDD-HHMM>-<slug>.md`, which every member reads first |

### Asking the council

Real deliberation runs in Claude Code, inside NBA-FANTASY:

```
/council Clingan or Sengun with pick 24?
```

First Wire (`council-researcher`) searches the web and writes a sourced
briefing to `docs/research/`. Then nine subagents (`.claude/agents/council-*.md`)
research the two folders, briefing first, in parallel, and each returns a ballot: vote, confidence, rationale, evidence.
A question can be **yes/no**, a **selection** between named options, or an
open **suggestion**, where the proposals are pooled and everyone votes again.
`council/tally.py` counts the votes (2 per member, 3 for Coach). If no option has a majority, the
top two go to a runoff, and the highest-voted answer is the verdict. See
`council/PROTOCOL.md` in that repo.

### Replaying a session on the ring

Each session is saved as JSON in NBA-FANTASY `council/sessions/`. Press
**Replay a session…** (or drop the file on the page, or open
`index.html?session=<url-to-the-json>`). Wire reads out the session's
research briefing first. Then each member thinks, swings to the
front and speaks its real vote and rationale, round by round. The panel then
shows the real tally and the verdict. `Council.replay(session)` does the same
from code.

## What's on screen

Everything from [AI Council](../ai-council/) works the same way: the ring, the five orb states, the speaking card rising and glowing, drag and keyboard, Convene, the weighted vote, adding and removing members, and saving edits in the browser. This version adds:

- **Draft question** replaces Motion. The default is "Take a big man with our first pick". The scripted lines talk about tiers, ADP, games played and four-point steals and blocks. They don't name or rate real players.
- **Data repo** links to NBA-FANTASY. **League rules** (name, format, teams, our slot, rounds, roster, max G, adds a week) and **Scoring** (points per stat; add or remove stats) are editable. Our snake picks update from the slot, and every persona pack carries the league as edited. Edits stay in this browser; **Reset to GONG** restores the league's real settings.
- **Skills** for the selected member are listed as chips. Remove one with ×, or add one from the catalogue with **+ Add a skill**. Each card shows how many skills that member has.
- **Reads from the repo** lists the member's paths, one per line.
- **Persona pack** writes the member out as instructions: brief, skills, repo and paths, scoring, lean and vote weight. **Copy pack** copies it, ready to paste into an agent's instructions.

## Plug in real agents

`window.Council` works the same as in [AI Council](../ai-council/#plug-in-real-agents), with a few additions:

| Call | What it does |
| --- | --- |
| `Council.pack(id)` | The member's persona pack, as Markdown |
| `Council.repo` | `{ name, url }` of the data repo |
| `Council.scoring` | The scoring as edited, as `[stat, points]` pairs |
| `Council.league()` / `Council.setLeague(patch)` / `Council.resetLeague()` | Read, change or reset the league rules and scoring. Changes fire a `league` event |
| `Council.skills` | The skills catalogue |
| `Council.get(id)` | Now includes `skills` and `sources` |
| `Council.replay(session)` | Plays a saved NBA-FANTASY council session on the ring and shows its real tally |

A real run sends each member's `Council.pack(id)` as its instructions, with the draft question as the prompt. It sets the member to `thinking` while the request runs, `speaking` while the answer streams into `Council.say(id, text)`, then back to `listening`.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The stage, the floor caption and the side panel |
| `style.css` | AI Council's styles, plus the scoring grid, skill chips and persona pack |
| `script.js` | The personas, skills catalogue, scoring and data repo, on top of AI Council's ring, orbs, panel and API |
| `preview.png` | A still at 1440 × 900, mid-session |
