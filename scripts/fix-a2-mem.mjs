import { readFileSync, writeFileSync } from 'node:fs';

const p = 'src/content/chapters/llm-a2-extra3.ts';
let t = readFileSync(p, 'utf8');
let n = 0;

function rep(from, to, label) {
  if (t.includes(from)) {
    t = t.replace(from, to);
    n += 1;
    console.log('✓', label);
  } else {
    console.log('✗ 未找到:', label);
  }
}

// c6-e6：7B 用 GiB 计算 = 78.23，不是 84
rep(
  `        expectedOutput: '约 83.82 GB',
        tests: \`m = train_mem_gb(7)
assert 83 < m < 85, f"7B 模型应约 84GB，实际 {m}"
assert train_mem_gb(1) < m, "1B 应小于 7B"
# 1B: (2+2+8)e9 / 1024^3 = 11.18
assert abs(train_mem_gb(1) - 11.18) < 0.1, f"1B 应约 11.18GB，实际 {train_mem_gb(1)}"
# 权重+梯度用 precision_bytes，优化器固定 fp32 两份
assert abs(train_mem_gb(7, 4) - ((7e9*4*2 + 7e9*8)/1024**3)) < 0.1, "fp32 应正确计算"
\`,`,
  `        expectedOutput: '约 78.23 GiB（十进制约 84 GB）',
        tests: \`m = train_mem_gb(7)
assert 77 < m < 80, f"7B 模型应约 78.2GiB（= 84 十进制 GB），实际 {m}"
assert train_mem_gb(1) < m, "1B 应小于 7B"
# 1B: (2+2+8)e9 / 1024^3 = 9.31
assert abs(train_mem_gb(1) - 11.18) < 0.1, f"1B 应约 11.18GiB，实际 {train_mem_gb(1)}"
# 权重+梯度用 precision_bytes，优化器固定 fp32 两份
assert abs(train_mem_gb(7, 4) - ((7e9*4*2 + 7e9*8)/1024**3)) < 0.1, "fp32 应正确计算"
\`,`,
  'c6-e6 期望值修正',
);

// c6-e7：ZeRO 显存同理
rep(
  `        expectedOutput: 'ZeRO-3 在 8 卡下约 10.5 GB',
        tests: \`# 7B, 8 卡
assert abs(zero_mem(7, 8, 0) - 83.82) < 0.2, f"纯 DP 应约 83.8GB，实际 {zero_mem(7,8,0)}"
assert abs(zero_mem(7, 8, 1) - 35.0) < 0.3, f"ZeRO-1 应约 35GB，实际 {zero_mem(7,8,1)}"
assert abs(zero_mem(7, 8, 2) - 22.75) < 0.3, f"ZeRO-2 应约 22.75GB，实际 {zero_mem(7,8,2)}"
assert abs(zero_mem(7, 8, 3) - 10.48) < 0.3, f"ZeRO-3 应约 10.48GB，实际 {zero_mem(7,8,3)}"
# 单调递减
assert zero_mem(7,8,0) > zero_mem(7,8,1) > zero_mem(7,8,2) > zero_mem(7,8,3)
\`,`,
  `        expectedOutput: 'ZeRO-3 在 8 卡下约 9.87 GiB',
        tests: \`# 7B, 8 卡（单位 GiB）
assert abs(zero_mem(7, 8, 0) - 78.23) < 0.3, f"纯 DP 应约 78.2GiB，实际 {zero_mem(7,8,0)}"
assert abs(zero_mem(7, 8, 1) - 32.60) < 0.3, f"ZeRO-1 应约 32.6GiB，实际 {zero_mem(7,8,1)}"
assert abs(zero_mem(7, 8, 2) - 21.19) < 0.3, f"ZeRO-2 应约 21.2GiB，实际 {zero_mem(7,8,2)}"
assert abs(zero_mem(7, 8, 3) - 9.78) < 0.3, f"ZeRO-3 应约 9.8GiB，实际 {zero_mem(7,8,3)}"
# 单调递减
assert zero_mem(7,8,0) > zero_mem(7,8,1) > zero_mem(7,8,2) > zero_mem(7,8,3)
\`,`,
  'c6-e7 期望值修正',
);

writeFileSync(p, t, 'utf8');
console.log(`\n共修正 ${n} 处`);
