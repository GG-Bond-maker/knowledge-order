# -*- coding: utf-8 -*-
"""
Runnable Python Demos and Programming Exercises for Financial Statement Analysis (financial-statements).
"""

FINANCE_CODE = {
    "demos": {
        "finance-l1-1": {
            "title": "杜邦分析法 (DuPont Analysis) 三因子 ROE 深度拆解",
            "lang": "python",
            "code": """# 杜邦三因子拆解：ROE = 净利率 × 资产周转率 × 权益乘数
def dupont_analysis(net_income, revenue, total_assets, total_equity):
    profit_margin = net_income / revenue              # 销售净利率 (盈利能力)
    asset_turnover = revenue / total_assets           # 总资产周转率 (营运效率)
    equity_multiplier = total_assets / total_equity   # 权益乘数 (财务杠杆)
    roe = profit_margin * asset_turnover * equity_multiplier
    
    print("=== 杜邦分析三因子分解 ===")
    print(f"1. 销售净利率 (Profit Margin):    {profit_margin * 100:.2f}%")
    print(f"2. 总资产周转率 (Asset Turnover): {asset_turnover:.2f} 次/年")
    print(f"3. 权益乘数 (Financial Leverage): {equity_multiplier:.2f} 倍")
    print(f"\\n➔ 净资产收益率 (ROE):             {roe * 100:.2f}%")
    return roe

# 模拟某高周转零售企业 (薄利多销 + 高周转)
dupont_analysis(net_income=5000, revenue=100000, total_assets=50000, total_equity=25000)
"""
        },
        "finance-l15-1": {
            "title": "现金流折现模型 (DCF) 企业内在价值估算",
            "lang": "python",
            "code": """# DCF 自由现金流折现模型模拟
def dcf_valuation(projected_fcff: list, wacc: float, terminal_growth: float):
    \"\"\"
    projected_fcff: 未来 5 年预期自由现金流 (亿元)
    wacc: 加权平均资本成本
    terminal_growth: 永续年增长率
    \"\"\"
    pv_explicit = 0.0
    for t, cf in enumerate(projected_fcff, start=1):
        pv_explicit += cf / ((1.0 + wacc) ** t)
    
    # 永续终值 (Terminal Value) 戈登增长模型
    cf_final = projected_fcff[-1]
    terminal_value = (cf_final * (1.0 + terminal_growth)) / (wacc - terminal_growth)
    pv_terminal = terminal_value / ((1.0 + wacc) ** len(projected_fcff))
    
    enterprise_value = pv_explicit + pv_terminal
    print("=== DCF 估值分解 (亿元) ===")
    print(f"明确预测期现值 (PV of Explicit FCF): ¥{pv_explicit:.2f}")
    print(f"永续终值现值 (PV of Terminal Value): ¥{pv_terminal:.2f} (占比: {pv_terminal/enterprise_value*100:.1f}%)")
    print(f"企业内在价值 (Enterprise Value):     ¥{enterprise_value:.2f}")
    return enterprise_value

# 预测未来 5 年现金流: 10亿, 12亿, 15亿, 18亿, 20亿；WACC=9%, 永续增长率=2.5%
dcf_valuation([10.0, 12.0, 15.0, 18.0, 20.0], wacc=0.09, terminal_growth=0.025)
"""
        }
    },
    "exercises": [
        {
            "id": "finance-c1-code-1",
            "chapter_id": "finance-c1",
            "type": "code",
            "difficulty": 2,
            "question": "【编程实战】杜邦分析法三因子分解：编写函数 `calc_dupont_roe(net_income, revenue, total_assets, total_equity)`。\n\n返回字典包含：\n- `'profit_margin'`: 销售净利率 (`net_income / revenue`)\n- `'asset_turnover'`: 资产周转率 (`revenue / total_assets`)\n- `'equity_multiplier'`: 权益乘数 (`total_assets / total_equity`)\n- `'roe'`: 净资产收益率三项相乘",
            "starterCode": """def calc_dupont_roe(net_income: float, revenue: float, total_assets: float, total_equity: float) -> dict:
    \"\"\"杜邦三因子拆解计算器\"\"\"
    ___
""",
            "setupCode": "",
            "expectedOutput": "返回包含 4 个比率指标的字典",
            "answer": """def calc_dupont_roe(net_income: float, revenue: float, total_assets: float, total_equity: float) -> dict:
    pm = net_income / revenue
    at = revenue / total_assets
    em = total_assets / total_equity
    roe = pm * at * em
    return {
        'profit_margin': pm,
        'asset_turnover': at,
        'equity_multiplier': em,
        'roe': roe
    }
""",
            "tests": """res = calc_dupont_roe(100.0, 1000.0, 2000.0, 500.0)
assert round(res['profit_margin'], 3) == 0.1
assert round(res['asset_turnover'], 3) == 0.5
assert round(res['equity_multiplier'], 3) == 4.0
assert round(res['roe'], 3) == 0.2
""",
            "explanation": "杜邦分析法将股东回报率清晰归因到产品盈利能力（净利率）、资产运营效率（周转率）与财务杠杆（权益乘数）三个维度。",
            "tags": ["杜邦分析", "ROE", "财务比率"]
        },
        {
            "id": "finance-c15-code-1",
            "chapter_id": "finance-c15",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】企业估值 DCF 明确预测期折现：编写函数 `calc_explicit_dcf_pv(fcf_list, wacc)`。\n\n计算折现公式：\n$$PV = \\sum_{t=1}^{N} \\frac{FCF_t}{(1 + WACC)^t}$$",
            "starterCode": """def calc_explicit_dcf_pv(fcf_list: list, wacc: float) -> float:
    \"\"\"计算预测期现金流现值求和\"\"\"
    ___
""",
            "setupCode": "",
            "expectedOutput": "返回现值和浮点数 (保留 2 位小数)",
            "answer": """def calc_explicit_dcf_pv(fcf_list: list, wacc: float) -> float:
    pv = sum(cf / ((1.0 + wacc) ** t) for t, cf in enumerate(fcf_list, start=1))
    return round(pv, 2)
""",
            "tests": """cf = [100.0, 100.0]
# 100 / 1.1 + 100 / 1.21 = 90.909 + 82.645 = 173.55
assert calc_explicit_dcf_pv(cf, 0.1) == 173.55
""",
            "explanation": "DCF 现值计算体现了货币的时间价值，是公司基本面估值的核心数学底座。",
            "tags": ["DCF", "企业估值", "现金流折现"]
        }
    ]
}
