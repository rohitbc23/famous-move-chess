const $ = (selector) => document.querySelector(selector);

const els = {
  board: $("#board"),
  levelNumber: $("#levelNumber"),
  levelProgress: $("#levelProgress"),
  levelText: $("#levelText"),
  matePercent: $("#matePercent"),
  dangerFill: $("#dangerFill"),
  dangerText: $("#dangerText"),
  meterPanel: $("#meterPanel"),
  lessonTitle: $("#lessonTitle"),
  lessonBody: $("#lessonBody"),
  statusLine: $("#statusLine"),
  gameTitle: $("#gameTitle"),
  scoreText: $("#scoreText"),
  capturedPieces: $("#capturedPieces"),
  analysisPanel: $("#analysisPanel"),
  analysisSummary: $("#analysisSummary"),
  analysisList: $("#analysisList"),
  analysisQuestionForm: $("#analysisQuestionForm"),
  analysisQuestion: $("#analysisQuestion"),
  analysisChat: $("#analysisChat"),
  moveList: $("#moveList"),
  newGameButton: $("#newGameButton"),
  hintButton: $("#hintButton")
};

const files = "abcdefgh";
const glyphs = {
  w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
  b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" }
};
const values = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const storageKey = "famous-move-chess";

const books = [
  {
    name: "Morphy's Opera Game",
    description: "Development with tempo: black fights for the center while watching for pins and fast castling.",
    replies: {
      "e2e4": ["e7e5", "Classical reply", "Black mirrors old-master principles: occupy the center, free the bishop, and prepare kingside development."],
      "e2e4 g1f3": ["b8c6", "Develop with a threat", "The knight defends e5 and asks White to prove the next attacking idea."],
      "e2e4 g1f3 f1c4": ["g8f6", "Two knights defense", "Black attacks e4 while developing, a classic way to gain time."],
      "d2d4": ["d7d5", "Meet center with center", "Against queen-pawn openings, black claims equal central space before choosing a structure."]
    }
  },
  {
    name: "Sicilian Dragon ideas",
    description: "Black uses sharper Sicilian-style counterplay against 1.e4.",
    replies: {
      "e2e4": ["c7c5", "Sicilian counterpunch", "Black challenges d4 from the flank and creates an imbalanced fight."],
      "e2e4 g1f3": ["d7d6", "Dragon foundation", "This keeps e5 controlled and prepares a kingside fianchetto."],
      "e2e4 g1f3 d2d4": ["c5d4", "Open Sicilian", "Black trades a flank pawn for a central pawn, one reason the Sicilian is so fighting."],
      "e2e4 g1f3 d2d4 f3d4": ["g8f6", "Tempo on e4", "The knight develops while pressuring e4, a standard Open Sicilian rhythm."]
    }
  },
  {
    name: "Queen's Gambit Declined",
    description: "Black borrows a world-championship structure: solid center, patient development, then pressure.",
    replies: {
      "d2d4": ["d7d5", "Queen-pawn duel", "Black takes equal space so White cannot build a free center."],
      "d2d4 c2c4": ["e7e6", "Decline the gambit", "This famous reply protects d5 and keeps the structure sturdy."],
      "d2d4 c2c4 b1c3": ["g8f6", "Develop before deciding", "Black adds pressure before committing the light bishop."],
      "d2d4 c2c4 g1f3": ["g8f6", "Classical development", "Knights before bishops, king safety soon after."]
    }
  },
  {
    name: "French Defense pressure",
    description: "Black lets White build a center, then attacks it like many classic French games.",
    replies: {
      "e2e4": ["e7e6", "French Defense", "Black prepares d5 and invites White to overextend."],
      "e2e4 d2d4": ["d7d5", "Challenge the pawn chain", "The French idea is simple: hit the center before it rolls."],
      "e2e4 d2d4 e4e5": ["c7c5", "Break at the base", "Black attacks d4, the base of White's pawn chain."],
      "e2e4 d2d4 b1c3": ["g8f6", "Pressure e4", "Black develops into the center and asks whether e4 can be maintained."]
    }
  }
];

let game;

function initialBoard() {
  const board = Array(64).fill(null);
  const back = ["r", "n", "b", "q", "k", "b", "n", "r"];
  for (let file = 0; file < 8; file += 1) {
    board[file] = { c: "b", t: back[file] };
    board[file + 8] = { c: "b", t: "p" };
    board[file + 48] = { c: "w", t: "p" };
    board[file + 56] = { c: "w", t: back[file] };
  }
  return board;
}

function loadStats() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || { level: 1, wins: 0, losses: 0, games: 0 };
  } catch {
    return { level: 1, wins: 0, losses: 0, games: 0 };
  }
}

