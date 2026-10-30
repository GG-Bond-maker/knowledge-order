import { useState, type ReactNode } from 'react';
import type { GuppyVisualKind } from '../../content/projects/guppylm';

function Figure({
  testId,
  title,
  desc,
  children,
}: {
  testId: string;
  title: string;
  desc: string;
  children: ReactNode;
}) {
  return (
    <figure className="guppy-figure" data-testid={testId}>
      <svg viewBox="0 0 920 300" role="img" aria-labelledby={`${testId}-title ${testId}-desc`}>
        <title id={`${testId}-title`}>{title}</title>
        <desc id={`${testId}-desc`}>{desc}</desc>
        {children}
      </svg>
      <figcaption>{desc}</figcaption>
    </figure>
  );
}

function PipelineVisual() {
  const steps = ['对话数据', 'BPE token', 'Transformer', '训练 / 生成', 'ONNX', '浏览器'];
  return (
    <Figure
      testId="guppy-pipeline"
      title="GuppyLM 端到端数据流"
      desc="从合成对话开始，经过分词、Transformer、训练、推理和 ONNX 导出，最后在浏览器中运行。"
    >
      <rect x="20" y="28" width="880" height="220" rx="8" fill="#f7f4ea" stroke="#17313a" strokeOpacity="0.16" />
      {steps.map((step, index) => {
        const x = 42 + index * 145;
        return (
          <g key={step}>
            <rect
              x={x}
              y="94"
              width="116"
              height="72"
              rx="6"
              fill={index === 3 ? '#fce9e3' : '#ffffff'}
              stroke={index === 3 ? '#d95f45' : '#9aada8'}
            />
            <text x={x + 58} y="124" textAnchor="middle" fill="#17313a" fontSize="14" fontWeight="700">
              {step}
            </text>
            <text x={x + 58} y="146" textAnchor="middle" fill="#657973" fontSize="11">
              {index === 0
                ? '57k + 3k'
                : index === 1
                  ? '4,096 维'
                  : index === 2
                    ? '6 × Block'
                    : index === 3
                      ? 'next token'
                      : index === 4
                        ? 'QUInt8'
                        : 'WASM'}
            </text>
            {index < steps.length - 1 && (
              <path
                d={`M ${x + 116} 130 H ${x + 141}`}
                stroke="#657973"
                strokeWidth="1.5"
                markerEnd="url(#pipeline-arrow)"
              />
            )}
          </g>
        );
      })}
      <defs>
        <marker id="pipeline-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0 0 L8 4 L0 8 Z" fill="#657973" />
        </marker>
      </defs>
      <text x="460" y="218" textAnchor="middle" fill="#657973" fontSize="12">
        每一站都改变数据的表示：文本 → ID → 隐藏状态 → logits → 文件 → 浏览器结果
      </text>
    </Figure>
  );
}

function DataLeakVisual() {
  return (
    <Figure
      testId="guppy-data-leak"
      title="测试集与训练集精确重叠"
      desc="3000 条测试样本中有 2320 条与训练集完全重叠，占 77.3%；重叠样本的困惑度低于非重叠样本。"
    >
      <text x="40" y="46" fill="#17313a" fontSize="18" fontWeight="700">
        3,000 条 test 中，2,320 条能直接回到 train
      </text>
      <rect x="40" y="78" width="840" height="44" rx="4" fill="#e7ece9" />
      <rect x="40" y="78" width="650" height="44" rx="4" fill="#d95f45" />
      <text x="58" y="106" fill="#ffffff" fontSize="14" fontWeight="700">
        77.3% 精确重叠
      </text>
      <text x="706" y="106" fill="#17313a" fontSize="13">
        22.7% 非重叠
      </text>
      <g transform="translate(40 154)">
        {[
          ['全部 test', 'PPL 1.5023', 0.86],
          ['重叠样本', 'PPL 1.4334', 0.72],
          ['非重叠样本', 'PPL 1.7145', 1],
        ].map(([label, value, width], index) => (
          <g key={String(label)} transform={`translate(0 ${index * 38})`}>
            <text x="0" y="14" fill="#17313a" fontSize="12">
              {label}
            </text>
            <rect
              x="116"
              y="3"
              width={Number(width) * 400}
              height="16"
              rx="3"
              fill={index === 2 ? '#0f766e' : '#7f9993'}
            />
            <text x={116 + Number(width) * 400 + 10} y="16" fill="#657973" fontSize="12">
              {value}
            </text>
          </g>
        ))}
      </g>
      <text x="40" y="284" fill="#657973" fontSize="12">
        均匀猜测基线 ln(4096) = 8.3178；低 PPL 不能单独证明泛化。
      </text>
    </Figure>
  );
}

