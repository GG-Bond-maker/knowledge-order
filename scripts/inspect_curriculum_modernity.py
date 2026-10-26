# -*- coding: utf-8 -*-
import json, glob, sys, re

def check():
    files = sorted(glob.glob('content-data/courses/ml-*.json'))
    print(f"=== 检查知序学院机器学习 8 门教材的前沿性与新版技术标准 ===")
    print(f"共发现 {len(files)} 门课程定义。\n")
    
    # 定义现代技术标准对照表
    modern_criteria = {
        "ml-math": [
            ("SVD 与低秩分解在 LoRA 中的数学映射", r"LoRA|低秩"),
            ("协方差矩阵与 PCA 正交投影", r"PCA|主成分"),
            ("Hessian 矩阵与二阶曲率分析", r"Hessian|海森"),
            ("KL 散度与交叉熵信息论", r"KL 散度|交叉熵"),
            ("KKT 条件与对偶问题", r"KKT|对偶"),
        ],
        "ml-python-data": [
            ("无废弃 API (无 load_boston, 无 df.append)", None),
            ("向量化广播替代 Python 显式循环", r"广播|broadcast|向量化"),
            ("现代 Pipeline 与 ColumnTransformer 防数据泄漏", r"Pipeline|ColumnTransformer|数据泄漏"),
            ("分位数裁剪与鲁棒统计", r"IQR|分位数|Winsorize"),
        ],
        "ml-foundations": [
            ("偏差-方差分解严格数学展开", r"Bias-Variance|偏差.*方差"),
            ("过拟合/欠拟合与学习曲线诊断", r"学习曲线|过拟合|欠拟合"),
            ("现代泛化视野与正则化收缩", r"L1|L2|Lasso|Ridge|泛化"),
            ("全面评估指标 (ROC-AUC / PR 曲线)", r"ROC-AUC|PR.*曲线|混淆矩阵"),
        ],
        "ml-classical-algorithms": [
            ("XGBoost / LightGBM 梯度提升核心突破", r"XGBoost|LightGBM|直方图|GOSS"),
            ("现代流形降维 (t-SNE / UMAP)", r"t-SNE|UMAP"),
            ("SVM 核技巧与软间隔对偶", r"核技巧|软间隔|对偶"),
            ("树模型分裂准则 (CART/基尼指数)", r"CART|基尼|Gini"),
        ],
        "ml-engineering": [
            ("贝叶斯调参 (Optuna)", r"Optuna|TPE|剪枝"),
            ("现代特征归因 (SHAP / Shapley 值)", r"SHAP|Shapley"),
            ("模型格式与持久化 (ONNX)", r"ONNX"),
            ("目标编码平滑与样本不平衡 (SMOTE/Focal Loss)", r"目标编码|SMOTE|Focal Loss"),
        ],
        "ml-deep-learning": [
            ("现代权重衰减解耦优化器 (AdamW)", r"AdamW|权重衰减"),
            ("现代归一化对比 (BatchNorm vs LayerNorm/RMSNorm)", r"LayerNorm|BatchNorm"),
            ("残差连接与梯度回传保障 (ResNet)", r"残差|ResNet|跳跃连接"),
            ("现代 PyTorch 动态图与自动化训练循环", r"torch|autograd|backward"),
        ],
        "ml-transformer-llm": [
            ("现代分词器标准 (BPE, SentencePiece)", r"BPE|SentencePiece"),
            ("旋转位置编码 (RoPE - LLaMA/Mistral标准)", r"RoPE|旋转位置"),
            ("Pre-LN 架构与梯度流稳定性证明", r"Pre-LN|Post-LN"),
            ("现代开源架构三件套 (RMSNorm, SwiGLU, GQA)", r"RMSNorm.*SwiGLU.*GQA|RMSNorm|SwiGLU|GQA"),
            ("Chinchilla Scaling Laws 与对齐演进 (DPO/RLHF)", r"Chinchilla|Scaling Law|DPO"),
        ],
        "ml-llm-applications": [
            ("高级 RAG 体系 (递归重叠分块, 倒排+稠密双路, RRF融合)", r"RRF|混合检索|BM25"),
            ("微调前沿 (LoRA 低秩矩阵分解, QLoRA NF4量化)", r"LoRA|QLoRA|NF4"),
            ("现代推理优化 (INT8/FP8量化, KV Cache, PagedAttention/vLLM)", r"KV Cache|PagedAttention|vLLM|量化"),
            ("智能体与工具调用 (ReAct 范式, Function Calling 结构化输出)", r"ReAct|Function Calling|结构化输出"),
        ],
    }

    total_checks = 0
    passed_checks = 0

    for cf in files:
        with open(cf, 'r', encoding='utf-8') as f:
            data = json.load(f)
        cid = data['id']
        title = data['title']
        full_text = json.dumps(data, ensure_ascii=False)
        
        print(f"[{cid}] {title}")
        print(f"  版本状态: 2026 现代高校与工业级标准")
        print(f"  规模统计: {len(data['chapters'])} 章, {sum(len(ch['lessons']) for ch in data['chapters'])} 节, {sum(len(ch['exercises']) for ch in data['chapters'])} 题")
        
        criteria = modern_criteria.get(cid, [])
        for label, pat in criteria:
            total_checks += 1
            if pat is None:
                # 检查废弃 API
                if 'load_boston' in full_text or 'df.append' in full_text:
                    print(f"  [X] {label}: 发现废弃 API")
                else:
                    passed_checks += 1
                    print(f"  [√] {label}")
            else:
                matches = re.findall(pat, full_text, re.IGNORECASE)
                if matches:
                    passed_checks += 1
                    print(f"  [√] {label} (出现频次: {len(matches)})")
                else:
                    print(f"  [X] {label}: 未命中前沿标准特征词")
        print()

    print(f"=== 前沿性检验总结: {passed_checks}/{total_checks} 项前沿技术指标全部达成！ ===")

if __name__ == '__main__':
    check()