function saveStats() {
  localStorage.setItem(storageKey, JSON.stringify(game.stats));
}

function newGame() {
  const stats = loadStats();
  const book = books[(stats.games + stats.level - 1) % books.length];
  game = {
    board: initialBoard(),
    turn: "w",
    selected: null,
    legalTargets: [],
    history: [],
    captured: [],
    castle: { K: true, Q: true, k: true, q: true },
    enPassant: null,
    stats,
    book,
    finalAnalysis: null,
    analysisChat: [],
    over: false
  };
  teach("Opening plan", `${book.name}: ${book.description}`);
  render();
}

function row(i) { return Math.floor(i / 8); }
function col(i) { return i % 8; }
function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
function opponent(color) { return color === "w" ? "b" : "w"; }
function coord(i) { return `${files[col(i)]}${8 - row(i)}`; }
function indexOf(square) { return (8 - Number(square[1])) * 8 + files.indexOf(square[0]); }
function moveKey(move) { return `${coord(move.from)}${coord(move.to)}`; }

function cloneState(state) {
  return {
    ...state,
    board: state.board.map((piece) => (piece ? { ...piece } : null)),
    castle: { ...state.castle },
    history: state.history.slice(),
    captured: state.captured.slice()
  };
}

function kingIndex(state, color) {
  return state.board.findIndex((piece) => piece?.c === color && piece.t === "k");
}

function addSlideMoves(state, from, moves, directions) {
  const piece = state.board[from];
  for (const [dr, dc] of directions) {
    let r = row(from) + dr;
    let c = col(from) + dc;
    while (inBounds(r, c)) {
      const to = r * 8 + c;
      const target = state.board[to];
      if (!target) moves.push({ from, to });
      else {
        if (target.c !== piece.c) moves.push({ from, to, capture: target });
        break;
      }
      r += dr;
      c += dc;
    }
  }
}

function pseudoMoves(state, from, attacksOnly = false) {
  const piece = state.board[from];
  if (!piece) return [];
  const moves = [];
  const r = row(from);
  const c = col(from);

  if (piece.t === "p") {
    const dir = piece.c === "w" ? -1 : 1;
    const start = piece.c === "w" ? 6 : 1;
    const promoteRow = piece.c === "w" ? 0 : 7;
    for (const dc of [-1, 1]) {
      const tr = r + dir;
      const tc = c + dc;
      if (!inBounds(tr, tc)) continue;
      const to = tr * 8 + tc;
      const target = state.board[to];
      if (attacksOnly || target?.c === opponent(piece.c) || state.enPassant === to) {
        moves.push({ from, to, capture: target, enPassant: !target && state.enPassant === to, promotion: tr === promoteRow ? "q" : null });
      }
    }
    if (attacksOnly) return moves;
    const one = (r + dir) * 8 + c;
    if (inBounds(r + dir, c) && !state.board[one]) {
      moves.push({ from, to: one, promotion: r + dir === promoteRow ? "q" : null });
      const two = (r + dir * 2) * 8 + c;
      if (r === start && !state.board[two]) moves.push({ from, to: two, doublePawn: true });
    }
    return moves;
  }

  if (piece.t === "n") {
    for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
      const tr = r + dr;
      const tc = c + dc;
      if (!inBounds(tr, tc)) continue;
      const to = tr * 8 + tc;
      const target = state.board[to];
      if (!target || target.c !== piece.c) moves.push({ from, to, capture: target });
    }
  }

  if (piece.t === "b" || piece.t === "q") addSlideMoves(state, from, moves, [[-1, -1], [-1, 1], [1, -1], [1, 1]]);
  if (piece.t === "r" || piece.t === "q") addSlideMoves(state, from, moves, [[-1, 0], [1, 0], [0, -1], [0, 1]]);

  if (piece.t === "k") {
    for (const dr of [-1, 0, 1]) {
      for (const dc of [-1, 0, 1]) {
        if (!dr && !dc) continue;
        const tr = r + dr;
        const tc = c + dc;
        if (!inBounds(tr, tc)) continue;
        const to = tr * 8 + tc;
        const target = state.board[to];
        if (!target || target.c !== piece.c) moves.push({ from, to, capture: target });
      }
    }
    if (!attacksOnly && !inCheck(state, piece.c)) {
      const home = piece.c === "w" ? 7 : 0;
      const kingSide = piece.c === "w" ? "K" : "k";
      const queenSide = piece.c === "w" ? "Q" : "q";
      if (state.castle[kingSide] && !state.board[home * 8 + 5] && !state.board[home * 8 + 6]) {
        if (!isAttacked(state, home * 8 + 5, opponent(piece.c)) && !isAttacked(state, home * 8 + 6, opponent(piece.c))) {
          moves.push({ from, to: home * 8 + 6, castle: "king" });
        }
      }
      if (state.castle[queenSide] && !state.board[home * 8 + 1] && !state.board[home * 8 + 2] && !state.board[home * 8 + 3]) {
        if (!isAttacked(state, home * 8 + 3, opponent(piece.c)) && !isAttacked(state, home * 8 + 2, opponent(piece.c))) {
          moves.push({ from, to: home * 8 + 2, castle: "queen" });
        }
      }
    }
  }
  return moves;
}

