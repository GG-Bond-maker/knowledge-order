/**
 * 缩放点积注意力的真实数值链。
 *
 * 输入、投影权重均固定，便于课程中逐位核对。这里不依赖 DOM，
 * 所有派生矩阵都从同一组 X / W 重新计算，避免“演示数字”和
 * 公式各说各话。
 */

export type Matrix = number[][];
export type AttentionHead = 0 | 1;

export const ATTENTION_TOKENS = ['我', '爱', '学', '习'] as const;
export const ATTENTION_CONFIG = {
  batch: 1,
  sequenceLength: 4,
  modelDim: 4,
  heads: 2,
  headDim: 2,
} as const;

export const MASKED_SCORE = -1e9;

const INPUT_X: Matrix = [
  [0.8, -0.2, 0.4, 0.1],
  [0.2, 0.6, -0.1, 0.3],
  [-0.3, 0.4, 0.7, -0.2],
  [0.5, -0.4, 0.2, 0.9],
];

const PROJECTION_SCALE = 4;

const HEAD_WEIGHTS: Record<AttentionHead, { q: Matrix; k: Matrix; v: Matrix }> = {
  0: {
    q: [
      [0.6, -0.2],
      [0.1, 0.5],
      [0.4, 0.3],
      [-0.3, 0.2],
    ],
    k: [
      [0.2, 0.5],
      [0.4, -0.1],
      [-0.2, 0.6],
      [0.3, 0.1],
    ],
    v: [
      [0.7, 0.1],
      [-0.2, 0.5],
      [0.3, -0.4],
      [0.1, 0.6],
    ],
  },
  1: {
    q: [
      [-0.1, 0.4],
      [0.6, 0.2],
      [0.2, -0.5],
      [0.5, 0.1],
    ],
    k: [
      [0.3, -0.4],
      [0.1, 0.6],
      [0.5, 0.2],
      [-0.2, 0.3],
    ],
    v: [
      [0.2, 0.6],
      [0.5, -0.2],
      [-0.3, 0.4],
      [0.7, 0.1],
    ],
  },
};

function matmul(left: Matrix, right: Matrix): Matrix {
  return left.map((row) =>
    right[0].map((_, column) => row.reduce((sum, value, index) => sum + value * right[index][column], 0)),
  );
}

function dot(left: number[], right: number[]): number {
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

function stableSoftmax(row: number[]): number[] {
  const max = Math.max(...row);
  const exponentials = row.map((value) => Math.exp(value - max));
  const denominator = exponentials.reduce((sum, value) => sum + value, 0);
  return exponentials.map((value) => value / denominator);
}

function standardDeviation(values: number[]): number {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function scaleMatrix(matrix: Matrix): Matrix {
  return matrix.map((row) => row.map((value) => value * PROJECTION_SCALE));
}

export interface AttentionTrace {
  head: AttentionHead;
  headDim: number;
  tokens: readonly string[];
  input: Matrix;
  qProjection: Matrix;
  kProjection: Matrix;
  vProjection: Matrix;
  q: Matrix;
  k: Matrix;
  v: Matrix;
  rawScores: Matrix;
  scaledScores: Matrix;
  maskedScores: Matrix;
  weights: Matrix;
  output: Matrix;
  rowSums: number[];
  futureWeight: number;
  visibleCount: number;
  maskedCount: number;
  rawStd: number;
  scaledStd: number;
  maxRaw: { row: number; column: number; value: number };
  maxRowSumError: number;
}

export function buildAttentionTrace(head: AttentionHead): AttentionTrace {
  const weights = HEAD_WEIGHTS[head];
  const projectionQ = scaleMatrix(weights.q);
  const projectionK = scaleMatrix(weights.k);
  const projectionV = weights.v;
  const q = matmul(INPUT_X, projectionQ);
  const k = matmul(INPUT_X, projectionK);
  const v = matmul(INPUT_X, projectionV);
  const rawScores = q.map((query) => k.map((key) => dot(query, key)));
  const scale = Math.sqrt(ATTENTION_CONFIG.headDim);
  const scaledScores = rawScores.map((row) => row.map((value) => value / scale));
  const maskedScores = scaledScores.map((row, rowIndex) =>
    row.map((value, columnIndex) => (columnIndex > rowIndex ? MASKED_SCORE : value)),
  );
  const attentionWeights = maskedScores.map(stableSoftmax);
  const output = matmul(attentionWeights, v);

  let maxRaw = { row: 0, column: 0, value: rawScores[0][0] };
  let visibleCount = 0;
  let maskedCount = 0;
  let futureWeight = 0;

  rawScores.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      if (value > maxRaw.value) {
        maxRaw = { row: rowIndex, column: columnIndex, value };
      }
      if (columnIndex > rowIndex) {
        maskedCount += 1;
        futureWeight += attentionWeights[rowIndex][columnIndex];
      } else {
        visibleCount += 1;
      }
    });
  });

  const rowSums = attentionWeights.map((row) => row.reduce((sum, value) => sum + value, 0));

  return {
    head,
    headDim: ATTENTION_CONFIG.headDim,
    tokens: ATTENTION_TOKENS,
    input: INPUT_X,
    qProjection: projectionQ,
    kProjection: projectionK,
    vProjection: projectionV,
    q,
    k,
    v,
    rawScores,
    scaledScores,
    maskedScores,
    weights: attentionWeights,
    output,
    rowSums,
    futureWeight,
    visibleCount,
    maskedCount,
    rawStd: standardDeviation(rawScores.flat()),
    scaledStd: standardDeviation(scaledScores.flat()),
    maxRaw,
    maxRowSumError: Math.max(...rowSums.map((sum) => Math.abs(sum - 1))),
  };
}
