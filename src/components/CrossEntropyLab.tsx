import { useId, useMemo, useState } from 'react';
import { CROSS_ENTROPY_TARGET, CROSS_ENTROPY_TOKENS, computeCrossEntropy } from './crossEntropyMath';
import './CrossEntropyLab.css';

const DEFAULT_LOGITS = [2, 1, 0.5];

const PRESETS = [
  {
    label: '课程示例',
    logits: [2, 1, 0.5],
    note: '模型较笃定地选中「猫」',
  },
  {
    label: '自信且正确',
    logits: [4, 0, -1],
    note: '提高真实 token 的 logit',
  },
  {
    label: '自信但错误',
    logits: [0.5, 4, -1],
    note: '把最高分给了「狗」',
  },
  {
    label: '接近均匀',
    logits: [0, 0, 0],
    note: '三个候选概率相同',
  },
] as const;

function qualityFor(loss: number, uniformLoss: number) {
  if (loss < 0.5) {
    return {
      tone: 'good',
      label: '预测笃定且正确',
      description: '真实 token 的概率很高，交叉熵很小。',
    };
  }
  if (loss < uniformLoss) {
    return {
      tone: 'ok',
      label: '优于均匀猜测',
      description: '模型给真实 token 分配了高于三分之一的概率。',
    };
  }
  if (loss < uniformLoss + 0.8) {
    return {
      tone: 'warn',
      label: '接近均匀猜测',
      description: '三个候选几乎一样可能，模型还没有形成偏好。',
    };
  }
  return {
    tone: 'bad',
    label: '比均匀猜测更差',
    description: '最高分落在错误 token 上，越自信，惩罚越重。',
  };
}

export function CrossEntropyLab() {
  const [logits, setLogits] = useState<number[]>(DEFAULT_LOGITS);
  const idPrefix = useId();
  const result = useMemo(() => computeCrossEntropy(logits, CROSS_ENTROPY_TARGET), [logits]);
  const quality = qualityFor(result.loss, result.uniformLoss);
  const targetToken = CROSS_ENTROPY_TOKENS[CROSS_ENTROPY_TARGET];

  const updateLogit = (index: number, value: number) => {
    setLogits((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  };

  return (
    <section className="cross-entropy-lab" aria-labelledby="cross-entropy-lab-title">
      <header className="cel-header">
        <div>
          <div className="cel-eyebrow">
            <span aria-hidden="true" />
            交互实验 · 即时计算
          </div>
          <h2 id="cross-entropy-lab-title">拖动 logits，看“自信的错误”如何被罚</h2>
          <p>
            真实下一 token 固定为「{targetToken}」。先预测：把「{targetToken}」的 logit 从 2 调到 4，loss
            会降到多少？再拖动确认。
          </p>
        </div>
        <div className="cel-config">
          <span>3 词词表</span>
          <span>固定目标</span>
          <span className="cel-config-real">真实计算</span>
        </div>
      </header>

      <div className="cel-body">
        <div className="cel-controls">
          <div className="cel-section-head">
            <span>候选 token 的 logits</span>
            <small>拖动滑块</small>
          </div>
          <div className="cel-logit-list">
            {CROSS_ENTROPY_TOKENS.map((token, index) => {
              const inputId = `${idPrefix}-logit-${index}`;
              const isTarget = index === CROSS_ENTROPY_TARGET;
              return (
                <div className={`cel-logit-row${isTarget ? ' cel-logit-row--target' : ''}`} key={token}>
                  <label htmlFor={inputId}>
                    <span>{token}</span>
                    {isTarget && <small>真实下一词</small>}
                  </label>
                  <input
                    id={inputId}
                    type="range"
                    min="-4"
                    max="6"
                    step="0.1"
                    value={logits[index]}
                    onChange={(event) => updateLogit(index, Number(event.target.value))}
                    aria-label={`${token} 的 logit`}
                  />
                  <output htmlFor={inputId}>{logits[index].toFixed(1)}</output>
                </div>
              );
            })}
          </div>

          <div className="cel-presets" aria-label="快速预设">
            {PRESETS.map((preset) => (
              <button
                type="button"
                key={preset.label}
                onClick={() => setLogits([...preset.logits])}
                title={preset.note}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="cel-readout">
          <div className="cel-section-head">
            <span>softmax 后的概率</span>
            <small>每行是 p(token)</small>
          </div>
          <div className="cel-prob-list">
            {CROSS_ENTROPY_TOKENS.map((token, index) => {
              const probability = result.probabilities[index];
              const isTarget = index === CROSS_ENTROPY_TARGET;
              return (
                <div className={`cel-prob-row${isTarget ? ' cel-prob-row--target' : ''}`} key={token}>
                  <div className="cel-prob-label">
                    <span>{token}</span>
                    <b>{probability.toFixed(4)}</b>
                  </div>
                  <div
                    className="cel-prob-track"
                    role="img"
                    aria-label={`${token} 的概率为 ${(probability * 100).toFixed(1)}%`}
                  >
                    <span style={{ width: `${probability * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className={`cel-score cel-score--${quality.tone}`}>
            <div className="cel-score-main">
              <span>交叉熵损失</span>
              <strong>{result.loss.toFixed(3)}</strong>
            </div>
            <div className="cel-score-ppl">
              <span>PPL</span>
              <b>{result.perplexity.toFixed(2)}</b>
            </div>
            <div className="cel-score-copy">
              <b>{quality.label}</b>
              <p>{quality.description}</p>
            </div>
          </div>

          <div className="cel-baseline">
            <span>均匀猜测基线</span>
            <code>loss = ln 3 ≈ {result.uniformLoss.toFixed(3)} · PPL = 3.00</code>
          </div>
        </div>
      </div>

      <div className="cel-checks">
        <div className="cel-checks-title">同时核对三件事</div>
        <div className="cel-check-grid">
          <div>
            <span>概率归一</span>
            <b>Σp = {result.probabilitySum.toFixed(6)}</b>
          </div>
          <div>
            <span>损失定义</span>
            <b>−ln p(猫) = {result.loss.toFixed(3)}</b>
          </div>
          <div>
            <span>困惑度换算</span>
            <b>
              e^{result.loss.toFixed(3)} = {result.perplexity.toFixed(2)}
            </b>
          </div>
        </div>
        <div className="cel-gradients">
          <span>反向传播起点 ∂L/∂z = p − onehot</span>
          <div>
            {CROSS_ENTROPY_TOKENS.map((token, index) => (
              <code key={token} className={index === CROSS_ENTROPY_TARGET ? 'target' : undefined}>
                {token} {result.gradients[index] >= 0 ? '+' : ''}
                {result.gradients[index].toFixed(3)}
              </code>
            ))}
          </div>
        </div>
      </div>

      <footer className="cel-footer">
        <span>固定 logits 与目标 token，无随机数。</span>
        <span>试试把「狗」拖到最高，再观察 loss 与梯度方向。</span>
      </footer>
    </section>
  );
}
