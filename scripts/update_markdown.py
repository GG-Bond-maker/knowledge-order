import os

path = 'src/components/Markdown.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target_whitelist = "'transformer-arch']"
replacement_whitelist = "'transformer-arch', 'mds-arch', 'kimball-star', 'dbt-layers', 'dbt-materialization', 'incremental-window', 'airflow-arch', 'task-lifecycle', 'xcom-passing', 'trigger-rules', 'data-interval', 'idempotency', 'dynamic-mapping', 'airflow-dbt-cosmos']"

assert target_whitelist in content, 'target_whitelist not found'
content = content.replace(target_whitelist, replacement_whitelist, 1)

target_standalone = "  if (tag === 'StreamSketchDemo') {\n    return { type: 'diagram', kind: 'streamsketch', name: 'default' };\n  }"
if target_standalone not in content and "  if (tag === 'StreamSketchDemo') {\r\n    return { type: 'diagram', kind: 'streamsketch', name: 'default' };\r\n  }" in content:
    target_standalone = "  if (tag === 'StreamSketchDemo') {\r\n    return { type: 'diagram', kind: 'streamsketch', name: 'default' };\r\n  }"

new_tags = """
  if (tag === 'MdsArchDemo') {
    return { type: 'diagram', kind: 'mds-arch', name: 'default' };
  }
  if (tag === 'KimballStarDemo') {
    return { type: 'diagram', kind: 'kimball-star', name: 'default' };
  }
  if (tag === 'DbtLayersDemo') {
    return { type: 'diagram', kind: 'dbt-layers', name: 'default' };
  }
  if (tag === 'DbtMaterializationDemo') {
    return { type: 'diagram', kind: 'dbt-materialization', name: 'default' };
  }
  if (tag === 'IncrementalWindowDemo') {
    return { type: 'diagram', kind: 'incremental-window', name: 'default' };
  }
  if (tag === 'AirflowArchDemo') {
    return { type: 'diagram', kind: 'airflow-arch', name: 'default' };
  }
  if (tag === 'TaskLifecycleDemo') {
    return { type: 'diagram', kind: 'task-lifecycle', name: 'default' };
  }
  if (tag === 'XComPassingDemo') {
    return { type: 'diagram', kind: 'xcom-passing', name: 'default' };
  }
  if (tag === 'TriggerRulesDemo') {
    return { type: 'diagram', kind: 'trigger-rules', name: 'default' };
  }
  if (tag === 'DataIntervalDemo') {
    return { type: 'diagram', kind: 'data-interval', name: 'default' };
  }
  if (tag === 'IdempotencyDemo') {
    return { type: 'diagram', kind: 'idempotency', name: 'default' };
  }
  if (tag === 'DynamicMappingDemo') {
    return { type: 'diagram', kind: 'dynamic-mapping', name: 'default' };
  }
  if (tag === 'AirflowDbtCosmosDemo') {
    return { type: 'diagram', kind: 'airflow-dbt-cosmos', name: 'default' };
  }"""

replacement_standalone = target_standalone + new_tags
assert target_standalone in content, 'target_standalone not found'
content = content.replace(target_standalone, replacement_standalone, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Markdown.tsx updated successfully!')
