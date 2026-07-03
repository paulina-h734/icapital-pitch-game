// ---------------------------------------------------------------------------
// Randomized "diligence clue" math problems for the caged-alt task. Simple,
// single-operation, integer answers — quick to solve on stage, different every
// run. Uses × and − glyphs for display; answers are plain integers.
// ---------------------------------------------------------------------------

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeClue() {
  const op = rand(0, 2);
  if (op === 0) {
    const a = rand(2, 12);
    const b = rand(2, 12);
    return { text: `${a} + ${b}`, answer: a + b };
  }
  if (op === 1) {
    const a = rand(6, 15);
    const b = rand(1, a - 1); // keep the result positive
    return { text: `${a} − ${b}`, answer: a - b };
  }
  const a = rand(2, 9);
  const b = rand(2, 9);
  return { text: `${a} × ${b}`, answer: a * b };
}

export function generateClues(n) {
  const clues = [];
  for (let i = 0; i < n; i++) clues.push(makeClue());
  return clues;
}
