#!/usr/bin/env bash
# 量化入门课程章节校验（包装 python 校验器，自动建临时目录）
set -e
cd "$(dirname "$0")/.."
python scratch/validate_chapter.py "$@"
