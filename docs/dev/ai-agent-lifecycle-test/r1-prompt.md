请阅读附件《数据生命周期》文档，并**只用平台工具**完成 hlx69 抗体亲和力改造第 1 轮（r1）的模拟数据生成与分析。不要让我粘贴 CSV，不要预置表，不要只口头描述数据。

## 项目口径
- 项目号：hlx69；目标：至少一个 Candidate 的 BLI Kd 相对 WT 提升 ≥10 倍则达标，否则进入 r2。
- WT 可测，走常规双价抗体，不启用单价策略。
- WT 重链：EVQLVESGGGLVQPGGSLRLSCAASGFTFSSYAMSWVRQAPGKGLEWVSAISGSGGSTYYADSVKGRFTISRDNSKNTLYLQMNSLRAEDTAVYYCAKVSYLSTASSLDYWGQGTLVTVSS
- WT 轻链：DIQMTQSPSSLSASVGDRVTITCRASQSISSYLNWYQQKPGKAPKLLIYAASSLQSGVPSRFSGSGSGTDFTLTISSLQPEDFATYYCQQSYSTPLTFGGGTKVEIK
- WT 参考 Kd 请你自行设定一个合理单浓度 BLI 值（例如 8–15 nM 量级），并在表中明确标出 WT 行。

## 必须落表的产物
1. 创建分析「hlx69 亲和力改造」。
2. **第 1 轮算法打分宽表**（核心）：单点突变穷举，**行数必须 >1000**（含 WT 对照）。字段至少包括：
   - chain（H/L）、position、wt_aa、mut_aa、mutation（如 H:Q1A）
   - ProteinMPNN_score、ESMIF_log_likelihood、FoldX_ddg、flexddg
   - 以及各算法相对 WT 的比较标记
   - 序列 motif 相关：cys_count、has_nglyc（NxS/T 且 x≠P）
   - n_mutations（单点=1）
   请用 Custom Code **程序化生成**大表，不要尝试在 import_csv_text 里粘贴上千行。
3. 按文档筛选规则过滤：
   - ProteinMPNN score < WT
   - ESMIF log_likelihood > WT
   - FoldX < -1
   - flexddg < -1
   - C 的总数必须为偶数；不能包含 NxS/T（x 为除 P 外任意氨基酸）
   - 每个候选突变位点数量上限 3（本轮单点因此为 1）
4. 送检名单约 60–70 条：
   - r1 以实验员 B（ProteinMPNN / ESMIF 全序列穷举）为主，实验员 A（FoldX / flexddg 界面突变）约 25 条
   - 各算法 topN + 多算法同时过阈值但不在 topN 的 Vote
   - 命名：`hlx69-r1-aismxx`，按「先重链后轻链 → 突变位点编号 → 突变后氨基酸 A-Z」排序
5. 百英表达结果表：送检序列的表达量、等电点、理论分子量等。
6. 通用 BLI 单浓度结果表：Kd（nM）、可含少量重复批次；代表值取平均；若同一 sequence 两次差异 >3 倍必须提醒。sequence 作为唯一标识。
7. 汇总判断是否达到 10 倍提升；出筛选分布图、Kd 对比图，必要时建看板。

## 约束
- 先 submit_plan，再逐步执行并 mark_step_done。
- 复杂生成/筛选优先 delegate_code_worker / delegate_analysis_worker。
- 所有数据必须真实写入分析表；最后用 list_tables 核对算法表行数 >1000，并在回复里报告每张表的行数与送检命名样例。
