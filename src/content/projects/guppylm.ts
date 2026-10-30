export type GuppyTaskId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type GuppyVisualKind =
  'pipeline' | 'data-leak' | 'tokenizer' | 'transformer' | 'schedule' | 'sampling' | 'deployment' | 'experiment';

export interface GuppyCodeSource {
  path: string;
  url: string;
  code: string;
  note: string;
}

export interface GuppyExperiment {
  title: string;
  command: string;
  result: string;
  observation: string;
}

export interface GuppyQuestion {
  question: string;
  hint: string;
  answer: string;
}

export interface GuppyAcceptanceItem {
  id: string;
  label: string;
  evidence: string;
}

export interface GuppyTask {
  id: GuppyTaskId;
  slug: string;
  title: string;
  eyebrow: string;
  summary: string;
  duration: string;
  level: string;
  visual: GuppyVisualKind;
  principles: Array<{ title: string; body: string; takeaway: string }>;
  sources: GuppyCodeSource[];
  experiments: GuppyExperiment[];
  questions: GuppyQuestion[];
  extensions: string[];
  acceptance: GuppyAcceptanceItem[];
}

export const GUPPY_REPO_URL = 'https://github.com/arman-bd/guppylm';
export const GUPPY_DEMO_URL = 'https://arman-bd.github.io/guppylm/';
export const GUPPY_COMMIT = 'a30df3091cff73a259ce581dd8439271084bca40';

const commitUrl = `https://github.com/arman-bd/guppylm/blob/${GUPPY_COMMIT}`;

const source = (path: string, code: string, note: string): GuppyCodeSource => ({
  path,
  url: `${commitUrl}/${path}`,
  code,
  note,
});

export const GUPPY_PROJECT_META = {
  title: 'GuppyLM：把一条小鱼跑通',
  subtitle: '从一段文本，到浏览器里会说话的小模型',
  summary:
    '这不是“背完 Transformer 公式”的复习页，而是一条可以亲手跑通的生产线：数据、分词、模型、训练、生成、ONNX 与浏览器推理。每一步都有源码位置、真实结果和可以勾选的验收证据。',
  courseLabel: '《从零手写大模型》核心综合项目',
  metrics: [
    { value: '8.73M', label: '模型参数', note: '8,726,016 个' },
    { value: '128', label: '上下文长度', note: '一次最多看 128 个 token' },
    { value: '60', label: '对话主题', note: '合成数据覆盖的类别数' },
    { value: '8', label: '验收任务', note: '从数据到部署完整闭环' },
  ],
} as const;

