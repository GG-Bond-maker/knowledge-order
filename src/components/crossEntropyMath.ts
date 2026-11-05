export const CROSS_ENTROPY_TOKENS = ['猫', '狗', '鱼'] as const;
export const CROSS_ENTROPY_TARGET = 0;

export interface CrossEntropyResult {
  probabilities: number[];
  targetProbability: number;
  loss: number;
  perplexity: number;
  gradients: number[];
  probabilitySum: number;
  uniformLoss: number;
}

export function computeCrossEntropy(logits: number[], targetIndex = CROSS_ENTROPY_TARGET): CrossEntropyResult {
  const max = Math.max(...logits);
  const exponentials = logits.map((value) => Math.exp(value - max));
  const denominator = exponentials.reduce((sum, value) => sum + value, 0);
  const probabilities = exponentials.map((value) => value / denominator);
  const targetProbability = probabilities[targetIndex];
  const loss = -Math.log(Math.max(targetProbability, Number.MIN_VALUE));

  return {
    probabilities,
    targetProbability,
    loss,
    perplexity: Math.exp(loss),
    gradients: probabilities.map((probability, index) => probability - (index === targetIndex ? 1 : 0)),
    probabilitySum: probabilities.reduce((sum, value) => sum + value, 0),
    uniformLoss: Math.log(logits.length),
  };
}
