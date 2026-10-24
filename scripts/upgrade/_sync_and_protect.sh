#!/bin/bash
# 每次跑 pnpm run sync 后必须执行：恢复 5 门 JSON 源课被回退的内容
cd "D:\Python_Project\knowledge-order" || exit 1
git checkout HEAD -- content-data/courses/excel.json content-data/courses/methodology.json content-data/courses/pandas.json content-data/courses/sql.json content-data/courses/viz.json
echo "protected 5 JSON-source courses restored"
