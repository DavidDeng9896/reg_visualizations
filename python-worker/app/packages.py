"""Installed scientific packages for Custom Code (must match frontend PYTHON_SCIENTIFIC_PACKAGES)."""

from __future__ import annotations

from importlib import metadata

# Dist names as published on PyPI / importlib.metadata.
SCIENTIFIC_PACKAGES: tuple[str, ...] = (
    "pandas",
    "numpy",
    "scipy",
    "scikit-learn",
    "rdkit",
    "statsmodels",
    "biopython",
    "lmfit",
    "matplotlib",
    "seaborn",
    "kaleido",
    "plotly",
    "pyarrow",
    "openpyxl",
    "pydantic",
)


def installed_packages(names: tuple[str, ...] = SCIENTIFIC_PACKAGES) -> dict[str, str]:
    found: dict[str, str] = {}
    for name in names:
        try:
            found[name] = metadata.version(name)
        except metadata.PackageNotFoundError:
            continue
    return found


def missing_packages(names: tuple[str, ...] = SCIENTIFIC_PACKAGES) -> list[str]:
    have = installed_packages(names)
    return [n for n in names if n not in have]


def health_payload() -> dict:
    packages = installed_packages()
    missing = missing_packages()
    return {
        "ok": len(missing) == 0,
        "packages": packages,
        "missing": missing,
    }


def available_packages_hint() -> str:
    packages = installed_packages()
    if not packages:
        return "当前 Worker 未探测到科学包。"
    listing = ", ".join(f"{k}=={v}" for k, v in packages.items())
    return f"当前可用包：{listing}"
