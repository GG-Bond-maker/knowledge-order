# -*- coding: utf-8 -*-
"""
Build financial-statements.json
"""

import sys
import os
from pathlib import Path

# Ensure generator modules can be imported
sys.path.append(os.path.dirname(__file__))

from common import course, validate_and_save
from finance_part1 import get_chapters_1_to_6
from finance_part2 import get_chapters_7_to_12
from finance_part3 import get_chapters_13_to_18

def main():
    chapters = []
    chapters.extend(get_chapters_1_to_6())
    chapters.extend(get_chapters_7_to_12())
    chapters.extend(get_chapters_13_to_18())

    course_data = course(
        course_id="financial-statements",
        title="财务报表分析：从会计到企业估值",
        subtitle="从权责发生制、三表动态联动建模到法务排雷与 DCF 内在价值估值全景实战",
        description="本课程对标 MIT 15.535《Business Analysis Using Financial Statements》与 MIT 15.501《Introduction to Financial and Managerial Accounting》，融合 OpenStax 经典会计框架与华尔街顶级投行、PE买方机构实战方法论。体系化覆盖商业活动与报表穿透、权责发生制与复式记账、三张财务报表深度解剖与动态勾稽、杜邦分析体系、营运效率与周转天数 CCC、流动性与偿债安全、应计利润与盈余质量、资产减值与潜亏识别、自由现金流 FCF 桥接、合并报表与特殊业务、行业商业模式财务指纹映射、三表动态集成预测建模、相对估值乘数 (PE/PB/EV-EBITDA/SOTP)、贴现现金流估值 (DCF & WACC)、Beneish M-Score 八因子舞弊侦测、Altman Z-Score 财务困境预警以及机构级投资备忘录 (Investment Memo) 撰写。零基础友好，兼具微观会计准则、数学建模与企业估值严谨性。",
        icon="BarChart3",
        color="#059669",
        domain_id="quant",
        prerequisites=["初中四则运算与商业基本常识（无需任何会计或金融先验背景）"],
        target_audience="量化研究员、基本面投资人、二级市场交易员、企业创始人、法务与审计人员及零基础商业爱好者",
        estimated_hours=130,
        chapters=chapters
    )

    output_path = Path(__file__).resolve().parent.parent.parent / "content-data" / "courses" / "financial-statements.json"
    validate_and_save(course_data, str(output_path))
    print(f"Successfully generated financial-statements.json at {output_path}")

if __name__ == "__main__":
    main()
