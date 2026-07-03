# Famous Move Chess

Famous Move Chess is a lightweight solo chess trainer focused on helping players understand why moves matter, not just whether they win.

You play White against a level-based opponent that becomes harder as you progress. The opponent borrows ideas from famous chess patterns such as Morphy-style development, the Sicilian Dragon, the Queen's Gambit Declined, and the French Defense. As you play, the game teaches the ideas behind replies, tracks how close your king is to danger, and gives a post-game review of your performance.

## What Makes It Different

Most chess tools focus on engine accuracy, ratings, or raw best-move analysis. Famous Move Chess is designed as a beginner-friendly coaching experience.

Its unique features are:

- **Famous-move-inspired opponent**: the AI does not just play random moves. It prefers patterns inspired by well-known chess openings and classic ideas.
- **Level progression**: each win increases the opponent's strength.
- **Mate-pressure meter**: every move updates a simple danger score showing how exposed your king is.
- **Move lessons**: opponent replies come with short explanations of the chess idea behind them.
- **End-game analysis**: after each game, your moves are reviewed for king safety, development, center control, material changes, and tactical risk.
- **Interactive performance questions**: after a game, you can ask questions like "Where did I go wrong?", "What was my best move?", "How was my king safety?", or "What should I practice next?"

## Features

- Play as White against a solo AI opponent.
- Legal chess move handling, including:
  - captures
  - castling
  - en passant
  - promotion
  - check
  - checkmate
  - stalemate
- Famous opening-inspired move choices.
- Level-based difficulty.
- Mate-pressure tracking after every move.
- Hints for safer candidate moves.
- Post-game move-by-move analysis.
- Local progress saved in browser `localStorage`.
- No external APIs or accounts required.

## How To Run

This project uses plain HTML, CSS, JavaScript, and a tiny Node.js static server. There is no install step.

From PowerShell:

```powershell
cd "C:\Users\bcroh\Documents\Famous Move Chess"
npm start
```

Then open:

```text
http://localhost:4173
```

## How To Stop The Server

If the server is running in the same terminal, press:

```powershell
Ctrl+C
```

If the server is running in the background on port `4173`, stop it with:

```powershell
$processId = (Get-NetTCPConnection -LocalPort 4173 -State Listen).OwningProcess
Stop-Process -Id $processId
```

If you started it on a different port, replace `4173` with that port number.

## Project Structure

```text
.
|-- app.js        # Chess logic, opponent AI, analysis, and UI behavior
|-- index.html    # App layout
|-- styles.css    # Visual design and responsive layout
|-- server.js     # Local static file server
|-- package.json  # Project scripts
`-- README.md
```

## Current Analysis Approach

The game currently uses heuristic analysis rather than a full chess engine like Stockfish. It evaluates practical learning signals such as:

- king safety
- mate pressure
- legal move availability
- material changes
- development
- center control
- checks and forcing moves

This keeps the experience simple, local, and explainable.

## Future Ideas

- Add Stockfish as an optional advanced analysis mode.
- Add named lesson paths for specific openings.
- Save full game history.
- Export PGN.
- Add puzzle-like review moments after each game.
- Add selectable difficulty settings.