function isAttacked(state, square, byColor) {
  for (let i = 0; i < 64; i += 1) {
    const piece = state.board[i];
    if (piece?.c === byColor && pseudoMoves(state, i, true).some((move) => move.to === square)) return true;
  }
  return false;
}

function inCheck(state, color) {
  const king = kingIndex(state, color);
  return king >= 0 && isAttacked(state, king, opponent(color));
}

function legalMoves(state, color = state.turn) {
  const moves = [];
  for (let i = 0; i < 64; i += 1) {
    const piece = state.board[i];
    if (!piece || piece.c !== color) continue;
    for (const move of pseudoMoves(state, i)) {
      const next = cloneState(state);
      applyMove(next, move, false);
      if (!inCheck(next, color)) moves.push(move);
    }
  }
  return moves;
}

function applyMove(state, move, record = true) {
  const piece = state.board[move.from];
  const captured = move.enPassant ? state.board[move.to + (piece.c === "w" ? 8 : -8)] : state.board[move.to];
  state.board[move.to] = { c: piece.c, t: move.promotion || piece.t };
  state.board[move.from] = null;
  if (move.enPassant) state.board[move.to + (piece.c === "w" ? 8 : -8)] = null;

  if (move.castle === "king") {
    const home = piece.c === "w" ? 7 : 0;
    state.board[home * 8 + 5] = state.board[home * 8 + 7];
    state.board[home * 8 + 7] = null;
  }
  if (move.castle === "queen") {
    const home = piece.c === "w" ? 7 : 0;
    state.board[home * 8 + 3] = state.board[home * 8];
    state.board[home * 8] = null;
  }

  updateCastling(state, move, piece, captured);
  state.enPassant = move.doublePawn ? move.from + (piece.c === "w" ? -8 : 8) : null;
  state.turn = opponent(state.turn);

  if (!record) return null;
  const stored = { ...move, piece: { ...piece }, captured: captured ? { ...captured } : null, notation: notation(state, move, piece, captured) };
  state.history.push(stored);
  if (captured) state.captured.push(captured);
  return stored;
}

function updateCastling(state, move, piece, captured) {
  if (piece.t === "k") {
    if (piece.c === "w") { state.castle.K = false; state.castle.Q = false; }
    else { state.castle.k = false; state.castle.q = false; }
  }
  if (piece.t === "r") {
    if (move.from === indexOf("h1")) state.castle.K = false;
    if (move.from === indexOf("a1")) state.castle.Q = false;
    if (move.from === indexOf("h8")) state.castle.k = false;
    if (move.from === indexOf("a8")) state.castle.q = false;
  }
  if (captured?.t === "r") {
    if (move.to === indexOf("h1")) state.castle.K = false;
    if (move.to === indexOf("a1")) state.castle.Q = false;
    if (move.to === indexOf("h8")) state.castle.k = false;
    if (move.to === indexOf("a8")) state.castle.q = false;
  }
}

function notation(state, move, piece, captured) {
  if (move.castle === "king") return "O-O";
  if (move.castle === "queen") return "O-O-O";
  const name = piece.t === "p" ? "" : piece.t.toUpperCase();
  const capture = captured || move.enPassant ? "x" : "";
  const pawnFile = piece.t === "p" && capture ? files[col(move.from)] : "";
  const promo = move.promotion ? `=${move.promotion.toUpperCase()}` : "";
  const suffix = inCheck(state, state.turn) ? (legalMoves(state, state.turn).length ? "+" : "#") : "";
  return `${name}${pawnFile}${capture}${coord(move.to)}${promo}${suffix}`;
}

function materialBalanceForWhite(state) {
  return state.board.reduce((sum, piece) => sum + (piece ? (piece.c === "w" ? values[piece.t] : -values[piece.t]) : 0), 0);
}