function TokenizerVisual() {
  const presets = [
    {
      label: 'hi guppy',
      text: 'hi guppy',
      tokens: ['hi', 'Ġguppy'],
      ids: [779, 278],
      note: '前导空格被编码成 Ġ，所以 guppy 在词表里是 Ġguppy。',
    },
    {
      label: '完整 ChatML',
      text: '<|im_start|>user\\nhi guppy<|im_end|>\\n<|im_start|>assistant\\n',
      tokens: ['1', '88', '64', '779', '278', '2', '64', '1', '89', '64'],
      ids: [1, 88, 64, 779, 278, 2, 64, 1, 89, 64],
      note: '完整 prompt 只有 10 个 token；角色、换行和边界都变成了 ID。',
    },
    {
      label: '特殊 token',
      text: '<|im_start|>  <|im_end|>  <pad>',
      tokens: ['<|im_start|>', '<|im_end|>', '<pad>'],
      ids: [1, 2, 0],
      note: '特殊 token 不是普通文本，它们是控制消息开始、结束和补齐的开关。',
    },
  ];
  const [selected, setSelected] = useState(0);
  const preset = presets[selected];

  return (
    <div data-testid="guppy-tokenizer-diagram">
      <Figure
        testId="guppy-tokenizer-svg"
        title="文本经过 BPE 变成 token ID"
        desc="ByteLevel BPE 把选中的文本切成 token，并映射为整数 ID；实际词表为 2418。"
      >
        <text x="42" y="48" fill="#657973" fontSize="12">
          原始文本
        </text>
        <text x="42" y="84" fill="#17313a" fontSize={selected === 1 ? '16' : '26'} fontWeight="700">
          {preset.text.length > 48 ? `${preset.text.slice(0, 48)}…` : preset.text}
        </text>
        <path d="M 390 76 H 454" stroke="#657973" strokeWidth="1.5" markerEnd="url(#tok-arrow)" />
        <text x="422" y="60" textAnchor="middle" fill="#657973" fontSize="11">
          ByteLevel BPE
        </text>
        <defs>
          <marker id="tok-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0 0 L8 4 L0 8 Z" fill="#657973" />
          </marker>
        </defs>
        <g transform="translate(470 48)">
          <text x="0" y="0" fill="#657973" fontSize="12">
            tokens
          </text>
          {preset.tokens.slice(0, 5).map((token, index) => (
            <g key={`${token}-${index}`} transform={`translate(${index * 82} 16)`}>
              <rect width="72" height="42" rx="5" fill="#e6f2ef" stroke="#0f766e" />
              <text x="36" y="27" textAnchor="middle" fill="#17313a" fontSize="12" fontWeight="700">
                {token}
              </text>
            </g>
          ))}
        </g>
        <g transform="translate(470 140)">
          <text x="0" y="0" fill="#657973" fontSize="12">
            IDs
          </text>
          {preset.ids.slice(0, 8).map((id, index) => (
            <g key={`${id}-${index}`} transform={`translate(${index * 52} 16)`}>
              <rect width="44" height="36" rx="4" fill="#f7f4ea" stroke="#9aada8" />
              <text x="22" y="24" textAnchor="middle" fill="#17313a" fontSize="14" fontWeight="700">
                {id}
              </text>
            </g>
          ))}
        </g>
        <text x="42" y="222" fill="#657973" fontSize="13">
          配置词表 4,096 · 实际词表 2,418 · merges 2,352
        </text>
        <text x="42" y="248" fill="#657973" fontSize="13">
          特殊 token：pad=0 · im_start=1 · im_end=2
        </text>
        <text x="42" y="274" fill="#0f766e" fontSize="12">
          {preset.note}
        </text>
      </Figure>
      <div className="guppy-preset-row" aria-label="分词示例">
        {presets.map((item, index) => (
          <button
            type="button"
            key={item.label}
            className={index === selected ? 'active' : ''}
            aria-pressed={index === selected}
            onClick={() => setSelected(index)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TransformerVisual() {
  return (
    <Figure
      testId="guppy-transformer-diagram"
      title="GuppyLM Transformer Block 结构"
      desc="六个 Block 堆叠；每个 Block 依次经过 LayerNorm、多头注意力、残差、LayerNorm、前馈网络和残差。"
    >
      <text x="38" y="44" fill="#17313a" fontSize="16" fontWeight="700">
        输入 token + 位置
      </text>
      <g transform="translate(38 62)">
        {['LayerNorm', '多头注意力', '+ 残差', 'LayerNorm', 'FFN 384→768→384', '+ 残差'].map((label, index) => (
          <g key={label} transform={`translate(0 ${index * 34})`}>
            <rect
              width="310"
              height="25"
              rx="4"
              fill={index === 1 || index === 4 ? '#e6f2ef' : '#ffffff'}
              stroke={index === 1 || index === 4 ? '#0f766e' : '#b8c6c1'}
            />
            <text x="155" y="17" textAnchor="middle" fill="#17313a" fontSize="12">
              {label}
            </text>
          </g>
        ))}
      </g>
      <path d="M 370 130 H 462" stroke="#d95f45" strokeWidth="1.5" markerEnd="url(#tr-arrow)" />
      <defs>
        <marker id="tr-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0 0 L8 4 L0 8 Z" fill="#d95f45" />
        </marker>
      </defs>
      <text x="416" y="115" textAnchor="middle" fill="#d95f45" fontSize="11">
        重复 6 次
      </text>
      <g transform="translate(480 62)">
        {Array.from({ length: 6 }, (_, index) => (
          <g key={index} transform={`translate(0 ${index * 28})`}>
            <rect
              width="330"
              height="20"
              rx="3"
              fill={index === 5 ? '#fce9e3' : '#f7f4ea'}
              stroke={index === 5 ? '#d95f45' : '#b8c6c1'}
            />
            <text x="16" y="14" fill="#17313a" fontSize="11">
              Block {index + 1}
            </text>
            <text x="306" y="14" textAnchor="end" fill="#657973" fontSize="10">
              384 → 384
            </text>
          </g>
        ))}
      </g>
      <text x="480" y="260" fill="#657973" fontSize="12">
        每层约 1,183,872 参数 · 六层 7,103,232
      </text>
      <text x="480" y="282" fill="#657973" fontSize="12">
        输出：最后位置 → 4,096 个 logits
      </text>
    </Figure>
  );
}

function ScheduleVisual() {
  const samples = [0, 100, 200, 1000, 2500, 5000, 7500, 9999];
  const learningRate = (step: number) => {
    if (step < 200) return 0.0003 * (step / 200);
    const progress = (step - 200) / 9800;
    return 0.00003 + (0.0003 - 0.00003) * 0.5 * (1 + Math.cos(Math.PI * progress));
  };
  const points = samples.map((step) => {
    const x = 76 + (step / 9999) * 788;
    const y = 260 - (learningRate(step) / 0.0003) * 180;
    return { step, x, y };
  });
  const line = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');

  return (
    <Figure
      testId="guppy-schedule-figure"
      title="GuppyLM 学习率调度"
      desc="前 200 步线性 warmup 到 0.0003，随后余弦衰减到 0.00003。"
    >
      <text x="42" y="42" fill="#17313a" fontSize="16" fontWeight="700">
        Warmup 200 步 → 余弦衰减到 3e-5
      </text>
      {[80, 140, 200, 260].map((y) => (
        <line key={y} x1="76" x2="864" y1={y} y2={y} stroke="#dbe3df" strokeWidth="1" />
      ))}
      <line x1="76" x2="864" y1="260" y2="260" stroke="#9aada8" strokeWidth="1" />
      <polyline points={line} fill="none" stroke="#d95f45" strokeWidth="2.5" />
      {points.map((point) => (
        <g key={point.step}>
          <circle cx={point.x} cy={point.y} r="4" fill="#d95f45" />
          <text x={point.x} y="284" textAnchor="middle" fill="#657973" fontSize="10">
            {point.step === 1000 ? '1k' : point.step === 9999 ? '9,999' : point.step}
          </text>
        </g>
      ))}
      <text x="82" y="72" fill="#657973" fontSize="11">
        3e-4
      </text>
      <text x="82" y="252" fill="#657973" fontSize="11">
        0
      </text>
    </Figure>
  );
}

function SamplingVisual() {
  const rows = [
    [
      'hi guppy',
      "oh hello. i didn't see you there. my eyes are on the sides.",
      'oh hello. you look big today. you always look big. i blew some bubbles earlier.',
      'oh hello. you look big today. you always look big. i blew some bubbles earlier.',
    ],
    [
      'are you hungry',
      'yes. always yes. i am always ready for food.',
      'yes. always yes. i am always ready for food.',
      "is it food time. please say yes. i've been dreamed than ready for this moment.",
    ],
    [
      'meaning of life',
      "i don't think about purpose. i think about food.",
      "i don't think about purpose. i think about food.",
      "i don't think about purpose. i think about food.",
    ],
  ];
  return (
    <div className="guppy-sampling-wrap" data-testid="guppy-sampling-matrix">
      <div className="guppy-sampling-note">
        <b>PyTorch CPU · 每个参数组重置 seed 42 · 最多 32 token</b>
        <span>温度不是单调旋钮：在这组窄数据上，不同参数也可能落到同一条高概率路径。</span>
      </div>
      <div className="guppy-table-scroll">
        <table className="guppy-sampling-table">
          <caption>Prompt × 采样参数的真实输出</caption>
          <thead>
            <tr>
              <th scope="col">Prompt</th>
              <th scope="col">T=0.3 · k=10</th>
              <th scope="col">T=0.7 · k=50</th>
              <th scope="col">T=1.2 · k=200</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[0]}>
                {row.map((cell, index) =>
                  index === 0 ? (
                    <th scope="row" key={cell}>
                      {cell}
                    </th>
                  ) : (
                    <td key={cell}>{cell}</td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DeploymentVisual() {
  return (
    <Figure
      testId="guppy-deployment-chain"
      title="GuppyLM ONNX 浏览器部署链"
      desc="PyTorch 模型导出为 ONNX 图，再动态量化为 QUInt8，最后由 ONNX Runtime Web 的 WASM 执行。"
    >
      {[
        ['PyTorch', '训练框架', '动态图 + autograd'],
        ['ONNX', 'opset 17', '跨框架计算图'],
        ['QUInt8', '约 10 MB', '动态量化权重'],
        ['WASM', '浏览器', '本地推理'],
      ].map(([title, sub, detail], index) => {
        const x = 48 + index * 220;
        return (
          <g key={title}>
            <rect
              x={x}
              y="82"
              width="164"
              height="102"
              rx="6"
              fill={index === 2 ? '#fce9e3' : '#ffffff'}
              stroke={index === 2 ? '#d95f45' : '#9aada8'}
            />
            <text x={x + 82} y="115" textAnchor="middle" fill="#17313a" fontSize="18" fontWeight="700">
              {title}
            </text>
            <text x={x + 82} y="140" textAnchor="middle" fill="#0f766e" fontSize="12">
              {sub}
            </text>
            <text x={x + 82} y="162" textAnchor="middle" fill="#657973" fontSize="11">
              {detail}
            </text>
            {index < 3 && (
              <path
                d={`M ${x + 164} 133 H ${x + 204}`}
                stroke="#657973"
                strokeWidth="1.5"
                markerEnd="url(#dep-arrow)"
              />
            )}
          </g>
        );
      })}
      <defs>
        <marker id="dep-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0 0 L8 4 L0 8 Z" fill="#657973" />
        </marker>
      </defs>
      <text x="460" y="232" textAnchor="middle" fill="#657973" fontSize="12">
        model.onnx · 10,469,869 bytes · SHA256 96DD79D2…
      </text>
      <text x="460" y="258" textAnchor="middle" fill="#657973" fontSize="12">
        量化不是无损；部署验证要同时看加载、误差和生成结果
      </text>
    </Figure>
  );
}

function ExperimentVisual() {
  const configs = [
    ['baseline', 8.73, '6 层 / 宽 384 / 序列 128'],
    ['3 层', 5.17, 'n_layers=3'],
    ['8 层', 11.09, 'n_layers=8'],
    ['宽 256', 4.24, 'd_model=256 / FFN=512 / 4 heads'],
    ['序列 64', 8.7, 'max_seq_len=64'],
    ['序列 256', 8.78, 'max_seq_len=256'],
  ] as const;
  const [selected, setSelected] = useState(0);
  const active = configs[selected];
  const max = 12;
  return (
    <div className="guppy-experiment-visual" data-testid="guppy-experiment-panel">
      <div>
        <h3>参数量对照</h3>
        <p>一次只改一个主变量；先算成本，再决定跑不跑。</p>
        {configs.map(([label, value], index) => (
          <div className="guppy-bar-row" key={label}>
            <button
              type="button"
              className={index === selected ? 'active' : ''}
              aria-pressed={index === selected}
              onClick={() => setSelected(index)}
            >
              {label}
            </button>
            <div>
              <i style={{ width: `${(value / max) * 100}%` }} />
            </div>
            <b>{value.toFixed(2)}M</b>
          </div>
        ))}
      </div>
      <div className="guppy-experiment-card">
        <span>实验卡模板</span>
        <strong>{active[0]}</strong>
        <p>{active[2]}</p>
        <ol>
          <li>假设：改这个变量会影响什么？</li>
          <li>控制量：哪些配置保持不变？</li>
          <li>指标：loss、PPL、耗时还是生成质量？</li>
          <li>证据：命令、seed、日志和局限。</li>
        </ol>
      </div>
    </div>
  );
}

export function GuppyVisual({ kind }: { kind: GuppyVisualKind }) {
  switch (kind) {
    case 'pipeline':
      return <PipelineVisual />;
    case 'data-leak':
      return <DataLeakVisual />;
    case 'tokenizer':
      return <TokenizerVisual />;
    case 'transformer':
      return <TransformerVisual />;
    case 'schedule':
      return <ScheduleVisual />;
    case 'sampling':
      return <SamplingVisual />;
    case 'deployment':
      return <DeploymentVisual />;
    case 'experiment':
      return <ExperimentVisual />;
  }
}
