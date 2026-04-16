# Contributing to Flower Garden Project

Thanks for your interest in contributing. This is a personal project focused on Auckland, NZ cut flower growing — contributions that improve accuracy, add flower/vegetable data, or fix bugs are most welcome.

## How to Contribute

1. **Open an issue first** for anything beyond a small fix — describe what you want to change and why, so we can align before you write code.
2. Fork the repo and create a branch from `main`.
3. Make your changes with clear, focused commits.
4. Open a pull request against `main` using the PR template.

## What Makes a Good PR

- Targets a single concern (one bug, one flower entry, one feature)
- Includes a clear description of what changed and why
- Does not break the local dev setup (`uvicorn` + `npm run dev`)
- For data changes: cite a source for timing/growing information (e.g. NZ gardening guide, seed supplier)

## Merging

All PRs are reviewed and merged solely by the maintainer (@Tauriqbarron). Opening a PR does not guarantee it will be merged. The maintainer may close PRs that don't fit the project's direction without extended discussion.

## Data Accuracy

All flower and vegetable timing data should be accurate for **Auckland, New Zealand** (Zone 10a, Southern Hemisphere). PRs that generalise timing data to other climates will not be accepted.

## Code Style

- **Python**: follow existing patterns, no new dependencies without discussion
- **TypeScript/React**: match the existing component structure and Tailwind conventions
- No new packages without raising an issue first

## Reporting Bugs

Open a GitHub issue with:
- What you expected to happen
- What actually happened
- Steps to reproduce