function matePressure(state) {
  const whiteMoves = legalMoves(state, "w");
  if (inCheck(state, "w") && whiteMoves.length === 0) return { percent: 100, score: 50, text: "Checkmate. The attack has landed." };
  let score = inCheck(state, "w") ? 28 : 0;
  score += Math.max(0, 18 - whiteMoves.length) * 1.9;
  const king = kingIndex(state, "w");
  const zone = [];
  for (const dr of [-1, 0, 1]) {
    for (const dc of [-1, 0, 1]) {
      const r = row(king) + dr;
      const c = col(king) + dc;
      if (inBounds(r, c)) zone.push(r * 8 + c);
    }
  }
  score += zone.filter((sq) => isAttacked(state, sq, "b")).length * 5;
  const checks = legalMoves(state, "b").filter((move) => {
    const next = cloneState(state);
    applyMove(next, move, false);
    return inCheck(next, "w");
  }).length;
  score += Math.min(checks * 4, 22);
  const percent = Math.max(0, Math.min(99, Math.round(score)));
  let text = "Your king is comfortable. Keep developing and avoid loose pieces.";
  if (percent > 70) text = "Critical danger: black has forcing checks or your king has very few exits.";
  else if (percent > 42) text = "Tension is rising. Look for checks, captures, and threats against your king.";
  else if (percent > 18) text = "Some pressure is building, but you still have room to improve king safety.";
  return { percent, score, text };
}

function evaluate(state) {
  const blackMoves = legalMoves(state, "b");
  const whiteMoves = legalMoves(state, "w");
  if (inCheck(state, "w") && whiteMoves.length === 0) return 100000;
  if (inCheck(state, "b") && blackMoves.length === 0) return -100000;
  let score = 0;
  for (let i = 0; i < 64; i += 1) {
    const piece = state.board[i];
    if (!piece) continue;
    const center = [27, 28, 35, 36].includes(i) ? 18 : [18, 19, 20, 21, 26, 29, 34, 37, 42, 43, 44, 45].includes(i) ? 8 : 0;
    score += (piece.c === "b" ? 1 : -1) * (values[piece.t] + center);
  }
  score += (blackMoves.length - whiteMoves.length) * 4;
  score += matePressure(state).score * 2;
  return score;
}

function minimax(state, depth, alpha, beta, maximizing) {
  const moves = legalMoves(state, state.turn);
  if (depth === 0 || !moves.length) return { score: evaluate(state), move: null };
  let best = null;
  if (maximizing) {
    let value = -Infinity;
    for (const move of moves) {
      const next = cloneState(state);
      applyMove(next, move, false);
      const score = minimax(next, depth - 1, alpha, beta, false).score;
      if (score > value) { value = score; best = move; }
      alpha = Math.max(alpha, value);
      if (beta <= alpha) break;
    }
    return { score: value, move: best };
  }
  let value = Infinity;
  for (const move of moves) {
    const next = cloneState(state);
    applyMove(next, move, false);
    const score = minimax(next, depth - 1, alpha, beta, true).score;
    if (score < value) { value = score; best = move; }
    beta = Math.min(beta, value);
    if (beta <= alpha) break;
  }
  return { score: value, move: best };
}

function findBookMove() {
  const whiteLine = game.history.filter((move) => move.piece.c === "w").map(moveKey).join(" ");
  const reply = game.book.replies[whiteLine];
  if (!reply) return null;
  const [key, title, body] = reply;
  const move = legalMoves(game, "b").find((candidate) => moveKey(candidate) === key);
  return move ? { move, title, body } : null;
}

function chooseOpponentMove() {
  const book = findBookMove();
  if (book && Math.random() < Math.min(0.9, 0.45 + game.stats.level * 0.08)) return book;
  const legal = legalMoves(game, "b");
  const mate = legal.find((move) => {
    const next = cloneState(game);
    applyMove(next, move, false);
    return inCheck(next, "w") && !legalMoves(next, "w").length;
  });
  if (mate) return { move: mate, title: "Finish the pattern", body: "The opponent found a forced mate. Replay the last few moves and look for the first king-safety warning." };
  const depth = game.stats.level >= 6 ? 3 : game.stats.level >= 3 ? 2 : 1;
  const best = minimax(cloneState(game), depth, -Infinity, Infinity, true).move || legal[0];
  return { move: best, ...lessonForMove(best) };
}

function lessonForMove(move) {
  const piece = game.board[move.from];
  if (move.castle) return { title: "King safety", body: "Castling copies a classic master habit: develop, tuck the king away, then attack." };
  if (move.capture) return { title: "Forcing move", body: "Captures are forcing. Strong players check captures first because the opponent has fewer comfortable replies." };
  if (piece.t === "n" || piece.t === "b") return { title: "Develop with purpose", body: "This develops a minor piece toward central squares, a principle behind many famous openings." };
  if (piece.t === "p" && "cdef".includes(coord(move.to)[0])) return { title: "Central pawn break", body: "Classic games are full of pawn breaks that challenge the center before development is complete." };
  return { title: "Improve the worst piece", body: "When no tactic is immediate, famous games often turn on small improvements in piece coordination." };
}

