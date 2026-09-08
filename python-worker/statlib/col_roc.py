"""ROC 曲线：AUC + Bootstrap CI + Youden 阈值（纯计算版）。"""
import numpy as np
from sklearn.metrics import roc_curve, roc_auc_score

METHOD = "roc_curve"


def demo_data(params=None):
    rng = np.random.default_rng(121)
    n_case = params.get("n_case", 60); n_ctrl = params.get("n_ctrl", 60)
    dprime = params.get("dprime", 1.5)
    case = rng.normal(dprime, 1, n_case)
    ctrl = rng.normal(0, 1, n_ctrl)
    return {"case": case.tolist(), "ctrl": ctrl.tolist()}


def _bootstrap_auc(scores, truth, B=2000, seed=0):
    rng = np.random.default_rng(seed)
    n1 = int(truth.sum()); n0 = len(truth) - n1
    idx_pos = np.where(truth == 1)[0]; idx_neg = np.where(truth == 0)[0]
    a = np.empty(B)
    for b in range(B):
        i = rng.choice(idx_pos, n1, replace=True)
        j = rng.choice(idx_neg, n0, replace=True)
        s = np.concatenate([scores[i], scores[j]])
        t = np.concatenate([np.ones(n1), np.zeros(n0)])
        rk = np.argsort(np.argsort(s))
        a[b] = (rk[t == 1].mean() - (n1 - 1) / 2) / n0
    return [float(np.percentile(a, 2.5)), float(np.percentile(a, 97.5))]


def analyze(data, params=None):
    case = np.asarray(data["case"], dtype=float)
    ctrl = np.asarray(data["ctrl"], dtype=float)
    scores = np.concatenate([case, ctrl])
    truth = np.concatenate([np.ones(len(case)), np.zeros(len(ctrl))])

    fpr, tpr, thrs = roc_curve(truth, scores)
    auc = float(roc_auc_score(truth, scores))
    ci = _bootstrap_auc(scores, truth)
    youden = np.argmax(tpr - fpr)
    thr_you = float(thrs[youden])
    sens_you, spec_you = float(tpr[youden]), float(1 - fpr[youden])

    quality = ("excellent" if auc > 0.9 else "good" if auc > 0.8 else
               "moderate" if auc > 0.7 else "poor")
    return {
        "auc": auc, "auc_ci95": ci, "quality": quality,
        "youden_threshold": thr_you, "sensitivity": sens_you, "specificity": spec_you,
        "n_case": int(len(case)), "n_ctrl": int(len(ctrl)),
        "roc_curve": {"fpr": fpr.tolist(), "tpr": tpr.tolist()},
        "interpretation": f"AUC={auc:.3f}（95%CI {ci[0]:.3f}~{ci[1]:.3f}）判别能力{quality}；"
                          f"Youden 阈值 {thr_you:.2f} 处灵敏度 {sens_you:.2f}、特异度 {spec_you:.2f}。",
    }
