"""statlib 全量验证：20 个方法 run() 全部可执行、结果可 JSON 序列化。

用法: .venv/Scripts/python.exe statlib_smoke_test.py
"""
import json

import statlib


def main():
    methods = statlib.available()
    n = len(methods)
    fails = 0
    for m in methods:
        name = m["method"]
        try:
            res = statlib.run(name)
            json.dumps(res)  # 可序列化
            assert "stats" in res and "interpretation" in res["stats"]
            print(f"OK   {name:30s} → {res['stats'].get('interpretation', '')[:50]}")
        except Exception as e:
            fails += 1
            print(f"FAIL {name:30s} → {e!r}")
    print("-" * 60)
    print(f"statlib v{statlib.__version__}：{n} 个方法，{n - fails} 通过 / {fails} 失败")
    return 1 if fails else 0


if __name__ == "__main__":
    raise SystemExit(main())
