# -*- coding: utf-8 -*-
"""
Runnable Python Demos and Programming Exercises for Causal Inference (causal-inference).
"""

CAUSAL_CODE = {
    "demos": {
        "causal-inference-l1-1": {
            "title": "因果推断核心：潜在结果 (Potential Outcomes) 与反事实模拟",
            "lang": "python",
            "code": """import pandas as pd
import numpy as np

# 模拟 5 位用户的潜在结果框架 (Rubin Causal Model)
# Y1: 接受干预 (发 10 元优惠券) 的GMV，Y0: 不接受干预 (不发券) 的GMV
np.random.seed(42)
users = pd.DataFrame({
    'user_id': ['U1', 'U2', 'U3', 'U4', 'U5'],
    'Y0': [50, 80, 120, 60, 90],   # 未干预潜在结果
    'Y1': [65, 85, 150, 75, 95],   # 干预后潜在结果
})
# 个体因果效应 (Individual Treatment Effect: ITE = Y1 - Y0)
users['ITE'] = users['Y1'] - users['Y0']

print("=== 上帝视角 (两平行宇宙完全可见) ===")
print(users)
true_ate = users['ITE'].mean()
print(f"\\n真实全员平均因果效应 (True ATE): ¥{true_ate:.2f}")

print("\\n⚠️ 因果推断根本难题：现实中每个用户只能观察到 Y1 或 Y0 中的一个！")
print("随机对照试验 (RCT) 确保 D 独立于 (Y0, Y1)，从而可用样本均值无偏估计 ATE。")
"""
        },
        "causal-inference-l8-1": {
            "title": "双重差分 (Difference-in-Differences, DID) 2x2 计算器",
            "lang": "python",
            "code": """import numpy as np

# DID 2x2 面板模拟：政策前 (Pre) 与政策后 (Post)
# 对照组未受政策干预，处理组在 Post 期受到政策干预
#          Pre       Post
# 处理组    Y_T_pre   Y_T_post
# 对照组    Y_C_pre   Y_C_post

y_c_pre = 100.0   # 对照组政策前
y_c_post = 115.0  # 对照组政策后 (自然增长 15)
y_t_pre = 120.0   # 处理组政策前
y_t_post = 150.0  # 处理组政策后 (增长 30)

diff_treat = y_t_post - y_t_pre # 处理组总变化: 30
diff_ctrl = y_c_post - y_c_pre   # 对照组总变化 (时间趋势): 15

did_effect = diff_treat - diff_ctrl # 净因果效应: 30 - 15 = 15

print("=== 双重差分 (DID) 效果分解 ===")
print(f"处理组总变化: {diff_treat:.1f}")
print(f"对照组自然时间趋势变化: {diff_ctrl:.1f}")
print(f"剔除时间趋势后的净政策因果效应 (DID ATE): {did_effect:.1f}")
print("✓ DID 核心假设：平行趋势假设 (Parallel Trends Assumption)！")
"""
        }
    },
    "exercises": [
        {
            "id": "causal-c1-code-1",
            "chapter_id": "causal-inference-c1",
            "type": "code",
            "difficulty": 2,
            "question": "【编程实战】RCT 试验下的平均因果效应 (ATE) 计算：编写函数 `estimate_ate_rct(df, treatment_col='D', outcome_col='Y')`。\n\n根据实验组与对照组样本均值差值估算 ATE：\n$$\\widehat{ATE} = \\bar{Y}_1 - \\bar{Y}_0$$",
            "starterCode": """import pandas as pd

def estimate_ate_rct(df: pd.DataFrame, treatment_col: str = 'D', outcome_col: str = 'Y') -> float:
    \"\"\"估算随机对照试验的平均处理效应 ATE\"\"\"
    ___
""",
            "setupCode": "",
            "expectedOutput": "返回 ATE 浮点数值",
            "answer": """import pandas as pd

def estimate_ate_rct(df: pd.DataFrame, treatment_col: str = 'D', outcome_col: str = 'Y') -> float:
    mean_treat = df[df[treatment_col] == 1][outcome_col].mean()
    mean_ctrl = df[df[treatment_col] == 0][outcome_col].mean()
    return float(mean_treat - mean_ctrl)
""",
            "tests": """import pandas as pd
df_test = pd.DataFrame({
    'D': [1, 1, 1, 0, 0, 0],
    'Y': [10.0, 12.0, 14.0, 5.0, 7.0, 6.0]
})
ate = estimate_ate_rct(df_test)
assert round(ate, 2) == 6.0, f"计算 ATE 有误: {ate}"
""",
            "explanation": "在完全随机化分配（RCT）下，选择性偏误为零，直接比较两组观测均值即为 ATE 的无偏估计量。",
            "tags": ["ATE", "RCT", "潜在结果"]
        },
        {
            "id": "causal-c8-code-1",
            "chapter_id": "causal-inference-c8",
            "type": "code",
            "difficulty": 2,
            "question": "【编程实战】双重差分 (DID) 2x2 估计量：编写函数 `calc_did_estimator(y_t_pre, y_t_post, y_c_pre, y_c_post)`。\n\n计算 DID 估计值：\n$$\\hat{\\tau}_{DID} = (\\bar{Y}_{T,post} - \\bar{Y}_{T,pre}) - (\\bar{Y}_{C,post} - \\bar{Y}_{C,pre})$$",
            "starterCode": """def calc_did_estimator(y_t_pre: float, y_t_post: float, y_c_pre: float, y_c_post: float) -> float:
    \"\"\"计算 2x2 DID 净因果效应\"\"\"
    ___
""",
            "setupCode": "",
            "expectedOutput": "返回 DID 因果效应浮点数",
            "answer": """def calc_did_estimator(y_t_pre: float, y_t_post: float, y_c_pre: float, y_c_post: float) -> float:
    return float((y_t_post - y_t_pre) - (y_c_post - y_c_pre))
""",
            "tests": """effect = calc_did_estimator(100.0, 130.0, 80.0, 95.0)
assert effect == 15.0, f"DID 计算有误: {effect}"
""",
            "explanation": "DID 通过在时间维度做一次差分消灭个体固定效应，在组别维度做二次差分消灭共时性时间趋势冲击。",
            "tags": ["DID", "双重差分", "平行趋势"]
        }
    ]
}