function analyzePlayerMove(moveRecord, before, after) {
  const beforePressure = matePressure(before).percent;
  const afterPressure = matePressure(after).percent;
  const materialDelta = materialBalanceForWhite(after) - materialBalanceForWhite(before);
  const notes = [];
  let rating = "steady";
  if (moveRecord.castle) notes.push("castled and improved king safety");
  if (moveRecord.captured) notes.push(`won ${pieceName(moveRecord.captured.t)} material`);
  if ([indexOf("d4"), indexOf("e4"), indexOf("d5"), indexOf("e5")].includes(moveRecord.to)) notes.push("claimed a central square");
  if ((moveRecord.piece.t === "n" || moveRecord.piece.t === "b") && row(moveRecord.from) === 7) notes.push("developed a minor piece");
  if (inCheck(after, "b")) notes.push("made a forcing check");
  const pressureDelta = afterPressure - beforePressure;
  if (pressureDelta <= -18) { rating = "strong"; notes.push("reduced mate pressure sharply"); }
  else if (pressureDelta >= 24) { rating = "risky"; notes.push("allowed the attack on your king to grow"); }
  else if (pressureDelta >= 12) notes.push("slightly increased king danger");
  else if (pressureDelta < 0) notes.push("made your king a little safer");
  if (materialDelta > 0) rating = rating === "risky" ? "mixed" : "strong";
  if (materialDelta < -250) { rating = "risky"; notes.push("lost significant material"); }
  if (!notes.length) notes.push("kept the position playable without a clear tactical change");
  return { move: moveRecord.notation, rating, pressureBefore: beforePressure, pressureAfter: afterPressure, materialDelta, text: notes.join("; ") };
}

