# -*- coding: utf-8 -*-
"""
Build ml-deep-learning.json
"""

import sys
import os

sys.path.append(os.path.dirname(__file__))

from common import course, validate_and_save
from ml_dl_ch1 import get_chapter_1
from ml_dl_ch2 import get_chapter_2
from ml_dl_ch3 import get_chapter_3
from ml_dl_ch4 import get_chapter_4
from ml_dl_ch5 import get_chapter_5
from ml_dl_ch6 import get_chapter_6

def main():
    chapters = [
        get_chapter_1(),
        get_chapter_2(),
        get_chapter_3(),
        get_chapter_4(),
        get_chapter_5(),
        get_chapter_6(),
    ]

    course_data = course(
        course_id="ml-deep-learning",
        title="深度学习基础：从神经元、反向传播到 CNN/RNN/PyTorch",
        subtitle="人工神经网络、反向传播矩阵求导、优化器演进、卷积视觉、循环时序与 PyTorch 核心",
        description="从数学推导到工程实现，全面建立现代深度学习的第一性原理认知体系。深入 McCulloch-Pitts 与 Rosenblatt 感知机、XOR 线性不可分危机、多层感知机（MLP）万能近似定理与非线性激活函数谱系（Sigmoid/ReLU/GELU）；严密推导反向传播（Backpropagation）四大矩阵方程；系统梳理从 SGD、Momentum、AdaGrad、RMSprop 到现代大模型标配 AdamW 解耦权重衰减的优化器进化全景；掌握 He/Xavier 初始化、BatchNorm 与 LayerNorm 训练稳定性工程；精通 CNN 空间等变性、感受野、ResNet 残差超导数学证明；掌握序列循环网络 RNN、LSTM 三重门控超导通道与 GRU；全面掌握 PyTorch 底层张量 Strides 机制、Autograd 动态计算图与工业级生产训练双循环 SOP。全套自包含 Python 算法实现，奠定通往 Transformer 与大语言模型的坚实桥梁。",
        icon="🧬",
        color="#8b5cf6",
        domain_id="ml",
        prerequisites=["ml-math", "ml-python-data", "ml-foundations", "ml-classical-algorithms"],
        target_audience="希望彻底掌握深度神经网络数学推导、反向传播矩阵微分、优化器底层原理与 PyTorch 生产级开发的算法工程师与研究者",
        estimated_hours=24,
        chapters=chapters,
        series_id="ml-deep-learning",
    )

    out_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "content-data", "courses", "ml-deep-learning.json"))
    validate_and_save(course_data, out_path)

if __name__ == "__main__":
    main()