export const GUPPY_TASKS: GuppyTask[] = [
  {
    id: 1,
    slug: 'meet-the-project',
    title: '认识项目',
    eyebrow: '项目全景',
    summary:
      '先不急着看注意力公式。把 GuppyLM 当成一台小型加工厂：原料是对话，机器是 Transformer，产品是一条鱼口吻的回复。',
    duration: '45–60 分钟',
    level: '入门',
    visual: 'pipeline',
    principles: [
      {
        title: '它是一条完整流水线，而不是一个孤立模型',
        body: 'GuppyLM 的价值不只在 8.7M 参数，而在于它把真实工程链路缩到了一个能在一台电脑上理解、运行和修改的尺度。数据先变成 ChatML 文本，再被 BPE 切成 token，随后进入六层 Transformer。训练时模型反复做“猜下一个 token”；推理时它把猜出来的 token 接回输入，继续猜下一个。最后，模型被导出为 ONNX，在浏览器里通过 WASM 运行。',
        takeaway: '先看数据流，再看单个文件；你会更容易知道每一段代码为什么存在。',
      },
      {
        title: '小模型的意义是“可观察”，不是“像大模型一样强”',
        body: 'GuppyLM 只学水族箱里的短句，没有世界知识，也不会推理数学题。它的边界非常窄，所以每个模块的行为更容易观察：词表只有几千项，隐藏维度只有 384，六层 Block 足以让你手动追踪张量形状。把它当成显微镜，而不是许愿池。',
        takeaway: '先问“我想观察什么机制”，再问“这个模型能不能解决所有问题”。',
      },
      {
        title: '目录结构就是一条阅读路线',
        body: '`guppylm/` 放模型、数据、训练和推理；`tools/` 放 ONNX 导出等工程脚本；`docs/` 是浏览器 Demo；两个 notebook 把训练和聊天过程整理成可交互记录。第一次阅读时按 `config → dataset → model → train → inference → export` 走，比从根目录随机点文件更有效。',
        takeaway: '先建立目录地图，再沿着一次数据流读代码。',
      },
    ],
    sources: [
      source(
        'guppylm/config.py',
        String.raw`@dataclass
class GuppyConfig:
    vocab_size: int = 4096
    max_seq_len: int = 128
    d_model: int = 384
    n_layers: int = 6
    n_heads: int = 6
    ffn_hidden: int = 768
    dropout: float = 0.1`,
        '配置不是装饰：它决定 embedding 的大小、位置表能放多长、每层注意力的头数和 FFN 的宽度。',
      ),
      source(
        'README.md',
        String.raw`guppylm/
├── config.py        model + training config
├── model.py         transformer model
├── dataset.py       data loading + tokenization
├── train.py         training loop
├── inference.py     chat interface
├── generate_data.py synthetic conversations
└── prepare_data.py  tokenizer training

tools/
└── export_onnx.py   export + quantize

docs/
├── model.onnx       browser model
└── tokenizer.json   browser tokenizer`,
        '这份目录不是课程大纲，而是运行时依赖关系的地图。先看 config，再看 model 和数据。',
      ),
    ],
    experiments: [
      {
        title: '准备固定提交与运行环境',
        command:
          'python -m pip install torch tokenizers pandas pyarrow numpy onnx onnxruntime\npython scripts/guppylm_verify.py prepare',
        result:
          'source: .tmp-guppylm/guppylm-src\ntrain/test: .tmp-guppylm/data\ncheckpoint: .tmp-guppylm/checkpoints\nonnx/tokenizer: .tmp-guppylm/guppylm-src/docs',
        observation:
          '以下命令统一从课程项目根目录、已激活的 Python 虚拟环境中运行。配套脚本会下载固定提交 `a30df30`、官方数据、PyTorch 权重和浏览器模型，并统一放进被 `.gitignore` 忽略的 `.tmp-guppylm/`；课程站点本身不保存 35 MB 权重或 10 MB ONNX。',
      },
      {
        title: '一次检查前向形状、参数量和权重绑定',
        command: 'python scripts/guppylm_verify.py model',
        result: 'parameters=8,726,016\nforward_shape=(2, 32, 4096)\nweight_tied=True',
        observation:
          '输入是 2 条序列、每条 32 个 token；输出仍保留 32 个位置，但每个位置都给出 4,096 个候选分数。True 说明输入 embedding 和输出投影共用同一张权重，既省参数，也让输入输出共享语义空间。',
      },
    ],
    questions: [
      {
        question: '为什么 GuppyLM 的前向输出不是一条文本，而是形状 (B, T, 4096) 的张量？',
        hint: '想想模型在训练时需要知道每个候选 token 的概率，而不是只给出一个固定答案。',
        answer:
          '因为语言模型在每个位置都要对“下一个 token 可能是谁”给出整个词表上的分数。采样或取 argmax 之后，才会从 4096 个候选里选出一个 ID。',
      },
      {
        question: '如果 max_seq_len 从 128 改到 256，哪些参数会变化？',
        hint: '位置嵌入是一张形状为 (max_seq_len, d_model) 的表。',
        answer:
          '学习式位置 embedding 会多出一倍行数，参数量增加；Transformer Block 的主体不变。注意这不是 RoPE，位置不是临时算出来的。',
      },
      {
        question: '为什么先读 config.py 能减少阅读模型代码时的迷失？',
        hint: '把所有形状先写在一张纸上。',
        answer:
          '因为配置先固定了词表、序列、宽度、层数和头数。读 forward 时，你可以随时把 B、T、C 和 4096 代回去，知道每个张量从哪里来、到哪里去。',
      },
    ],
    extensions: [
      '用一张纸画出“原始对话 → ChatML → token ID → logits → 回复”的完整数据流，并在每条箭头上标出形状。',
      '只改 n_layers 或 d_model，计算参数量变化，再解释变化主要发生在哪些矩阵。',
    ],
    acceptance: [
      {
        id: '1-1',
        label: '能说出 guppylm/、tools/、docs/ 和 notebooks 各自负责什么',
        evidence: '提交一张目录职责图，或在笔记里写四行职责说明。',
      },
      {
        id: '1-2',
        label: '能复现 (2, 32) → (2, 32, 4096) 的前向形状',
        evidence: '保留终端输出，并解释三个维度分别代表什么。',
      },
      {
        id: '1-3',
        label: '能解释 8,726,016 和权重绑定',
        evidence: '写出参数统计命令的输出，并说明 lm_head.weight is tok_emb.weight 的含义。',
      },
      {
        id: '1-4',
        label: '能从固定提交完成 prepare，并说明主要依赖各负责什么',
        evidence: '提交 prepare 输出，并用一句话区分 torch、tokenizers、onnxruntime 的职责。',
      },
    ],
  },
  {
    id: 2,
    slug: 'training-data',
    title: '理解训练数据',
    eyebrow: '数据审计',
    summary:
      '数据决定模型能学会什么，也决定评估是否可信。这个任务会亲手发现一个很重要的问题：名义上的测试集，并不等于真正没见过的数据。',
    duration: '60–75 分钟',
    level: '入门到进阶',
    visual: 'data-leak',
    principles: [
      {
        title: '一条样本就是一次单轮对话',
        body: '原始字段是 `input`、`output` 和 `category`。`input` 是用户说的话，`output` 是 Guppy 的短回复，`category` 是话题标签。训练脚本会把它们拼成带 `<|im_start|>` 和 `<|im_end|>` 的 ChatML 文本，再交给分词器。类别不是模型输入特征，它主要帮助你检查数据分布。',
        takeaway: '输入是用户话语，标签是下一位 token 序列；category 是数据审计用的旁注。',
      },
      {
        title: '训练集和测试集回答的是两个不同问题',
        body: '训练集用于更新参数，测试集用于估计模型在没见过的数据上会怎样。如果测试样本已经在训练集里出现过，测试分数就会偏向记忆而不是迁移。更隐蔽的污染还包括：同一模板只换了一个词、同一生成函数反复产出近似句子，或者分词器提前看过测试文本。',
        takeaway: '先问“测试样本真的没见过吗”，再看 PPL。',
      },
      {
        title: '这次数据的精确重叠非常严重',
        body: '官方 train 有 57,000 条，test 有 3,000 条。按 `(input, output)` 精确匹配，3,000 条 test 中有 2,320 条能在 train 找到，占 77.3%。这不是一个脚注，而是会影响你解读模型能力的主结论。原始生成流程先合成 60,000 条，再随机打乱后切出 5% 作为 eval，因此重复模板很容易跨集合出现。',
        takeaway: '低 PPL 可能说明模型记住了答案，不能单独证明泛化。',
      },
      {
        title: '分词器也参与了“提前看题”',
        body: '`prepare_data.py` 会读取 train 和 eval 的全部文本，再训练 BPE。这意味着测试集的字面片段也影响了词表。它通常比完整样本泄漏轻，但在严格评估里仍应避免：分词器应当只在训练数据上拟合。',
        takeaway: '数据隔离要覆盖模型、词表和预处理，而不只是 train/test 文件本身。',
      },
    ],
    sources: [
      source(
        'guppylm/generate_data.py',
        String.raw`random.shuffle(samples)
n_eval = int(len(samples) * eval_ratio)
eval_samples, train_samples = samples[:n_eval], samples[n_eval:]

for name, data in [
    ("data/train.jsonl", train_samples),
    ("data/eval.jsonl", eval_samples),
]:
    with open(name, "w") as f:
        for s in data:
            f.write(json.dumps({
                "text": format_sample(s),
                "category": s["category"],
            }) + "\n")`,
        '这是随机切分，不是按模板、类别或生成种子分组。它适合快速做出数据集，但不适合声称严格的泛化评估。',
      ),
      source(
        'guppylm/prepare_data.py',
        String.raw`texts = []
for name in ["data/train.jsonl", "data/eval.jsonl"]:
    if os.path.exists(name):
        with open(name) as f:
            for line in f:
                texts.append(json.loads(line)["text"])

tokenizer = train_tokenizer(texts, tokenizer_path)`,
        '分词器在 train + eval 的并集上训练。代码很短，但这是一条需要被审计的评估边界。',
      ),
      source(
        'guppylm/dataset.py',
        String.raw`ids = self.tokenizer.encode(data["text"]).ids
if len(ids) > max_len:
    ids = ids[:max_len]
if len(ids) >= 2:
    self.samples.append(ids)

def __getitem__(self, idx):
    ids = self.samples[idx]
    x = ids[:-1]
    y = ids[1:]
    return torch.tensor(x), torch.tensor(y)`,
        '数据最终以 token ID 序列进入训练。x 和 y 只错一位：每个位置都在学习预测下一个位置。',
      ),
    ],
    experiments: [
      {
        title: '一次完成规模、字段与重叠审计',
        command: 'python scripts/guppylm_verify.py data',
        result:
          "train=57,000\ntest=3,000\ntrain_unique_pairs=15,613\ntest_unique_pairs=2,050\ncategories=60\noverlap=2,320/3,000 (77.3%)\ncolumns=['input', 'output', 'category']",
        observation:
          '57,000 条 train 只有 15,613 个唯一 `(input, output)` 对，说明生成模板本身也在重复。先确认字段和唯一对数量，再讨论模型有没有泛化。',
      },
      {
        title: '按重叠与非重叠分组评估 ONNX 模型',
        command: 'python scripts/guppylm_verify.py onnx-eval',
        result:
          'all        loss=0.407009 ppl=1.502318 samples=3,000 scored_tokens=79,231\noverlap    loss=0.360079 ppl=1.433443 samples=2,320 scored_tokens=58,446\nnonoverlap loss=0.539113 ppl=1.714486 samples=680 scored_tokens=20,785',
        observation:
          '这是完整 ChatML 序列、逐 token 的 next-token loss，不是按 batch 平均的近似值。即使只保留完全没重叠的 680 条，PPL 1.714486 仍远低于均匀猜测的 ln(4096)=8.3178；但这不能把污染问题洗掉，两组数字要一起读。',
      },
    ],
    questions: [
      {
        question: '为什么随机切分 60K 合成样本，很容易产生跨 train/test 的重复？',
        hint: '生成函数是不是从有限模板和词池里组合答案？',
        answer:
          '因为样本不是从无限的独立分布中抽取的，而是由有限模板、词池和随机组合生成。样本数量变大后，同一个 (input, output) 组合很容易再次出现，随机切分无法阻止它跨集合。',
      },
      {
        question: '如果要得到更可信的测试集，你会怎样重新划分？',
        hint: '让整个模板家族或生成种子只出现在一边。',
        answer:
          '可以按模板、生成函数、类别或生成种子分组切分，确保同一家族的变体不会跨集合；分词器只在训练组上拟合；再报告精确重叠、近似重叠和分组指标。',
      },
      {
        question: '非重叠样本 PPL 1.714486 说明模型完全没学会吗？',
        hint: '这个数据集的主题和句式都很窄，而且模型仍然可能在相似模板上学到规律。',
        answer:
          '不能这样下结论。它说明在这批非精确重叠样本上，模型仍有明显低于均匀猜测的预测能力；但还需要按模板家族、类别和真正的新话题做更严格的留出评估，才能讨论泛化。',
      },
    ],
    extensions: [
      '把精确匹配升级为归一化匹配：去掉大小写、标点和多余空格，再统计一次重叠率。',
      '按 category 做 leave-one-category-out：留出一个完整主题作为测试集，观察 PPL 怎样变化。',
      '设计一个只在训练集上训练 tokenizer 的版本，比较词表大小和非重叠样本的序列长度。',
    ],
    acceptance: [
      {
        id: '2-1',
        label: '能解释 input/output/category 三个字段',
        evidence: '写出每个字段在训练和审计中的用途。',
      },
      {
        id: '2-2',
        label: '能复现 2,320 / 3,000 的精确重叠统计',
        evidence: '保留命令输出，并说明为什么这是保守下界。',
      },
      {
        id: '2-3',
        label: '能同时解释全部、重叠、非重叠三组 PPL',
        evidence: '用一段话说明低 PPL 与测试污染为什么必须一起报告。',
      },
      {
        id: '2-4',
        label: '能提出一个比随机切分更干净的评估方案',
        evidence: '至少包含分组切分、分词器隔离和一个评估指标。',
      },
    ],
  },
  {
    id: 3,
    slug: 'bpe-tokenizer',
    title: '训练分词器',
    eyebrow: '文本切分',
    summary: '模型不认识汉字、英文字母或空格，它只认识整数 ID。BPE 的任务，是把连续文本切成一组可复用的片段。',
    duration: '50–65 分钟',
    level: '入门',
    visual: 'tokenizer',
    principles: [
      {
        title: 'BPE 从“太碎”开始，再逐步合并',
        body: 'ByteLevel BPE 先能看到字节级片段，然后统计相邻片段出现的频率，把最常见的一对合并成新片段。重复这个过程，常见词会变成单个 token，生僻词则保留多个片段。它不是在词典里查“整词”，而是在学习一种压缩文本的切分规则。',
        takeaway: 'token 不是天然的语言单位；它是语料统计出来的可复用片段。',
      },
      {
        title: '特殊 token 负责标记对话边界',
        body: '`<pad>` 的 ID 是 0，用于补齐短序列；`<|im_start|>` 的 ID 是 1，表示一轮消息开始；`<|im_end|>` 的 ID 是 2，表示一轮消息结束。训练时 loss 会忽略 pad，推理时遇到 eos 就停止。特殊 token 让一个普通语言模型获得了“对话格式”。',
        takeaway: '特殊 token 是控制信号，不是普通文本内容。',
      },
      {
        title: '配置 4,096 不等于实际词表 4,096',
        body: '`BpeTrainer` 请求最多 4,096 个词表项，但语料只产生了 2,418 个实际词表项，包含 2,352 条 merge。模型 embedding 仍按配置分配 4,096 行，所以后部 ID 没有被使用。理解这个差异，可以避免把“模型参数量”和“实际文本覆盖率”混为一谈。',
        takeaway: '先打印 tokenizer.get_vocab_size()，再相信配置里的 vocab_size。',
      },
    ],
    sources: [
      source(
        'guppylm/prepare_data.py',
        String.raw`tokenizer = Tokenizer(models.BPE())
tokenizer.pre_tokenizer = pre_tokenizers.ByteLevel(add_prefix_space=False)
tokenizer.decoder = decoders.ByteLevel()

trainer = trainers.BpeTrainer(
    vocab_size=VOCAB_SIZE,
    special_tokens=SPECIAL_TOKENS,
    min_frequency=2,
)
tokenizer.train_from_iterator(texts, trainer)`,
        'ByteLevel 负责字节映射，BPE 负责合并，BpeTrainer 负责统计。三者不是同一个东西。',
      ),
      source(
        'guppylm/prepare_data.py',
        String.raw`SPECIAL_TOKENS = [
    "<pad>",         # 0
    "<|im_start|>",  # 1
    "<|im_end|>",    # 2
]`,
        '顺序决定 ID。训练、数据拼接和推理停止条件必须使用同一套特殊 token 约定。',
      ),
      source(
        'guppylm/dataset.py',
        String.raw`ids = self.tokenizer.encode(data["text"]).ids
if len(ids) > max_len:
    ids = ids[:max_len]
if len(ids) >= 2:
    self.samples.append(ids)`,
        '分词器的输出直接成为训练数据。这里还做了一次截断，超过 max_seq_len 的部分不会进入模型。',
      ),
    ],
    experiments: [
      {
        title: '一次检查词表、merge 和 ChatML 编码',
        command: 'python scripts/guppylm_verify.py tokenizer',
        result:
          "vocab=2418\nmerges=2352\nget_vocab_size=2418\ntokens=['hi', 'Ġguppy']\nids=[779, 278]\nchatml_ids=[1, 88, 64, 779, 278, 2, 64, 1, 89, 64]",
        observation:
          '2,418 是实际词表，2,352 是 merge 规则数。两者不相同，因为词表还包含初始字节片段和特殊 token。脚本直接读取 JSON 里的 merges，避免依赖不同 `tokenizers` 版本是否暴露 `model.merges` 属性。',
      },
      {
        title: '看一个句子怎样被切开',
        command:
          "python -c \"import sys; sys.stdout.reconfigure(encoding='utf-8'); from tokenizers import Tokenizer; t=Tokenizer.from_file('.tmp-guppylm/guppylm-src/docs/tokenizer.json'); e=t.encode('hi guppy'); print(e.tokens); print(e.ids)\"",
        result: "['hi', 'Ġguppy']\n[779, 278]",
        observation: '`Ġ` 是 ByteLevel 对前导空格的编码。`guppy` 在这里是一个完整 token，而不是 g/u/p/p/y 五个字符。',
      },
      {
        title: '检查完整 ChatML prompt',
        command:
          "python -c \"from tokenizers import Tokenizer; t=Tokenizer.from_file('.tmp-guppylm/guppylm-src/docs/tokenizer.json'); ids=t.encode('<|im_start|>user\\nhi guppy<|im_end|>\\n<|im_start|>assistant\\n').ids; print(len(ids)); print(ids)\"",
        result: '10\n[1, 88, 64, 779, 278, 2, 64, 1, 89, 64]',
        observation:
          '开头 1 是消息开始，后面依次是 user、换行、hi、guppy、消息结束，再进入 assistant。模型看到的是这串 ID，不是带格式的字符串。',
      },
    ],
    questions: [
      {
        question: '为什么 `hi guppy` 和 `hi  guppy`（两个空格）可能得到不同 token？',
        hint: 'ByteLevel 会把空格编码进 token 字符串。',
        answer:
          '因为空格是输入字节的一部分，BPE 学到的片段包含空格信息。两个空格会产生不同的字节序列，merge 结果也可能不同。',
      },
      {
        question: '为什么实际词表 2,418 而模型 embedding 仍是 4,096 行？',
        hint: '模型形状由 GuppyConfig 决定，不由 tokenizer.json 自动回写。',
        answer:
          '模型按配置分配了 4,096 行 embedding，但分词器只产出 0–2,417 这些 ID。剩余行在训练中不会收到梯度，属于分配了但没有使用的容量。',
      },
      {
        question: '如果把特殊 token 的 ID 顺序换掉，会发生什么？',
        hint: '数据里的字符串和模型的停止条件都依赖同一套约定。',
        answer:
          '如果只换 tokenizer 的顺序而不更新模型配置和推理逻辑，消息边界和停止 token 会错位，模型可能把结束符当成普通内容，或者在不该停的时候停下。',
      },
    ],
    extensions: [
      '把 `vocab_size` 改为 1,024，重新训练分词器，比较 `hi guppy` 的 token 数和模型 embedding 参数量。',
      '加入一个只出现一次的稀有词，观察它被拆成多少片段，再解释 BPE 的合并频率门槛。',
    ],
    acceptance: [
      {
        id: '3-1',
        label: '能解释 ByteLevel BPE 的合并过程',
        evidence: '用一段短文本写出至少一次相邻片段合并。',
      },
      {
        id: '3-2',
        label: '能复现 2,418 词表和 2,352 merges',
        evidence: '保存词表检查命令的输出。',
      },
      {
        id: '3-3',
        label: '能解释 4,096 配置容量与实际使用 ID 的关系',
        evidence: '说明未使用 embedding 行为什么不会影响前向形状。',
      },
    ],
  },
  {
    id: 4,
    slug: 'transformer',
    title: '阅读 Transformer',
    eyebrow: '模型内部',
    summary: '这一关把 Transformer 拆成可以逐个检查的零件：token 身份、位置、注意力、残差、LayerNorm 和前馈网络。',
    duration: '90–120 分钟',
    level: '核心',
    visual: 'transformer',
    principles: [
      {
        title: 'Embedding 先回答“是谁”和“在哪里”',
        body: 'token embedding 把每个 ID 映射成 384 维向量，表示“这个 token 是什么”；位置 embedding 给第 0、1、2…个位置各一张可学习向量，表示“它在哪里”。两者相加后，模型才同时拥有内容和顺序信息。这里的 GuppyLM 使用学习式绝对位置，不是 RoPE。',
        takeaway: '内容向量 + 位置向量，是 Transformer 进入注意力层前的第一份表示。',
      },
      {
        title: '多头注意力是六种关系视角同时工作',
        body: '每个头把 384 维投影成 64 维，分别计算 Query、Key、Value。Q 和 K 的点积决定“当前 token 应该看谁”，softmax 把分数变成权重，V 的加权和把信息搬过来。因果 mask 是下三角矩阵，保证第 t 个位置只能看 0…t，不能偷看未来。',
        takeaway: '注意力不是“记住整句话”，而是当前位置对历史位置做一次加权检索。',
      },
      {
        title: '残差、LayerNorm 和 FFN 让信息能稳定地往下走',
        body: '每个 Block 先做 `x + Attention(LayerNorm(x))`，再做 `x + FFN(LayerNorm(x))`。残差保留原信息，LayerNorm 稳定数值，FFN 用 384→768→384 的 ReLU 网络对每个位置独立变换。Pre-LN 结构让六层堆叠更容易训练。',
        takeaway: '先归一化再进子层，再用残差接回来；这是 Block 的骨架。',
      },
      {
        title: '输出层把隐藏状态变回词表分数',
        body: '六层结束后，最终 LayerNorm 把 384 维隐藏状态送进 `lm_head`，得到 4,096 维 logits。GuppyLM 把 `lm_head.weight` 绑定到 `tok_emb.weight`，所以输入和输出共享同一张 4,096×384 的表。',
        takeaway: '模型最后输出的不是概率，而是 logits；softmax 和采样在下一步才发生。',
      },
    ],
    sources: [
      source(
        'guppylm/model.py',
        String.raw`class Block(nn.Module):
    def __init__(self, config):
        super().__init__()
        self.norm1 = nn.LayerNorm(config.d_model)
        self.attn = Attention(config)
        self.norm2 = nn.LayerNorm(config.d_model)
        self.ffn = FFN(config)

    def forward(self, x, mask=None):
        x = x + self.attn(self.norm1(x), mask)
        x = x + self.ffn(self.norm2(x))
        return x`,
        '两行 forward 就是整个 Block 的阅读骨架：先注意力，再 FFN；两个子层都带残差。',
      ),
      source(
        'guppylm/model.py',
        String.raw`qkv = self.qkv(x).reshape(B, T, 3, self.n_heads, self.head_dim)
q, k, v = qkv[0], qkv[1], qkv[2]

attn = (q @ k.transpose(-2, -1)) / math.sqrt(self.head_dim)
if mask is not None:
    attn = attn.masked_fill(mask == 0, float("-inf"))
attn = self.dropout(F.softmax(attn, dim=-1))
return self.out((attn @ v).transpose(1, 2).contiguous().view(B, T, C))`,
        '一次线性层同时算出 Q/K/V，再拆成六个头。mask 把未来位置的分数变成负无穷，softmax 后权重接近 0。',
      ),
      source(
        'guppylm/model.py',
        String.raw`self.tok_emb = nn.Embedding(config.vocab_size, config.d_model)
self.pos_emb = nn.Embedding(config.max_seq_len, config.d_model)
...
self.lm_head = nn.Linear(config.d_model, config.vocab_size, bias=False)
self.lm_head.weight = self.tok_emb.weight  # tie weights`,
        '输入和输出共享权重，既减少参数，也让“输入 token 的方向”和“输出 token 的方向”保持一致。',
      ),
    ],
    experiments: [
      {
        title: '观察一层 Block 的参数量',
        command:
          'python -c "import sys; sys.path.insert(0,\'.tmp-guppylm/guppylm-src\'); from guppylm.config import GuppyConfig; from guppylm.model import Block; print(sum(p.numel() for p in Block(GuppyConfig()).parameters()))"',
        result: '1183872',
        observation: '每层约 1.18M 参数，六层约 7.10M。注意力、FFN 和两个 LayerNorm 都在这一个数字里。',
      },
      {
        title: '验证因果 mask 的效果',
        command:
          'python -c "import sys,torch; sys.path.insert(0,\'.tmp-guppylm/guppylm-src\'); from guppylm.config import GuppyConfig; from guppylm.model import GuppyLM; m=GuppyLM(GuppyConfig()); x=torch.randint(0,4096,(1,8)); a,_=m(x); print(a.shape)"',
        result: 'torch.Size([1, 8, 4096])',
        observation:
          '输出长度与输入长度相同：每个位置都有 4,096 个下一 token 分数。因果性藏在 attention mask 里，不改变输出形状。',
      },
    ],
    questions: [
      {
        question: '为什么 Q 和 K 点积能表示“该关注谁”？',
        hint: '把点积想成两个向量方向有多接近。',
        answer:
          'Q 表示当前位置想找什么，K 表示历史位置能提供什么。点积越大，二者在表示空间里越匹配，softmax 后该位置获得更高权重。',
      },
      {
        question: '如果没有残差连接，深层网络会缺少什么？',
        hint: '子层是在原表示上“补充信息”，还是把原表示完全替换掉？',
        answer: '残差让每个子层学习增量，而不是从零重建整个表示。它提供更短的梯度路径，也让原始 token 信息能跨层保留。',
      },
      {
        question: '为什么 LayerNorm 放在子层之前，而不是之后？',
        hint: '这是 Pre-LN 结构，观察残差主干是否更干净。',
        answer:
          'Pre-LN 把归一化放在注意力和 FFN 之前，残差主干保持恒等路径。它通常比 Post-LN 更容易训练深层 Transformer。',
      },
    ],
    extensions: [
      '把 ReLU FFN 改成 GELU，记录需要改哪一行，并比较参数量是否变化。',
      '把学习式位置 embedding 换成 RoPE，先只写出需要替换的接口，不要求一次完成整个训练。',
      '打印六个头中某一个头的 attention 权重，观察不同 token 的注意力分布。',
    ],
    acceptance: [
      {
        id: '4-1',
        label: '能用自己的话解释 Q/K/V 和因果 mask',
        evidence: '用一句话分别说明“查什么、被谁查、搬运什么、不能看哪里”。',
      },
      {
        id: '4-2',
        label: '能指出 Block 中两次残差和两次 LayerNorm 的位置',
        evidence: '在代码截图上圈出 norm1、attn、norm2、ffn 和两个加法。',
      },
      {
        id: '4-3',
        label: '能验证参数量与权重绑定',
        evidence: '保留 1,183,872 和 True 的运行输出。',
      },
    ],
  },
  {
    id: 5,
    slug: 'training-loop',
    title: '理解训练过程',
    eyebrow: '参数更新',
    summary: '训练不是“把正确答案喂进去就结束”，而是让模型在每一个位置反复预测下一个 token，再根据误差调整参数。',
    duration: '75–90 分钟',
    level: '核心',
    visual: 'schedule',
    principles: [
      {
        title: '自回归训练：输入左移，目标右移',
        body: '如果 token 序列是 `[A, B, C, D]`，输入就是 `[A, B, C]`，目标就是 `[B, C, D]`。模型看到 A 时学着预测 B，看到 A、B 时学着预测 C。一次前向就同时训练了多个 next-token 任务，这就是 teacher forcing 的高效之处。',
        takeaway: 'x 和 y 不是两份独立数据，而是同一条序列错开一位。',
      },
      {
        title: '交叉熵衡量“正确答案的概率有多低”',
        body: '模型每个位置输出 4,096 个 logits，softmax 后得到概率。交叉熵只关心正确 token 的概率：概率越高，loss 越小。困惑度 PPL 是 `exp(loss)`，可以粗略理解为模型在多少个候选之间犹豫。均匀猜测 4,096 个 token 的 loss 是 ln(4096)=8.3178。',
        takeaway: 'PPL 低不代表泛化强，它只是当前数据分布上的平均不确定性。',
      },
      {
        title: 'AdamW 同时管理动量和权重衰减',
        body: 'AdamW 维护一阶矩（梯度的滑动平均）和二阶矩（梯度平方的滑动平均），给不同参数自适应步长；weight decay 则把参数往 0 拉，抑制过拟合。GuppyLM 使用 betas=(0.9, 0.95)、weight decay=0.1，并在 CUDA 上启用 AMP。',
        takeaway: '优化器不是“更快的梯度下降”，它还在处理不同参数的尺度和噪声。',
      },
      {
        title: 'Warmup + 余弦衰减控制学习率节奏',
        body: '前 200 步学习率从 0 线性升到 3e-4，让模型先稳定下来；之后用余弦曲线从 3e-4 平滑降到 3e-5。学习率太大可能炸 loss，太小则学得慢。GuppyLM 在每步更新前调用 `get_lr`，并把值写进 optimizer 的参数组。',
        takeaway: '学习率是一个随训练阶段变化的控制变量，不是一次性写死的常数。',
      },
    ],
    sources: [
      source(
        'guppylm/dataset.py',
        String.raw`ids = self.samples[idx]
x = ids[:-1]
y = ids[1:]
return torch.tensor(x), torch.tensor(y)`,
        '整个训练目标就藏在这四行里：每个输入位置的下一个 token 就是对应目标。',
      ),
      source(
        'guppylm/model.py',
        String.raw`loss = F.cross_entropy(
    logits.view(-1, self.config.vocab_size),
    targets.view(-1),
    ignore_index=0,
)`,
        '把 (B, T, V) 摊平成 (B×T, V)，每个位置和它的目标 token 做一次分类损失；pad ID 0 被忽略。',
      ),
      source(
        'guppylm/train.py',
        String.raw`optimizer = torch.optim.AdamW(
    model.parameters(), lr=tc.learning_rate,
    weight_decay=tc.weight_decay, betas=(0.9, 0.95),
)

def get_lr(step, config):
    if step < config.warmup_steps:
        return config.learning_rate * step / config.warmup_steps
    progress = (step - config.warmup_steps) / max(
        1, config.max_steps - config.warmup_steps
    )
    coeff = 0.5 * (1 + math.cos(math.pi * progress))
    return config.min_lr + (config.learning_rate - config.min_lr) * coeff`,
        '先 warmup，再余弦衰减。注意 `step / warmup_steps` 让第 0 步学习率为 0，而不是一上来就最大。',
      ),
    ],
    experiments: [
      {
        title: '打印学习率轨迹',
        command:
          "python -c \"import sys; sys.path.insert(0,'.tmp-guppylm/guppylm-src'); from guppylm.train import get_lr; from guppylm.config import TrainConfig; c=TrainConfig(); [print(s, f'{get_lr(s,c):.8f}') for s in [0,100,200,1000,5000,9999]]\"",
        result: '0 0.00000000\n100 0.00015000\n200 0.00030000\n1000 0.00029558\n5000 0.00016933\n9999 0.00003000',
        observation: '第 200 步达到峰值，之后平滑下降。这里的数字是配置公式算出来的，不是一条声称来自训练日志的曲线。',
      },
      {
        title: '把 PPL 换回平均损失',
        command: "python -c \"import math; print(f'{math.log(1.502318):.6f}'); print(f'{math.exp(0.407009):.6f}')\"",
        result: '0.407009\n1.502318',
        observation: 'loss 和 PPL 是同一件事的两种刻度。PPL 更直观，但它不能替你判断测试集是否干净。',
      },
    ],
    questions: [
      {
        question: '为什么模型可以在一次前向中同时学习很多个 next-token 任务？',
        hint: '每个位置都有自己的目标 token。',
        answer:
          '因为输入和目标是同一条序列错一位，模型在每个位置都产生一个预测和一个损失。把所有位置的损失平均，就得到一次前向的总训练信号。',
      },
      {
        question: 'warmup 为什么能减少早期训练不稳定？',
        hint: '刚初始化的模型输出还很随机。',
        answer:
          '一开始参数和统计量都不稳定，大学习率可能让更新过猛。warmup 从很小的步长开始，让模型先找到相对稳定的方向，再逐步加大更新。',
      },
      {
        question: 'PPL=1.50 是否意味着模型“几乎全对”？',
        hint: 'PPL 是平均概率的函数，不是准确率。',
        answer:
          '不是。PPL 1.50 表示平均来看模型在少数高概率候选之间比较确定，但它不告诉你每个答案是否语义正确，也不能消除数据泄漏。',
      },
    ],
    extensions: [
      '把 warmup 从 200 改成 50，只训练很短一段，比较前 100 步的 loss 波动。',
      '把 min_lr 改成与 learning_rate 相同，观察学习率曲线和后期 loss 是否变化。',
      '预先写下判断标准，再比较 AdamW 与普通 Adam 的短程训练结果。',
    ],
    acceptance: [
      {
        id: '5-1',
        label: '能画出 x 与 y 错一位的示意',
        evidence: '用一条 5–6 个 token 的短序列写出输入和目标。',
      },
      {
        id: '5-2',
        label: '能解释交叉熵、loss 与 PPL 的关系',
        evidence: '写出 PPL=exp(loss) 并说明均匀猜测基线。',
      },
      {
        id: '5-3',
        label: '能复现 warmup 和余弦学习率的关键点',
        evidence: '保留第 0、100、200、1,000、5,000、9,999 步的输出。',
      },
    ],
  },
  {
    id: 6,
    slug: 'inference-sampling',
    title: '运行模型推理',
    eyebrow: '文本生成',
    summary:
      '训练让模型学会概率分布，推理则要决定怎样从分布里选 token。temperature 和 top-k 改变的不是模型权重，而是采样策略。',
    duration: '50–70 分钟',
    level: '入门到进阶',
    visual: 'sampling',
    principles: [
      {
        title: '自回归生成是“预测一个，接回去，再预测”',
        body: '模型一次前向只产生下一个 token 的分布。采样出一个 token 后，把它拼到输入末尾，再截取最近 128 个 token 作为下一次输入。重复这个过程，文本才会变长。它不是一次性生成整段，而是循环执行同一个小步骤。',
        takeaway: '生成长度是循环次数，不是一次矩阵乘法的输出长度。',
      },
      {
        title: 'Temperature 改变分布的“陡峭程度”',
        body: 'logits 除以 temperature。温度小于 1 时，大小差距被放大，概率更集中，文本更稳定；温度大于 1 时，差距被压平，低概率候选获得更多机会，文本更发散，也更容易跑题。温度不会改变模型参数。',
        takeaway: '低温像“保守派”，高温像“冒险家”。',
      },
      {
        title: 'Top-k 先砍掉长尾，再从剩下的候选里采样',
        body: 'top-k 只保留 logits 最高的 k 个 token，把其余 token 的概率置为负无穷。它可以防止模型从极其离谱的长尾候选里抽中一个词，但 k 太大时保护变弱，k 太小时又可能限制表达。temperature 和 top-k 是两个不同旋钮，要分开做对照实验。',
        takeaway: 'temperature 改形状，top-k 改候选范围。',
      },
      {
        title: '对话格式和停止条件也是推理的一部分',
        body: '推理代码把 messages 拼成 `<|im_start|>user…<|im_end|>`，再追加 `<|im_start|>assistant`，模型才知道该继续哪种角色。遇到 eos 或生成到 `max_new_tokens` 就停止；输出还要截掉意外生成的下一轮标记。',
        takeaway: '会训练不等于会聊天，格式和停止逻辑同样决定最终体验。',
      },
    ],
    sources: [
      source(
        'guppylm/model.py',
        String.raw`for _ in range(max_new_tokens):
    idx_cond = idx[:, -self.config.max_seq_len:]
    logits, _ = self(idx_cond)
    logits = logits[:, -1, :] / temperature
    if top_k > 0:
        v, _ = torch.topk(logits, min(top_k, logits.size(-1)))
        logits[logits < v[:, [-1]]] = float("-inf")
    probs = F.softmax(logits, dim=-1)
    next_id = torch.multinomial(probs, num_samples=1)
    idx = torch.cat([idx, next_id], dim=1)`,
        '先截上下文，再取最后一个位置的 logits，调温度、做 top-k、softmax，最后采样。',
      ),
      source(
        'guppylm/inference.py',
        String.raw`parts = []
for msg in messages:
    role = msg.get("role", "user")
    content = msg.get("content") or ""
    parts.append(
        f"<|im_start|>{role}\n{content}<|im_end|>"
    )
parts.append("<|im_start|>assistant\n")
return "\n".join(parts)`,
        '这段把普通聊天消息变成训练时见过的 ChatML 格式。没有这一步，模型不知道谁在说话。',
      ),
    ],
    experiments: [
      {
        title: '准备固定权重与分词器',
        command: 'python scripts/guppylm_verify.py prepare',
        result: '已存在时逐项 skip；缺失时下载源码、数据、权重和 ONNX。',
        observation:
          '先让 checkpoint、config.json 和 tokenizer 处在脚本约定的位置，再运行聊天命令。不要只下载权重却忘记 tokenizer。',
      },
      {
        title: '固定 prompt，对比温度和 top-k',
        command: 'python scripts/guppylm_verify.py sample --prompt "hi guppy"',
        result:
          "T=0.3, k=10：oh hello. i didn't see you there. my eyes are on the sides.\nT=0.7, k=50：oh hello. you look big today. you always look big. i blew some bubbles earlier.\nT=1.2, k=200：oh hello. you look big today. you always look big. i blew some bubbles earlier.",
        observation:
          '这是 PyTorch CPU、每个参数组合重置 `seed=42`、最多生成 32 个新 token 的实测样例。高温度没有必然产生更离谱的文本，因为候选概率、top-k 和随机路径会一起作用。',
      },
      {
        title: '换一个 prompt，检查结论是否稳定',
        command: 'python scripts/guppylm_verify.py sample --prompt "what is the meaning of life"',
        result:
          "T=0.3, k=10：i don't think about purpose. i think about food.\nT=0.7, k=50：i don't think about purpose. i think about food.\nT=1.2, k=200：i don't think about purpose. i think about food.",
        observation:
          '三个参数组恰好走到同一条高概率路径，说明不能只凭一个 prompt 给 temperature 下结论。至少换 3 个 prompt、重复 3 个 seed，再比较稳定性、重复率和语义偏离。',
      },
    ],
    questions: [
      {
        question: 'Temperature=0 时，生成还是随机的吗？',
        hint: '除以 0 不是合法做法，代码通常会改用 argmax。',
        answer:
          '数学上不能除以 0；实际实现通常把 temperature 设为极小值或用 greedy argmax。GuppyLM 的代码默认接受正温度，实验时不要直接传 0。',
      },
      {
        question: 'top-k 很小为什么可能让文本更稳定，但也更单调？',
        hint: '候选集合缩小后，概率质量会重新分配。',
        answer:
          '因为低概率的意外 token 被砍掉了，模型只能在少数高概率候选里选，所以更稳定；但候选太少会减少表达变化，尤其在重复 prompt 下容易显得单调。',
      },
      {
        question: '为什么同一组参数在不同机器上可能生成不同文本？',
        hint: '采样使用随机数，运行时和浮点实现也可能不同。',
        answer:
          '`torch.multinomial` 依赖随机状态；不同设备、运行时、seed 设置和数值实现可能产生不同的随机序列或微小 logits 差异，最终导致采样路径不同。',
      },
    ],
    extensions: [
      '固定 temperature=0.7，只改 top-k 为 10、50、200，记录三次输出并画出“稳定性—多样性”观察表。',
      '固定 top-k=50，只改 temperature 为 0.3、0.7、1.2，观察哪一组最容易跑题。',
      '把最大生成长度减半，观察模型是更早停止还是被长度截断。',
    ],
    acceptance: [
      {
        id: '6-1',
        label: '能解释自回归生成的循环',
        evidence: '用自己的话描述“取最后一位 logits → 采样 → 拼回输入”。',
      },
      {
        id: '6-2',
        label: '能区分 temperature 和 top-k',
        evidence: '分别说明它们改变的是概率形状还是候选集合。',
      },
      {
        id: '6-3',
        label: '完成至少一组固定 seed 的参数对照',
        evidence: '保留 prompt、参数、输出和观察结论。',
      },
    ],
  },
  {
    id: 7,
    slug: 'onnx-deployment',
    title: '导出并部署模型',
    eyebrow: '浏览器推理',
    summary:
      '训练好的 PyTorch 模型不能直接塞进网页。这个任务把计算图导出成 ONNX，压缩成 QUInt8，再交给浏览器里的 WASM 运行时。',
    duration: '60–90 分钟',
    level: '进阶',
    visual: 'deployment',
    principles: [
      {
        title: 'ONNX 导出的是计算图，不是训练框架',
        body: 'PyTorch 训练时依赖 Python、autograd 和动态图；ONNX 把前向计算固化成跨框架的图，节点表示矩阵乘、LayerNorm、Softmax 等运算。浏览器只要按图执行，不需要安装 PyTorch。GuppyLM 只导出 forward，不导出训练循环。',
        takeaway: '部署关心的是前向图、输入输出和运行时，不是训练脚本。',
      },
      {
        title: '动态 batch 和 seq_len 让一张图适应不同输入',
        body: '导出脚本把 `input_ids` 的第 0 维命名为 batch，第 1 维命名为 seq_len。这样同一个 ONNX 文件可以接受不同 batch 和不同长度的输入，而不是固定死在示例张量 `(1, 32)` 上。',
        takeaway: '动态轴是部署接口的一部分，不是可有可无的元数据。',
      },
      {
        title: 'QUInt8 动态量化用更少位宽存权重',
        body: '动态量化把权重从高精度浮点压到 8 位整数，推理时再按动态范围反量化。它能显著减小文件，但会产生量化误差，因此输出可能和 PyTorch 不完全一致。GuppyLM 官方 ONNX 约 10 MB，原始 float32 会大得多。',
        takeaway: '量化的目标是节省空间和带宽，不是保证逐位无损。',
      },
      {
        title: 'WASM 让浏览器成为推理主机',
        body: 'ONNX Runtime Web 通过 WebAssembly 在浏览器本地执行模型。页面先 fetch tokenizer.json 和 model.onnx，再创建 InferenceSession。模型不需要上传到服务器，但首次下载约 10 MB，用户要等文件加载完才能开始。',
        takeaway: '浏览器推理的代价从服务器 API 变成了前端下载、内存和计算。',
      },
    ],
    sources: [
      source(
        'tools/export_onnx.py',
        String.raw`torch.onnx.export(
    model,
    (dummy_input,),
    output_path,
    input_names=["input_ids"],
    output_names=["logits"],
    dynamic_axes={
        "input_ids": {0: "batch", 1: "seq_len"},
        "logits": {0: "batch", 1: "seq_len"},
    },
    opset_version=17,
)

quantize_dynamic(
    fp32_path,
    output_path,
    weight_type=QuantType.QUInt8,
)`,
        '核心流程是先导出浮点图，再动态量化。固定提交的独立脚本入口在部分环境会触发相对导入错误；课程脚本改用包导入并显式选择 legacy exporter，避免把环境问题误认为模型问题。',
      ),
      source(
        'docs/index.html',
        String.raw`const modelResp = await fetch(MODEL_BASE + "/model.onnx");
const modelBuf = await modelResp.arrayBuffer();
session = await ort.InferenceSession.create(modelBuf, {
  executionProviders: ["wasm"],
});`,
        '浏览器 Demo 先下载模型，再用 WASM execution provider 创建会话。模型文件不在本站复制，页面只链接官方 Demo。',
      ),
      source(
        'tools/export_onnx.py',
        String.raw`# Quantization shrinks the model from ~35 MB (float32)
# to ~9 MB (uint8) with negligible quality loss at this model size.`,
        '这是仓库作者的说明，不等于“无损”。页面保留实测文件大小，同时要求学习者比较量化前后的输出差异。',
      ),
    ],
    experiments: [
      {
        title: '亲手导出并动态量化',
        command: 'python scripts/guppylm_verify.py export-onnx',
        result:
          'parameters=8,726,016\nfloat32=.../model_fp32.onnx (41,240,930 bytes)\nquantized=.../model.onnx (10,469,869 bytes)\nsha256=7443472D...（本机导出文件）',
        observation:
          'float32 约 41.2 MB，QUInt8 约 10.5 MB。量化后的文件大小与官方文件一致，但哈希不必相同。课程实测重导出模型全部 test 的 PPL 为 1.502339，官方文件为 1.502318；差异很小，却证明“量化不是逐位无损”。部署验证要比对输入输出与误差，不能只背哈希。',
      },
      {
        title: '核对官方文件并创建 ONNX 会话',
        command: 'python scripts/guppylm_verify.py onnx-check',
        result:
          "bytes=10,469,869\nsha256=96DD79D233662B65BC0FAE1773821479551D1C1257CA5BBD12FA3E6623AE4835\ninputs=[('input_ids', ['batch', 'seq_len'], 'tensor(int64)')]\noutputs=[('logits', ['batch', 'seq_len', 4096], 'tensor(float)')]",
        observation:
          '哈希和字节数确认拿到的是同一份官方文件；动态 batch/seq_len 说明同一张图可接受不同长度输入。会话能加载仍不等于生成质量通过，任务 2 的 PPL 和任务 6 的采样才覆盖行为。',
      },
      {
        title: '打开浏览器 Demo',
        command: '打开 https://arman-bd.github.io/guppylm/',
        result: '页面下载 tokenizer 和 model.onnx，随后可在本地 WASM 会话中聊天。',
        observation:
          '在开发者工具的 Network 面板确认模型文件确实被下载；断网后已加载的会话是否还能继续推理，取决于浏览器缓存和页面实现。',
      },
    ],
    questions: [
      {
        question: '为什么部署脚本不导出 loss？',
        hint: '推理时没有标签，也不需要反向传播。',
        answer:
          '部署目标是生成：输入 token IDs，输出 logits。loss 属于训练阶段，依赖 targets 和反向图；把它带进浏览器只会增加无关计算。',
      },
      {
        question: '量化后输出变了，应该先怀疑模型坏了吗？',
        hint: '量化会引入近似。',
        answer:
          '不必先怀疑损坏。应先比较量化前后的文件、输入、logits 误差和生成结果，确认变化是否在可接受范围内；如果加载失败或误差巨大，再排查导出和运行时兼容性。',
      },
      {
        question: '把 10 MB 模型放进页面首屏加载，会带来什么工程取舍？',
        hint: '想想移动网络、缓存、内存和用户等待。',
        answer:
          '优点是无需后端、隐私更好、离线潜力更强；代价是首次下载慢、占内存、移动端计算弱，且模型更新需要重新发版或缓存失效。',
      },
    ],
    extensions: [
      '比较 float32 与 QUInt8 的文件大小、加载时间和同一输入的 logits 差异。',
      '给浏览器 Demo 加一个“模型下载中”的进度条，并处理下载失败和 WASM 不可用的错误状态。',
      '把 opset 17 改成另一个版本，记录导出或加载是否失败；不要在没有证据时宣称兼容。',
    ],
    acceptance: [
      {
        id: '7-1',
        label: '能画出 PyTorch → ONNX → QUInt8 → WASM 链路',
        evidence: '在图上标出每一步的产物和运行时。',
      },
      {
        id: '7-2',
        label: '能解释动态 batch/seq_len 和 opset 17',
        evidence: '说明为什么固定形状会限制浏览器调用。',
      },
      {
        id: '7-3',
        label: '能用哈希和会话检查证明 ONNX 文件可加载',
        evidence: '保留 SHA256、字节数和输入输出名称。',
      },
      {
        id: '7-4',
        label: '能说明量化可能改变输出',
        evidence: '写出至少一个量化误差来源和一个验证方法。',
      },
    ],
  },
  {
    id: 8,
    slug: 'extension-experiments',
    title: '完成拓展实验',
    eyebrow: '单变量实验',
    summary: '最后一关不是“再跑一次”，而是像研究者一样提出假设、只改一个变量、记录指标，并诚实说明结论的边界。',
    duration: '90–120 分钟',
    level: '挑战',
    visual: 'experiment',
    principles: [
      {
        title: '一次只改一个主变量',
        body: '如果同时改层数、宽度、序列长度和学习率，最后即使指标变化，你也不知道是谁造成的。先固定 baseline，再选择一个主变量；其他配置、数据、seed 和评估脚本尽量保持不变。',
        takeaway: '实验不是堆改动，而是把因果解释压缩到一个变量上。',
      },
      {
        title: '参数量只是成本的一部分',
        body: '增加层数会线性增加 Block 参数；增加 d_model 会同时放大 embedding、注意力投影和 FFN；增加序列长度只改变位置表和学习成本，不改变 Block 主体。更小的模型不一定更差，更大的模型也不一定更会泛化。',
        takeaway: '先计算参数和计算量，再决定实验是否值得跑。',
      },
      {
        title: '数据改动往往比结构改动更影响结果',
        body: '去重、按模板分组、限制类别、改变回复长度，都会改变模型看到的世界。一个更干净的测试集可能让分数下降，却让结论更可信。不要只追求更好看的 PPL。',
        takeaway: '数据质量、评估隔离和模型结构要一起设计。',
      },
      {
        title: '结论必须带上局限',
        body: '短程训练、单 seed、小数据和小模型都可能让结果波动。报告时写清 baseline、变量、控制量、指标、命令、观察和限制。没有限制的结论，通常只是把一次运行包装成了规律。',
        takeaway: '可复现实验 = 假设 + 对照 + 证据 + 局限。',
      },
    ],
    sources: [
      source(
        'guppylm/config.py',
        String.raw`@dataclass
class GuppyConfig:
    vocab_size: int = 4096
    max_seq_len: int = 128
    d_model: int = 384
    n_layers: int = 6
    n_heads: int = 6
    ffn_hidden: int = 768`,
        '这些字段是最直接的实验旋钮，但一次只选一个作为主变量。',
      ),
      source(
        'guppylm/train.py',
        String.raw`torch.manual_seed(tc.seed)
...
model = GuppyLM(mc).to(device)
...
losses.append(loss.item())
...
if el < best_eval:
    best_eval = el
    torch.save({...}, "best_model.pt")`,
        'seed、loss 记录和 best checkpoint 是实验复现的最小证据。只看最后一条生成文本，不足以支撑结论。',
      ),
    ],
    experiments: [
      {
        title: '参数量对照',
        command:
          "python -c \"import sys; sys.path.insert(0,'.tmp-guppylm/guppylm-src'); from guppylm.config import GuppyConfig; from guppylm.model import GuppyLM; configs=[('baseline',{}),('3 layers',{'n_layers':3}),('8 layers',{'n_layers':8}),('d256',{'d_model':256,'ffn_hidden':512,'n_heads':4}),('seq64',{'max_seq_len':64}),('seq256',{'max_seq_len':256}),('3l-seq64',{'n_layers':3,'max_seq_len':64})]; [print(n, sum(p.numel() for p in GuppyLM(GuppyConfig(**kw)).parameters())) for n,kw in configs]\"",
        result:
          'baseline 8726016\n3 layers 5174400\n8 layers 11093760\nd256 4244480\nseq64 8701440\nseq256 8775168\n3l-seq64 5149824',
        observation:
          '少三层省下 3×1,183,872=3,551,616 个参数；宽度降到 256 省下约 4.48M。序列长度只改位置表，所以 seq64 与 seq256 的差异只有 192×384=73,728 个位置参数。',
      },
      {
        title: '选一个数据实验',
        command: '重新生成数据 → 按模板去重 → 只保留 30 个主题 → 用同一 tokenizer 与训练配置跑短程 baseline',
        result: '记录 train/eval 大小、loss、PPL、生成样例和失败案例。',
        observation: '数据实验的结论不能只看 PPL。还要看模型是否学到主题边界、是否更容易重复，以及测试集是否真的隔离。',
      },
      {
        title: '写实验记录卡',
        command: 'hypothesis | variable | controls | metric | command | result | limitation',
        result: '一张可以交给别人复现的实验卡。',
        observation: '如果别人只看你的记录卡无法重跑，说明记录还不够。',
      },
    ],
    questions: [
      {
        question: '为什么增加层数比增加序列长度更明显地改变参数量？',
        hint: '每层 Block 都有注意力、FFN 和 LayerNorm。',
        answer:
          '因为每个 Block 都复制一整套注意力与 FFN 权重，所以层数增加会线性叠加主体参数；序列长度只影响位置 embedding 的行数，不影响 Block 的主体矩阵。',
      },
      {
        question: '如果去重后测试 PPL 变高，实验失败了吗？',
        hint: '你在测的是“更容易的重复题”还是“更接近未见数据的题”？',
        answer:
          '不一定。去重后 PPL 变高可能说明原来的低分来自重复记忆，而新评估更接近真实泛化。应该同时报告数据规模、重叠率和分组指标，不能只拿分数高低判断。',
      },
      {
        question: '为什么单 seed 的结果不能直接当作规律？',
        hint: '初始化、数据顺序和采样都有随机性。',
        answer:
          '不同 seed 会产生不同初始化、shuffle 顺序和采样轨迹，短程训练尤其容易波动。至少需要多 seed 重复，报告均值和波动范围，才能把一次运行和稳定规律区分开。',
      },
    ],
    extensions: [
      '选择一个模型参数做单变量实验，并至少跑 2 个 seed，报告均值和范围。',
      '把测试集改成按模板分组留出，重新评估 baseline 和非重叠子集。',
      '设计一个“模型更小但数据更干净”的对照，比较参数量、训练耗时、PPL 和生成质量。',
    ],
    acceptance: [
      {
        id: '8-1',
        label: '实验只改了一个主变量，并写清控制量',
        evidence: '提交实验卡：hypothesis / variable / controls / metric。',
      },
      {
        id: '8-2',
        label: '有 baseline、可复现命令和结果',
        evidence: '保留配置、seed、命令、日志和至少一个指标。',
      },
      {
        id: '8-3',
        label: '结论与证据一致，并写明局限',
        evidence: '至少写出一条数据、计算或随机性方面的限制。',
      },
    ],
  },
];