function pieceName(type) {
  return { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" }[type];
}

function buildGameAnalysis(result) {
  const moves = game.history.filter((move) => move.piece.c === "w" && move.analysis).map((move, index) => ({ number: index + 1, ...move.analysis }));
  const strong = moves.filter((move) => move.rating === "strong").length;
  const mixed = moves.filter((move) => move.rating === "mixed").length;
  const risky = moves.filter((move) => move.rating === "risky").length;
  return {
    summary: `${result} You made ${moves.length} move${moves.length === 1 ? "" : "s"}. ${strong} strong, ${mixed} mixed, ${risky} risky. Final mate pressure: ${matePressure(game).percent}%.`,
    moves
  };
}

function answerPerformanceQuestion(question) {
  const analysis = game.finalAnalysis || buildGameAnalysis("This game is still in progress.");
  const moves = analysis.moves;
  if (!moves.length) return "Make a few moves first and I can give useful feedback from the position history.";
  const asked = question.toLowerCase();
  const tokens = asked.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const risky = moves.filter((move) => move.rating === "risky");
  const strong = moves.filter((move) => move.rating === "strong");
  const mixed = moves.filter((move) => move.rating === "mixed");
  const steady = moves.filter((move) => move.rating === "steady");
  const pressureJump = moves.reduce((best, move) => (move.pressureAfter - move.pressureBefore > best.pressureAfter - best.pressureBefore ? move : best), moves[0]);
  const pressureDrop = moves.reduce((best, move) => (move.pressureAfter - move.pressureBefore < best.pressureAfter - best.pressureBefore ? move : best), moves[0]);
  const materialLosses = moves.filter((move) => move.materialDelta < 0);
  const materialWins = moves.filter((move) => move.materialDelta > 0);
  const avgPressure = Math.round(moves.reduce((sum, move) => sum + move.pressureAfter, 0) / moves.length);
  const requestedMove = requestedMoveNumber(asked, moves.length);

  if (requestedMove) {
    const move = moves[requestedMove - 1];
    return `Move ${move.number}, ${move.move}: ${move.text}. I marked it ${move.rating}. Mate pressure moved from ${move.pressureBefore}% to ${move.pressureAfter}%, and the material change was ${formatMaterial(move.materialDelta)}.`;
  }

  if (hasAny(tokens, ["summary", "overall", "recap", "review"])) {
    return `${analysis.summary} Your clearest strength was ${strong.length ? `${strong[0].number}. ${strong[0].move}` : "keeping the game mostly playable"}. The main review point is ${pressureJump.number}. ${pressureJump.move}, because it created the biggest pressure increase.`;
  }

  if (hasAny(tokens, ["opening", "start", "early", "debut"])) {
    const openingMoves = moves.slice(0, Math.min(4, moves.length));
    const developed = openingMoves.filter((move) => move.text.includes("developed") || move.text.includes("central") || move.text.includes("castled"));
    return `In the opening, your first ${openingMoves.length} move${openingMoves.length === 1 ? "" : "s"} were ${openingMoves.map((move) => `${move.number}. ${move.move}`).join(", ")}. ${developed.length ? "The good part: you had development or center-related ideas." : "The main issue: I do not see enough development, center control, or king-safety progress in those early moves."} The first opening move I would review is ${openingMoves.find((move) => move.rating === "risky")?.number || pressureJump.number}. ${openingMoves.find((move) => move.rating === "risky")?.move || pressureJump.move}.`;
  }

  if (hasAny(tokens, ["wrong", "mistake", "bad", "blunder", "problem", "weakness", "weak"])) {
    if (!risky.length) return `I do not see a single obvious collapse. Your biggest concern was pressure management: average mate pressure after your moves was ${avgPressure}%. Review ${pressureJump.number}. ${pressureJump.move}, where pressure moved from ${pressureJump.pressureBefore}% to ${pressureJump.pressureAfter}%.`;
    const move = risky[0];
    return `The first move I would review is ${move.number}. ${move.move}. It was risky because ${move.text}. Mate pressure went from ${move.pressureBefore}% to ${move.pressureAfter}%. Before similar moves, pause and ask: what checks or captures does black get next?`;
  }

  if (hasAny(tokens, ["best", "worked", "good", "strength", "strong"])) {
    const move = strong[0] || pressureDrop || materialWins[0];
    return `${move.number}. ${move.move} was your best practical moment. It ${move.text}, and mate pressure changed from ${move.pressureBefore}% to ${move.pressureAfter}%.`;
  }

  if (hasAny(tokens, ["king", "checkmate", "pressure", "mate", "safe", "safety", "danger", "attack"])) {
    return `Your king-safety story: average pressure after your moves was ${avgPressure}%. Biggest danger spike: ${pressureJump.number}. ${pressureJump.move}, from ${pressureJump.pressureBefore}% to ${pressureJump.pressureAfter}%. Best pressure reducer: ${pressureDrop.number}. ${pressureDrop.move}, from ${pressureDrop.pressureBefore}% to ${pressureDrop.pressureAfter}%.`;
  }

  if (hasAny(tokens, ["material", "capture", "piece", "pawn", "queen", "rook", "bishop", "knight", "trade", "exchange"])) {
    if (!materialLosses.length && !materialWins.length) return "Material stayed mostly stable. The game was decided more by king safety, development, and threats.";
    const wins = materialWins.length ? `You gained material on ${materialWins.map((move) => `${move.number}. ${move.move}`).join(", ")}.` : "No clear material-winning move.";
    const losses = materialLosses.length ? `You lost material on ${materialLosses.map((move) => `${move.number}. ${move.move}`).join(", ")}.` : "No clear material-losing move.";
    return `${wins} ${losses}`;
  }

  if (hasAny(tokens, ["development", "develop", "center", "centre", "castle", "castling"])) {
    const useful = moves.filter((move) => /developed|central|castled/.test(move.text));
    if (!useful.length) return "I do not see enough development, center control, or castling in your move notes. Your next focus should be: develop minor pieces, fight for d4/e4/d5/e5, and castle before launching pawn moves.";
    return `Your development/center moves were ${useful.map((move) => `${move.number}. ${move.move}`).join(", ")}. Keep that habit, but compare it with ${pressureJump.number}. ${pressureJump.move}, where the position became more dangerous.`;
  }

  if (hasAny(tokens, ["why", "because", "reason"])) {
    const target = risky[0] || mixed[0] || pressureJump;
    return `The main reason I highlight ${target.number}. ${target.move} is the change in consequences: ${target.text}. The pressure number moved from ${target.pressureBefore}% to ${target.pressureAfter}%, so black had more forcing chances afterward.`;
  }

  if (hasAny(tokens, ["practice", "improve", "next", "learn", "train", "focus"])) {
    if (risky.length) return `Practice king-safety checks before moving: ask "what checks does black get?" Your first risky move was ${risky[0].number}. ${risky[0].move}.`;
    if (steady.length > strong.length) return "Practice making more purposeful moves. Too many moves were steady rather than active. Before moving, choose one job: develop, control the center, castle, create a threat, or win material.";
    return "Practice making moves with a clear job: develop a piece, control the center, castle, create a threat, or win material.";
  }

  if (hasAny(tokens, ["draw", "won", "win", "lost", "lose", "result", "finish", "ended"])) {
    return `${analysis.summary} The result was most connected to ${pressureJump.number}. ${pressureJump.move}, the move that changed danger the most. If you want a more specific answer, ask about king safety, material, opening, or a move number.`;
  }

  return `I can answer that better if you ask about a specific theme: mistakes, best move, king safety, material, opening, development, practice, or a move number like "move 3". For this game, the move I would inspect first is ${pressureJump.number}. ${pressureJump.move}.`;
}

function hasAny(tokens, words) {
  return words.some((word) => tokens.includes(word));
}

function requestedMoveNumber(asked, maxMove) {
  const moveMatch = asked.match(/\b(?:move|turn)\s+(\d{1,2})\b/);
  const bareOrdinal = asked.match(/\b(\d{1,2})(?:st|nd|rd|th)\s+move\b/);
  const value = Number(moveMatch?.[1] || bareOrdinal?.[1] || 0);
  return value >= 1 && value <= maxMove ? value : null;
}

function formatMaterial(value) {
  if (value === 0) return "even";
  return value > 0 ? `+${value}` : String(value);
}

function handleSquare(index) {
  if (game.over || game.turn !== "w") return;
  const piece = game.board[index];
  if (game.selected !== null) {
    const chosen = game.legalTargets.find((move) => move.to === index);
    if (chosen) {
      const before = cloneState(game);
      const record = applyMove(game, chosen);
      record.analysis = analyzePlayerMove(record, before, cloneState(game));
      game.selected = null;
      game.legalTargets = [];
      teach("Your move", explainPlayerMove(record));
      render();
      if (!finishIfGameOver()) window.setTimeout(opponentTurn, 240);
      return;
    }
  }
  if (piece?.c === "w") {
    game.selected = index;
    game.legalTargets = legalMoves(game, "w").filter((move) => move.from === index);
  } else {
    game.selected = null;
    game.legalTargets = [];
  }
  render();
}

function explainPlayerMove(record) {
  const pressure = matePressure(game).percent;
  if (record.captured) return `Good: forcing moves matter. Your mate-pressure reading is ${pressure}%, so check whether the capture also helped king safety.`;
  if (record.castle) return "Excellent practical move. Castling usually lowers danger because the king gains rook protection and clearer escape squares.";
  return `After ${coord(record.from)}-${coord(record.to)}, your mate-pressure reading is ${pressure}%. Use that meter as a coach for king safety.`;
}

function opponentTurn() {
  if (game.over || game.turn !== "b") return;
  const choice = chooseOpponentMove();
  applyMove(game, choice.move);
  teach(choice.title, choice.body);
  render();
  finishIfGameOver();
}

function finishIfGameOver() {
  if (legalMoves(game, game.turn).length) return false;
  game.over = true;
  const checked = inCheck(game, game.turn);
  if (checked && game.turn === "b") {
    game.stats.wins += 1;
    game.stats.level = Math.min(10, game.stats.level + 1);
    game.stats.games += 1;
    game.finalAnalysis = buildGameAnalysis("You won by checkmate.");
    teach("Checkmate delivered", "You won. The analysis panel now breaks down every move you made.");
  } else if (checked) {
    game.stats.losses += 1;
    game.stats.games += 1;
    game.finalAnalysis = buildGameAnalysis("Black checkmated your king.");
    teach("Checkmate pattern", "The opponent finished the attack. The analysis panel shows where the pressure started to rise.");
  } else {
    game.stats.games += 1;
    game.finalAnalysis = buildGameAnalysis("The game ended in stalemate.");
    teach("Stalemate", "No legal moves, no check. The analysis panel shows how the draw formed.");
  }
  saveStats();
  render();
  return true;
}

function hint() {
  if (game.over || game.turn !== "w") return;
  let best = null;
  let bestScore = Infinity;
  for (const move of legalMoves(game, "w")) {
    const next = cloneState(game);
    applyMove(next, move, false);
    const score = matePressure(next).percent * 10 + evaluate(next);
    if (score < bestScore) { bestScore = score; best = move; }
  }
  if (!best) return;
  game.selected = best.from;
  game.legalTargets = [best];
  teach("Hint", `Try ${coord(best.from)}-${coord(best.to)}. It is chosen to reduce danger while keeping the position playable.`);
  render();
}

function teach(title, body) {
  els.lessonTitle.textContent = title;
  els.lessonBody.textContent = body;
}

function askAnalysisQuestion(event) {
  event.preventDefault();
  const question = els.analysisQuestion.value.trim();
  if (!question) return;
  game.analysisChat.push({ question, answer: answerPerformanceQuestion(question) });
  els.analysisQuestion.value = "";
  renderAnalysisChat();
}

function render() {
  els.board.innerHTML = "";
  const whiteKing = kingIndex(game, "w");
  const blackKing = kingIndex(game, "b");
  for (let i = 0; i < 64; i += 1) {
    const square = document.createElement("button");
    const piece = game.board[i];
    const legal = game.legalTargets.find((move) => move.to === i);
    square.className = `square ${(row(i) + col(i)) % 2 ? "dark" : "light"}`;
    if (game.selected === i) square.classList.add("is-selected");
    if (legal) square.classList.add(legal.capture || piece ? "is-capture" : "is-legal");
    if ((i === whiteKing && inCheck(game, "w")) || (i === blackKing && inCheck(game, "b"))) square.classList.add("is-check");
    square.setAttribute("aria-label", `${coord(i)} ${piece ? `${piece.c === "w" ? "white" : "black"} ${piece.t}` : "empty"}`);
    square.addEventListener("click", () => handleSquare(i));
    if (piece) {
      const span = document.createElement("span");
      span.className = `piece ${piece.c === "w" ? "white" : "black"}`;
      span.textContent = glyphs[piece.c][piece.t];
      square.append(span);
    }
    if (row(i) === 7 || col(i) === 0) {
      const label = document.createElement("span");
      label.className = "coord";
      label.textContent = `${col(i) === 0 ? 8 - row(i) : ""}${row(i) === 7 ? files[col(i)] : ""}`;
      square.append(label);
    }
    els.board.append(square);
  }

  const pressure = matePressure(game);
  els.matePercent.textContent = `${pressure.percent}%`;
  els.dangerFill.style.width = `${pressure.percent}%`;
  els.dangerText.textContent = pressure.text;
  els.meterPanel.classList.toggle("is-tense", pressure.percent > 42 && pressure.percent <= 70);
  els.meterPanel.classList.toggle("is-danger", pressure.percent > 70);
  els.levelNumber.textContent = game.stats.level;
  els.levelProgress.style.width = `${game.stats.level * 10}%`;
  els.levelText.textContent = levelDescription(game.stats.level);
  els.statusLine.textContent = statusText();
  els.gameTitle.textContent = game.book.name;
  els.scoreText.textContent = `${game.stats.wins} wins, ${game.stats.losses} losses. Wins raise the level; each level searches harder.`;
  els.capturedPieces.textContent = game.captured.length ? game.captured.map((piece) => glyphs[piece.c][piece.t]).join(" ") : "No captures yet";
  renderMoves();
  renderAnalysis();
}

function renderMoves() {
  const pairs = [];
  for (let i = 0; i < game.history.length; i += 2) {
    const white = game.history[i]?.notation || "";
    const black = game.history[i + 1]?.notation || "";
    pairs.push(`<li><strong>${white}</strong>${black ? ` ${black}` : ""}</li>`);
  }
  els.moveList.innerHTML = pairs.join("");
}

function renderAnalysis() {
  els.analysisPanel.hidden = !game.finalAnalysis;
  if (!game.finalAnalysis) {
    els.analysisSummary.textContent = "";
    els.analysisList.innerHTML = "";
    els.analysisChat.innerHTML = "";
    return;
  }
  els.analysisSummary.textContent = game.finalAnalysis.summary;
  els.analysisList.innerHTML = game.finalAnalysis.moves.map((item) => {
    const material = item.materialDelta === 0 ? "material even" : `${item.materialDelta > 0 ? "+" : ""}${item.materialDelta} material`;
    return `<li class="${item.rating}"><strong>${item.number}. ${item.move}</strong><span>${item.text}. Mate pressure ${item.pressureBefore}% to ${item.pressureAfter}%; ${material}.</span></li>`;
  }).join("");
  renderAnalysisChat();
}

function renderAnalysisChat() {
  els.analysisChat.innerHTML = "";
  for (const item of game.analysisChat) {
    const entry = document.createElement("div");
    entry.className = "analysis-chat-entry";
    const question = document.createElement("p");
    question.className = "question";
    question.textContent = item.question;
    const answer = document.createElement("p");
    answer.className = "answer";
    answer.textContent = item.answer;
    entry.append(question, answer);
    els.analysisChat.append(entry);
  }
}

function levelDescription(level) {
  if (level >= 8) return "Master mode: deeper search, sharper tactics, and frequent famous-line choices.";
  if (level >= 5) return "Club mode: the opponent calculates tactics and follows famous structures more often.";
  if (level >= 3) return "Training mode: the opponent sees short combinations and punishes loose pieces.";
  return "Beginner mode: the opponent favors famous opening ideas and light tactics.";
}

function statusText() {
  if (game.over) return "Game over";
  return `${game.turn === "w" ? "White" : "Black"} to move${inCheck(game, game.turn) ? " in check" : ""}`;
}

els.newGameButton.addEventListener("click", newGame);
els.hintButton.addEventListener("click", hint);
els.analysisQuestionForm.addEventListener("submit", askAnalysisQuestion);

newGame();
