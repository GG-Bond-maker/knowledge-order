import os

path = 'src/components/diagrams/DiagramRenderer.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

import_target = "import { ImputeStrategyDemo, NormalizationDemo, FPTreeDemo, DBSCANDemo, CollaborativeFilteringDemo, StreamSketchDemo } from './MiningExtraDiagrams';"
import_replacement = import_target + """
import {
  MdsArchDemo,
  KimballStarDemo,
  DbtLayersDemo,
  DbtMaterializationDemo,
  IncrementalWindowDemo,
  AirflowArchDemo,
  TaskLifecycleDemo,
  XComPassingDemo,
  TriggerRulesDemo,
  DataIntervalDemo,
  IdempotencyDemo,
  DynamicMappingDemo,
  AirflowDbtCosmosDemo,
} from './DataEngineeringDiagrams';"""

kind_target = "  | 'streamsketch';"
kind_replacement = """  | 'streamsketch'
  | 'mds-arch'
  | 'kimball-star'
  | 'dbt-layers'
  | 'dbt-materialization'
  | 'incremental-window'
  | 'airflow-arch'
  | 'task-lifecycle'
  | 'xcom-passing'
  | 'trigger-rules'
  | 'data-interval'
  | 'idempotency'
  | 'dynamic-mapping'
  | 'airflow-dbt-cosmos';"""

case_target = "    case 'streamsketch':\n      return <StreamSketchDemo />;"
if case_target not in content and "    case 'streamsketch':\r\n      return <StreamSketchDemo />;" in content:
    case_target = "    case 'streamsketch':\r\n      return <StreamSketchDemo />;"

case_replacement = case_target + """
    case 'mds-arch':
      return <MdsArchDemo />;
    case 'kimball-star':
      return <KimballStarDemo />;
    case 'dbt-layers':
      return <DbtLayersDemo />;
    case 'dbt-materialization':
      return <DbtMaterializationDemo />;
    case 'incremental-window':
      return <IncrementalWindowDemo />;
    case 'airflow-arch':
      return <AirflowArchDemo />;
    case 'task-lifecycle':
      return <TaskLifecycleDemo />;
    case 'xcom-passing':
      return <XComPassingDemo />;
    case 'trigger-rules':
      return <TriggerRulesDemo />;
    case 'data-interval':
      return <DataIntervalDemo />;
    case 'idempotency':
      return <IdempotencyDemo />;
    case 'dynamic-mapping':
      return <DynamicMappingDemo />;
    case 'airflow-dbt-cosmos':
      return <AirflowDbtCosmosDemo />;"""

registered_target = "  'transformer-arch': ['transformer-arch'],"
registered_replacement = registered_target + """
  'mds-arch': ['mds-arch'],
  'kimball-star': ['kimball-star'],
  'dbt-layers': ['dbt-layers'],
  'dbt-materialization': ['dbt-materialization'],
  'incremental-window': ['incremental-window'],
  'airflow-arch': ['airflow-arch'],
  'task-lifecycle': ['task-lifecycle'],
  'xcom-passing': ['xcom-passing'],
  'trigger-rules': ['trigger-rules'],
  'data-interval': ['data-interval'],
  'idempotency': ['idempotency'],
  'dynamic-mapping': ['dynamic-mapping'],
  'airflow-dbt-cosmos': ['airflow-dbt-cosmos'],"""

assert import_target in content, 'import_target not found'
assert kind_target in content, 'kind_target not found'
assert case_target in content, 'case_target not found'
assert registered_target in content, 'registered_target not found'

content = content.replace(import_target, import_replacement, 1)
content = content.replace(kind_target, kind_replacement, 1)
content = content.replace(case_target, case_replacement, 1)
content = content.replace(registered_target, registered_replacement, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('DiagramRenderer.tsx updated successfully!')
