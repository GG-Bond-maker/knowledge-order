with open('src/components/diagrams/DataEngineeringDiagrams.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = '<code>{{ "source(\'source_name\', \'table_name\')" }}</code>'
replacement = "<code>{'{{ source(\"source_name\", \"table_name\") }}'}</code>"
assert target in text, 'target not found'
text = text.replace(target, replacement, 1)

with open('src/components/diagrams/DataEngineeringDiagrams.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print('Fixed line 239!')
