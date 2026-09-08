"""页面包：导入所有分析页面模块（Dash Pages 自动发现）。

NAV 定义了侧边栏导航结构 (category, [(name, path), ...])。
"""
# 首页
from . import home

# XY 分析（第一部分，10 个）
from . import xy_nonlinear
from . import xy_linear
from . import xy_logistic
from . import xy_spline
from . import xy_smooth
from . import xy_auc
from . import xy_deming
from . import xy_rowstats
from . import xy_correlation
from . import xy_interpolate

# 列分析（第二部分，10 个）
from . import col_ttests
from . import col_anova
from . import col_onesample
from . import col_descriptive
from . import col_normality
from . import col_frequency
from . import col_roc
from . import col_blandaltman
from . import col_outliers
from . import col_stackpvals

NAV = [
    ("XY 分析", [
        ("非线性回归", "/xy/nonlinear"),
        ("简单线性回归", "/xy/linear"),
        ("简单逻辑回归", "/xy/logistic"),
        ("样条 / LOWESS", "/xy/spline"),
        ("平滑·求导·积分", "/xy/smooth"),
        ("曲线下面积 AUC", "/xy/auc"),
        ("Deming 回归", "/xy/deming"),
        ("行统计", "/xy/rowstats"),
        ("相关分析", "/xy/correlation"),
        ("标准曲线插值", "/xy/interpolate"),
    ]),
    ("列分析", [
        ("t 检验", "/col/ttests"),
        ("单因素 ANOVA", "/col/anova"),
        ("单样本检验", "/col/onesample"),
        ("描述统计", "/col/descriptive"),
        ("正态性检验", "/col/normality"),
        ("频数分布", "/col/frequency"),
        ("ROC 曲线", "/col/roc"),
        ("Bland-Altman", "/col/blandaltman"),
        ("离群点识别", "/col/outliers"),
        ("P 值堆栈", "/col/stackpvals"),
    ]),
]
