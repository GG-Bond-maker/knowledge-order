with open('src/components/diagrams/DiagramRenderer.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = """    case 'alignment':
      return <AlignmentDemo />;
    case 'attnmath':
      return <BahdanauMathDemo />;
    case 'heatmap':
      return <AttentionHeatmapDemo />;"""

if target not in text:
    target = target.replace('\n', '\r\n')

replacement = """    case 'alignment':
      return <AlignmentDemo />;
    case 'bahdanau-math':
      return <BahdanauMathDemo />;
    case 'attention-heatmap-demo':
      return <AttentionHeatmapDemo />;"""
if '\r\n' in target:
    replacement = replacement.replace('\n', '\r\n')

assert target in text, 'target not found'
text = text.replace(target, replacement, 1)

with open('src/components/diagrams/DiagramRenderer.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('Cleaned up duplicate cases!')
