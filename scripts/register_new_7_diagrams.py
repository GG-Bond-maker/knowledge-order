# -*- coding: utf-8 -*-

# 1. Update DiagramRenderer.tsx
with open('src/components/diagrams/DiagramRenderer.tsx', 'r', encoding='utf-8') as f:
    dr = f.read()

dr_import_target = "  AirflowDbtCosmosDemo,\n} from './DataEngineeringDiagrams';"
if dr_import_target not in dr and "  AirflowDbtCosmosDemo,\r\n} from './DataEngineeringDiagrams';" in dr:
    dr_import_target = "  AirflowDbtCosmosDemo,\r\n} from './DataEngineeringDiagrams';"

dr_import_replacement = """  AirflowDbtCosmosDemo,
  ScdType2Demo,
  DbtTestingDemo,
  SlimCiDemo,
  SemanticLayerDemo,
  DagStructureDemo,
  ExecutorCompareDemo,
  SlaMonitoringDemo,
} from './DataEngineeringDiagrams';"""

dr_kind_target = "  | 'airflow-dbt-cosmos';"
dr_kind_replacement = """  | 'airflow-dbt-cosmos'
  | 'scd-type2'
  | 'dbt-testing'
  | 'slim-ci'
  | 'semantic-layer'
  | 'dag-structure'
  | 'executor-compare'
  | 'sla-monitoring';"""

dr_case_target = "    case 'airflow-dbt-cosmos':\n      return <AirflowDbtCosmosDemo />;"
if dr_case_target not in dr and "    case 'airflow-dbt-cosmos':\r\n      return <AirflowDbtCosmosDemo />;" in dr:
    dr_case_target = "    case 'airflow-dbt-cosmos':\r\n      return <AirflowDbtCosmosDemo />;"

dr_case_replacement = dr_case_target + """
    case 'scd-type2':
      return <ScdType2Demo />;
    case 'dbt-testing':
      return <DbtTestingDemo />;
    case 'slim-ci':
      return <SlimCiDemo />;
    case 'semantic-layer':
      return <SemanticLayerDemo />;
    case 'dag-structure':
      return <DagStructureDemo />;
    case 'executor-compare':
      return <ExecutorCompareDemo />;
    case 'sla-monitoring':
      return <SlaMonitoringDemo />;"""

dr_registered_target = "  'airflow-dbt-cosmos': ['airflow-dbt-cosmos'],"
dr_registered_replacement = dr_registered_target + """
  'scd-type2': ['scd-type2'],
  'dbt-testing': ['dbt-testing'],
  'slim-ci': ['slim-ci'],
  'semantic-layer': ['semantic-layer'],
  'dag-structure': ['dag-structure'],
  'executor-compare': ['executor-compare'],
  'sla-monitoring': ['sla-monitoring'],"""

assert dr_import_target in dr, 'dr_import_target not found'
assert dr_kind_target in dr, 'dr_kind_target not found'
assert dr_case_target in dr, 'dr_case_target not found'
assert dr_registered_target in dr, 'dr_registered_target not found'

dr = dr.replace(dr_import_target, dr_import_replacement, 1)
dr = dr.replace(dr_kind_target, dr_kind_replacement, 1)
dr = dr.replace(dr_case_target, dr_case_replacement, 1)
dr = dr.replace(dr_registered_target, dr_registered_replacement, 1)

with open('src/components/diagrams/DiagramRenderer.tsx', 'w', encoding='utf-8') as f:
    f.write(dr)
print('DiagramRenderer.tsx updated with 7 new diagrams!')

# 2. Update Markdown.tsx
with open('src/components/Markdown.tsx', 'r', encoding='utf-8') as f:
    md = f.read()

md_whitelist_target = "'airflow-dbt-cosmos']"
md_whitelist_replacement = "'airflow-dbt-cosmos', 'scd-type2', 'dbt-testing', 'slim-ci', 'semantic-layer', 'dag-structure', 'executor-compare', 'sla-monitoring']"

md_standalone_target = "  if (tag === 'AirflowDbtCosmosDemo') {\n    return { type: 'diagram', kind: 'airflow-dbt-cosmos', name: 'default' };\n  }"
if md_standalone_target not in md and "  if (tag === 'AirflowDbtCosmosDemo') {\r\n    return { type: 'diagram', kind: 'airflow-dbt-cosmos', name: 'default' };\r\n  }" in md:
    md_standalone_target = "  if (tag === 'AirflowDbtCosmosDemo') {\r\n    return { type: 'diagram', kind: 'airflow-dbt-cosmos', name: 'default' };\r\n  }"

md_new_tags = """
  if (tag === 'ScdType2Demo') {
    return { type: 'diagram', kind: 'scd-type2', name: 'default' };
  }
  if (tag === 'DbtTestingDemo') {
    return { type: 'diagram', kind: 'dbt-testing', name: 'default' };
  }
  if (tag === 'SlimCiDemo') {
    return { type: 'diagram', kind: 'slim-ci', name: 'default' };
  }
  if (tag === 'SemanticLayerDemo') {
    return { type: 'diagram', kind: 'semantic-layer', name: 'default' };
  }
  if (tag === 'DagStructureDemo') {
    return { type: 'diagram', kind: 'dag-structure', name: 'default' };
  }
  if (tag === 'ExecutorCompareDemo') {
    return { type: 'diagram', kind: 'executor-compare', name: 'default' };
  }
  if (tag === 'SlaMonitoringDemo') {
    return { type: 'diagram', kind: 'sla-monitoring', name: 'default' };
  }"""

assert md_whitelist_target in md, 'md_whitelist_target not found'
assert md_standalone_target in md, 'md_standalone_target not found'

md = md.replace(md_whitelist_target, md_whitelist_replacement, 1)
md = md.replace(md_standalone_target, md_standalone_target + md_new_tags, 1)

with open('src/components/Markdown.tsx', 'w', encoding='utf-8') as f:
    f.write(md)
print('Markdown.tsx updated with 7 new diagrams!')
