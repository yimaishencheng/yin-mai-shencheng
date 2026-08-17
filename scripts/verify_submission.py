#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Validate that the project is safe to submit as an anonymous entry."""

from __future__ import annotations

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DATA = ROOT / "public" / "data"
SRC_DATA = ROOT / "src" / "data"

EXCLUDED_DIRS = {
    ".git",
    "node_modules",
    ".npm-cache",
    "data",
    "dist",
    "submission",
    "__pycache__",
    ".codex",
}
EXCLUDED_FILES = {
    ROOT / "scripts" / "verify_submission.py",
    ROOT / "scripts" / "prepare_submission.ps1",
    ROOT / ".env",
    ROOT / ".env.oss",
    ROOT / ".env.oss.example",
}
SENSITIVE_PATTERNS = [
    "ruxain",
    "maorunhao",
    "239177669",
    "C:\\Users\\Lenovo",
    "C:/Users/Lenovo",
]
TEXT_EXTENSIONS = {
    ".py",
    ".ts",
    ".tsx",
    ".js",
    ".mjs",
    ".json",
    ".md",
    ".html",
    ".css",
    ".ps1",
    ".bat",
    ".txt",
    ".example",
}


def fail(message: str) -> None:
    print(f"[FAIL] {message}")
    raise SystemExit(1)


def check_sensitive_strings() -> None:
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        if path in EXCLUDED_FILES:
            continue
        relative_parts = path.relative_to(ROOT).parts
        if any(part in EXCLUDED_DIRS for part in relative_parts):
            continue
        if path.suffix.lower() not in TEXT_EXTENSIONS and path.name not in TEXT_EXTENSIONS:
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for pattern in SENSITIVE_PATTERNS:
            if pattern in text:
                fail(f"检测到身份信息 {pattern!r}: {path}")
    print("[OK] 未检测到已知身份信息")


def check_secret_files() -> None:
    gitignore = (ROOT / ".gitignore").read_text(encoding="utf-8", errors="ignore")
    for name in (".env", ".env.oss", ".env.oss.example"):
        if name not in gitignore:
            fail(f".gitignore 未忽略 {name}")
        if name != ".env" and (ROOT / name).exists():
            fail(f"提交前请删除 {name}")
    print("[OK] 环境变量文件已由 .gitignore 管理，本地 .env 不会进入提交包")


def check_aliyun_removed() -> None:
    for name in ("package.json", "package-lock.json"):
        text = (ROOT / name).read_text(encoding="utf-8", errors="ignore")
        if "ali-oss" in text:
            fail(f"{name} 中仍存在 ali-oss")
    print("[OK] 阿里云 OSS 相关依赖已移除")


def check_provenance() -> None:
    provenance_path = PUBLIC_DATA / "provenance.json"
    manifest_path = PUBLIC_DATA / "data_manifest.json"
    if not provenance_path.exists():
        fail("缺少 public/data/provenance.json，请先运行 python scripts/fetch_full.py --stage build")
    if not manifest_path.exists():
        fail("缺少 public/data/data_manifest.json")
    provenance = json.loads(provenance_path.read_text(encoding="utf-8"))
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if provenance.get("counts", {}) != manifest.get("counts", {}):
        fail("provenance.json 与 data_manifest.json 的条数不一致")
    print("[OK] 数据溯源文件存在且条数一致")


def check_data_files() -> None:
    for name in ("persons.json", "places.json", "events.json", "organizations.json"):
        path = PUBLIC_DATA / name
        if not path.exists():
            fail(f"缺少数据文件 {name}")
        data = json.loads(path.read_text(encoding="utf-8"))
        empty_id = sum(1 for item in data if not item.get("id"))
        empty_source = sum(1 for item in data if not item.get("source"))
        if empty_id:
            fail(f"{name} 存在 {empty_id} 条空 id")
        if empty_source:
            fail(f"{name} 存在 {empty_source} 条空 source")
    relations_path = SRC_DATA / "relations.json"
    if not relations_path.exists():
        fail("缺少 src/data/relations.json")
    json.loads(relations_path.read_text(encoding="utf-8"))
    print("[OK] 数据文件可解析且无空 id/source")


def main() -> None:
    check_secret_files()
    check_aliyun_removed()
    check_provenance()
    check_data_files()
    check_sensitive_strings()
    print("[PASS] 项目通过匿名提交前检查")


if __name__ == "__main__":
    main()
