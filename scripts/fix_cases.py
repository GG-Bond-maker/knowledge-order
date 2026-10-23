# -*- coding: utf-8 -*-

# 1. Update DiagramRenderer.tsx
with open('src/components/diagrams/DiagramRenderer.tsx', 'r', encoding='utf-8') as f:
    dr = f.read()

# Replace in DiagramKind
kind_target = """  | 'alignment'
  | 'attnmath'
  | 'heatmap'
  | 'tarch'"""
if kind_target not in dr:
    kind_target = kind_target.replace('\n', '\r\n')

kind_repl = """  | 'alignment'
  | 'bahdanau'
  | 'attnheatmap'
  | 'tarch'"""
if '\r\n' in kind_target:
    kind_repl = kind_repl.replace('\n', '\r\n')

assert kind_target in dr, 'kind_target not found in DiagramRenderer'
dr = dr.replace(kind_target, kind_repl, 1)

# Replace in switch
switch_target = """    case 'alignment':
      return <AlignmentDemo />;
    case 'bahdanau-math':
      return <BahdanauMathDemo />;
    case 'attention-heatmap-demo':
      return <AttentionHeatmapDemo />;"""
if switch_target not in dr:
    switch_target = switch_target.replace('\n', '\r\n')

switch_repl = """    case 'alignment':
      return <AlignmentDemo />;
    case 'bahdanau':
      return <BahdanauMathDemo />;
    case 'attnheatmap':
      return <AttentionHeatmapDemo />;"""
if '\r\n' in switch_target:
    switch_repl = switch_repl.replace('\n', '\r\n')

assert switch_target in dr, 'switch_target not found in DiagramRenderer'
dr = dr.replace(switch_target, switch_repl, 1)

with open('src/components/diagrams/DiagramRenderer.tsx', 'w', encoding='utf-8') as f:
    f.write(dr)

print('DiagramRenderer fixed!')

# 2. Update Markdown.tsx
with open('src/components/Markdown.tsx', 'r', encoding='utf-8') as f:
    md = f.read()

# Add to whitelist
wl_target = "'sla-monitoring']"
wl_repl = "'sla-monitoring', 'bahdanau', 'attnheatmap']"
assert wl_target in md, 'wl_target not found in Markdown'
md = md.replace(wl_target, wl_repl, 1)

# Update AttentionHeatmapDemo
hm_target = """  if (tag === 'AttentionHeatmapDemo') {
    return { type: 'diagram', kind: 'heatmap', name: 'default' };
  }"""
if hm_target not in md:
    hm_target = hm_target.replace('\n', '\r\n')

hm_repl = """  if (tag === 'AttentionHeatmapDemo') {
    return { type: 'diagram', kind: 'attnheatmap', name: 'default' };
  }
  if (tag === 'BahdanauMathDemo') {
    return { type: 'diagram', kind: 'bahdanau', name: 'default' };
  }"""
if '\r\n' in hm_target:
    hm_repl = hm_repl.replace('\n', '\r\n')

assert hm_target in md, 'hm_target not found in Markdown'
md = md.replace(hm_target, hm_repl, 1)

with open('src/components/Markdown.tsx', 'w', encoding='utf-8') as f:
    f.write(md)

print('Markdown.tsx fixed!')
