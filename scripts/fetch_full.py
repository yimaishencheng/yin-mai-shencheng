#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fetch and build the full Shanghai Library open-data dataset for Yin Mai Shencheng.

The script reads SH_LIBRARY_API_KEY from the environment or from .env, keeps raw
API responses under data/raw, and writes app-facing JSON under public/data.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import OrderedDict
from pathlib import Path


BASE_URL = "https://data1.library.sh.cn"
ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
OUT_DIR = ROOT / "public" / "data"
SRC_DATA = ROOT / "src" / "data"
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
DELAY = 0.12

PROVENANCE_NOTICE = (
    "上海图书馆开放数据竞赛数据仅授权本届竞赛非商业使用，"
    "禁止篡改、伪造或用于任何非法及未授权用途。"
)

DATASET_PROVENANCE = {
    "persons": {
        "label": "人物",
        "source_files": ["persons.json", "person_details.json"],
        "transformations": [
            "clean_name",
            "normalize_yearish",
            "parse_year",
            "anomaly_annotation",
            "is_incomplete_marking",
        ],
        "derived_fields": ["is_anomaly", "anomaly_note", "is_incomplete"],
    },
    "places": {
        "label": "地点",
        "source_files": ["places.json", "places_list.json", "gazetteer.json"],
        "transformations": ["clean_name", "coordinate_validation", "anomaly_annotation"],
        "derived_fields": ["is_anomaly", "anomaly_score", "anomaly_note", "related_persons"],
    },
    "events": {
        "label": "事件",
        "source_files": ["events.json", "event_details.json", "wkl_events.json"],
        "transformations": ["clean_name", "date_normalization", "synthetic_architecture_events"],
        "derived_fields": ["person_ids", "location_id"],
    },
    "organizations": {
        "label": "机构",
        "source_files": ["organizations.json", "org_label_map.json"],
        "transformations": ["clean_name", "member_linking"],
        "derived_fields": ["member_ids"],
    },
    "relations": {
        "label": "人物关系",
        "source_files": [],
        "transformations": ["event_cooccurrence", "manual_relations"],
        "derived_fields": ["strength", "year"],
    },
}

TRANSFORMATION_NOTES = {
    "clean_name": "清洗多语言标签，例如去除 @chs/@en 后缀",
    "normalize_yearish": "修正明显缺失千位或年份格式异常的日期",
    "parse_year": "从日期文本提取年份",
    "coordinate_validation": "仅保留上海市范围内的有效坐标，无效坐标置 0",
    "anomaly_annotation": "基于人工规则或记录字段缺失生成的异常分析标签",
    "is_incomplete_marking": "根据人物字段完整度生成“档案待考”标签",
    "date_normalization": "统一事件日期格式并提取年份",
    "synthetic_architecture_events": "为建筑详情中的事件生成本地合成编号",
    "member_linking": "根据事件详情将人物关联到机构成员列表",
    "event_cooccurrence": "根据同一事件中的人物共现生成关系边",
    "manual_relations": "人工维护的关系，不属于开放数据原始记录",
}


def load_api_key() -> str:
    key = (os.environ.get("SH_LIBRARY_API_KEY") or "").strip()
    if key:
        return key
    env_file = ROOT / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = line.strip()
            if line.startswith("SH_LIBRARY_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("请设置环境变量 SH_LIBRARY_API_KEY，或在 .env 中配置 SH_LIBRARY_API_KEY")


API_KEY = load_api_key()


def log(msg: str) -> None:
    print(msg, flush=True)


def safe_str(v, default: str = "") -> str:
    if v is None:
        return default
    if isinstance(v, list):
        return safe_str(v[0], default) if v else default
    return str(v)


def safe_list(v, default=None) -> list:
    if default is None:
        default = []
    if v is None:
        return default
    if isinstance(v, str):
        return [v]
    if isinstance(v, list):
        return v
    return default


def safe_int(v, default: int = 0) -> int:
    if v is None:
        return default
    try:
        return int(float(str(v)))
    except (ValueError, TypeError):
        return default


def safe_float(v, default: float = 0.0) -> float:
    if v is None:
        return default
    try:
        return float(str(v))
    except (ValueError, TypeError):
        return default


def clean_name(value) -> str:
    """Extract a Chinese label from strings like '商务印书馆@chs' or label arrays."""
    if isinstance(value, list):
        for item in value:
            if isinstance(item, dict):
                if item.get("@language") == "chs":
                    return clean_name(item.get("@value", ""))
            else:
                return clean_name(item)
        return clean_name(value[0]) if value else ""
    text = str(value or "")
    text = re.sub(r"@(chs|cht|en|zh|cn)$", "", text.strip())
    return text.strip()


def normalize_yearish(value) -> str:
    text = safe_str(value).strip()
    match = re.match(r"^(\d{3})([.\-/年月].*)$", text)
    if match and match.group(1).startswith("9"):
        return "1" + text
    match = re.match(r"^(\d{4})$", text)
    if match and text.startswith("9") and text[1] in "01234":
        return "1" + text[:-1]
    return text


def parse_year(value) -> int:
    text = re.sub(r"\D", "", normalize_yearish(value))
    if not text:
        return 0
    try:
        year = int(text[:4])
        return year if 1000 <= year <= 2100 else 0
    except ValueError:
        return 0


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    if not path.exists() or not path.is_file():
        return ""
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def annotate_provenance_fields(data: dict) -> None:
    """Mark records whose meaning is derived from cleaning or analysis."""
    for person in data.get("persons", []):
        person["source_detail"] = person.get("source", "")
        person["provenance"] = "manual" if person.get("is_anomaly") else "raw"
    for place in data.get("places", []):
        place["source_detail"] = place.get("source", "")
        place["provenance"] = "manual" if place.get("is_anomaly") else "raw"
    for event in data.get("events", []):
        event["source_detail"] = event.get("source", "")
        event["provenance"] = "synthetic" if str(event.get("id", "")).startswith("arch:") else "raw"
    for org in data.get("organizations", []):
        org["source_detail"] = org.get("source", "")
        org["provenance"] = "raw"
    for relation in data.get("relations", []):
        relation.setdefault("provenance", "inferred")


def build_provenance(data: dict) -> dict:
    from collections import Counter

    counts = Counter()
    for key in ("persons", "places", "events", "organizations"):
        counts.update(record.get("source", "") for record in data.get(key, []))

    raw_files = []
    if RAW_DIR.exists():
        for path in sorted(RAW_DIR.rglob("*.json")):
            raw_files.append(
                {
                    "name": path.name,
                    "sha256": sha256_file(path),
                    "bytes": path.stat().st_size,
                }
            )

    return {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "source_api": BASE_URL,
        "license_notice": PROVENANCE_NOTICE,
        "counts": {key: len(data.get(key, [])) for key in data},
        "source_counts": dict(sorted(counts.items(), key=lambda item: item[0])),
        "datasets": DATASET_PROVENANCE,
        "transformations": TRANSFORMATION_NOTES,
        "raw_files": raw_files,
    }


def request_json(path: str, params: dict | None = None, retries: int = 4, timeout: int = 40) -> dict:
    params = dict(params or {})
    params["key"] = API_KEY
    query = urllib.parse.urlencode(params)
    url = f"{BASE_URL}{path}?{query}"
    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                body = resp.read().decode("utf-8", errors="replace")
            return json.loads(body)
        except urllib.error.HTTPError as exc:
            last_err = exc
            if exc.code in (429, 500, 502, 503, 504):
                time.sleep(min(2 ** attempt, 6) + DELAY)
                continue
            raise
        except Exception as exc:
            last_err = exc
            if attempt < retries - 1:
                time.sleep(min(2 ** attempt, 4) + DELAY)
                continue
    raise last_err or RuntimeError("request failed")


def extract_data(data: dict) -> list:
    if isinstance(data, dict):
        for key in ("data", "resultList", "list", "jp"):
            value = data.get(key)
            if isinstance(value, list):
                return value
            if isinstance(value, dict):
                return [value]
    return []


def fetch_paged(
    path: str,
    params: dict | None = None,
    max_pages: int = 100,
    page_size: int = 100,
    key_fn=None,
) -> list:
    params = dict(params or {})
    params.setdefault("pageth", "1")
    params.setdefault("pageSize", str(page_size))
    rows: list = []
    seen = set()
    for page in range(1, max_pages + 1):
        params["pageth"] = str(page)
        data = request_json(path, params)
        items = extract_data(data)
        if not items:
            break
        added = 0
        for item in items:
            if key_fn:
                key = key_fn(item)
                if key is None:
                    rows.append(item)
                    added += 1
                elif key not in seen:
                    seen.add(key)
                    rows.append(item)
                    added += 1
            else:
                rows.append(item)
                added += 1
        if key_fn and added == 0:
            break
        pager = data.get("pager", {}) if isinstance(data, dict) else {}
        page_count = safe_int(pager.get("pageCount"), 0)
        row_count = safe_int(pager.get("rowCount"), 0)
        if page_count and page >= page_count:
            break
        if row_count and len(rows) >= row_count:
            break
        if len(items) < page_size:
            break
        time.sleep(DELAY)
    return rows


def save_raw(name: str, data) -> Path:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    path = RAW_DIR / f"{name}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return path


def load_raw(name: str):
    path = RAW_DIR / f"{name}.json"
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def uri_key(item) -> str:
    return safe_str(item.get("uri") or item.get("@id") or item.get("id") or "")


def entity_uri(item) -> str:
    for key in (
        "uri",
        "@id",
        "id",
        "personUri",
        "placeUri",
        "orgUri",
        "organizationUri",
        "eventUri",
        "buildingUri",
    ):
        value = item.get(key) if isinstance(item, dict) else None
        if value:
            return safe_str(value)
    return ""


# Keyword lists are intentionally broad. The raw files keep everything; app-facing
# datasets can be narrowed later without losing source data.
PERSON_NAMES = [
    "鲁迅", "茅盾", "巴金", "郭沫若", "丁玲", "柔石", "殷夫", "冯雪峰", "夏衍", "田汉",
    "洪深", "阳翰笙", "叶圣陶", "郑振铎", "胡愈之", "李伯钊", "瞿秋白", "李大钊", "陈独秀", "蔡元培",
    "宋庆龄", "邹韬奋", "史沫特莱", "沈钧儒", "章乃器", "邓演达", "黄炎培", "陶行知",
    "林语堂", "徐志摩", "胡适", "梁实秋", "柳亚子", "闻一多", "朱自清", "冰心", "张爱玲", "苏青", "潘汉年",
    "向警予", "赵世炎", "罗亦农", "汪寿华", "陈延年", "陈乔年", "李启汉", "刘少奇", "邓中夏", "恽代英",
    "萧楚女", "彭湃", "周恩来", "毛泽东", "董必武", "何叔衡", "陈潭秋", "王尽美", "邓恩铭", "李达",
    "李汉俊", "张国焘", "刘仁静", "陈公博", "周佛海", "包惠僧", "林伯渠", "吴玉章", "徐特立", "谢觉哉",
    "张太雷", "苏兆征", "蔡和森", "王荷波", "项英", "关向应", "任弼时", "陈云", "聂荣臻",
    "叶挺", "贺龙", "刘伯承", "方志敏", "张闻天", "王稼祥", "秦邦宪", "杨尚昆", "李立三",
    "张叔平", "谢文锦", "任耐", "王乃坚", "潘梓年", "方慕韩", "陈赓", "陈毅", "刘亚楼", "李白",
]

PERSON_FREETEXT = [
    "革命", "左联", "地下党", "共产党", "特科", "情报", "烈士", "五卅", "左翼",
    "作家", "工人", "罢工", "学生运动", "文化界", "救国会", "上海", "龙华", "上海年华",
]

EVENT_TYPES = [
    "罢工", "示威", "集会", "逮捕", "枪决", "牺牲", "成立", "创刊", "停刊", "搜查",
    "暗杀", "起义", "暴动", "五卅", "淞沪", "四一二", "左联", "地下党", "商务印书馆",
    "申报", "大公报", "龙华", "租界", "法租界", "公共租界", "华界", "共产党", "共青团",
    "工会", "学生会", "救国会", "抗日", "工人", "学生", "左翼", "鲁迅", "上海", "虹口",
    "黄浦", "静安", "闸北", "杨浦", "浦东", "罢工潮", "秘密", "情报", "联络", "旧址",
]

PLACE_KEYWORDS = [
    "上海", "虹口", "徐汇", "卢湾", "静安", "闸北", "南市", "普陀", "杨浦", "浦东",
    "宝山", "嘉定", "松江", "青浦", "奉贤", "崇明", "金山", "黄浦", "长宁", "闵行",
    "法租界", "公共租界", "华界", "租界", "苏州河", "黄浦江", "外滩", "北四川路",
    "霞飞路", "福州路", "四马路", "大世界", "城隍庙", "龙华", "江湾", "多伦路",
    "山阴路", "溧阳路", "愚园路", "武康路", "思南路", "南昌路", "书店", "印刷厂",
    "报社", "学校", "大学", "医院", "工厂", "会馆", "公所", "茶馆", "里弄", "路", "街",
]

GAZETTEER_KEYWORDS = [
    "上海", "黄浦", "徐汇", "静安", "虹口", "闸北", "卢湾", "南市", "普陀", "杨浦",
    "浦东", "长宁", "闵行", "宝山", "嘉定", "松江", "青浦", "奉贤", "金山", "崇明",
    "租界", "外滩", "福州路", "四川路", "霞飞路", "北四川路", "苏州河", "黄浦江",
    "龙华", "江湾", "城隍庙", "大世界", "多伦路", "山阴路", "溧阳路", "愚园路",
    "武康路", "思南路", "南昌路", "书店", "印刷厂", "报社", "学校", "医院", "工厂",
    "会馆", "公所", "茶馆", "里弄",
]

ORG_KEYWORDS = [
    "商务印书馆", "中华书局", "申报馆", "大公报馆", "生活书店", "新知书店", "读书出版社",
    "左翼作家联盟", "左联", "中国自由运动大同盟", "中国民权保障同盟", "上海大学",
    "劳动大学", "中华艺术大学", "内山书店", "共青团", "共产党", "救国会", "抗日救亡",
    "总工会", "中国左翼文化界总同盟", "中国左翼戏剧家联盟", "中国左翼美术家联盟",
    "上海文化界救国会", "上海妇女界救国会", "上海职业界救国会", "上海", "小学", "工会",
    "出版社", "书店", "报社", "杂志", "公司", "委员会", "联合会", "同盟", "图书馆",
    "博物馆", "学校", "大学", "中学", "银行", "医院", "工厂", "印刷", "书局",
]

ARCH_RED_KEYWORDS = [
    "中共一大会址", "中共二大会址", "中共四大会址", "共青团中央机关旧址", "毛泽东旧居",
    "周恩来旧居", "鲁迅故居", "鲁迅墓", "茅盾旧居", "瞿秋白旧居", "左联成立大会旧址",
    "中国社会主义青年团中央机关旧址", "五卅运动纪念碑", "龙华烈士陵园", "上海总工会旧址",
    "陈云故居", "宋庆龄故居", "韬奋纪念馆", "刘长胜故居", "李白烈士故居", "上海",
    "革命", "旧址", "故居", "纪念馆", "中共", "鲁迅", "陈云", "宋庆龄", "印刷", "报社",
    "书店", "学校", "电台", "秘密",
]

WKL_KEYWORDS = [
    "武康路", "上海", "虹口", "徐汇", "静安", "黄浦", "卢湾", "法租界", "公共租界",
    "霞飞路", "愚园路", "思南路", "多伦路",
]

ROAD_KEYWORDS = [
    "上海", "武康", "虹口", "徐汇", "静安", "黄浦", "闸北", "卢湾", "南市", "杨浦",
    "浦东", "长宁", "闵行", "宝山", "嘉定", "松江", "青浦", "奉贤", "金山", "崇明",
    "法租界", "公共租界", "外滩", "福州路", "四川路", "霞飞路", "北四川路", "苏州河",
    "黄浦江", "龙华", "江湾", "多伦路", "山阴路", "溧阳路", "愚园路", "武康路", "思南路",
    "南昌路", "万安街", "路", "街",
]

LITERATURE_KEYWORDS = [
    "革命", "共产党", "左联", "五卅", "上海", "地下", "抗日", "救国会", "罢工", "工人运动",
    "鲁迅", "茅盾", "巴金", "瞿秋白", "潘汉年", "龙华", "租界", "秘密", "情报",
]

MANUAL_RELS = [
    ("鲁迅", "茅盾", "合作", 0.9), ("鲁迅", "瞿秋白", "合作", 0.85),
    ("鲁迅", "冯雪峰", "合作", 0.8), ("巴金", "茅盾", "合作", 0.7),
    ("邹韬奋", "宋庆龄", "合作", 0.75), ("丁玲", "冯雪峰", "合作", 0.7),
    ("田汉", "夏衍", "合作", 0.8), ("柔石", "殷夫", "同时被捕", 0.9),
    ("瞿秋白", "柔石", "同时被捕", 0.85), ("陈独秀", "李大钊", "合作", 0.9),
    ("周恩来", "邓颖超", "夫妻", 1.0),
]

SPECIAL_ANOMALIES = {
    "柔石": "1931年2月7日与殷夫等左联五烈士在龙华就义",
    "殷夫": "1931年2月7日与柔石等左联五烈士在龙华就义",
    "瞿秋白": "1935年6月18日在福建长汀就义",
    "赵世炎": "1927年7月19日在上海龙华就义",
    "罗亦农": "1928年4月21日在上海龙华就义",
    "陈延年": "1927年7月4日在上海龙华就义",
    "陈乔年": "1928年6月6日在上海龙华就义",
    "向警予": "1928年5月1日在武汉就义",
    "汪寿华": "1927年4月11日在上海被暗杀",
    "彭湃": "1929年8月30日在上海龙华就义",
    "邓中夏": "1933年9月21日在南京就义",
    "恽代英": "1931年4月29日在南京就义",
}


def fetch_persons(fresh: bool = False) -> list:
    cached = load_raw("persons")
    if cached is not None and not fresh:
        log(f"[persons] 使用缓存 {len(cached)} 条")
        return cached
    rows = []
    seen = set()

    def add(items):
        for item in items:
            key = uri_key(item)
            if key and key in seen:
                continue
            if key:
                seen.add(key)
            rows.append(item)

    for name in PERSON_NAMES:
        add(fetch_paged("/persons/data", {"fname": name}, max_pages=5, page_size=100, key_fn=uri_key))
    for text in PERSON_FREETEXT:
        add(fetch_paged("/persons/data", {"freetext": text}, max_pages=50, page_size=100, key_fn=uri_key))
    log(f"[persons] 原始人物 {len(rows)} 条")
    save_raw("persons", rows)
    return rows


def fetch_places(fresh: bool = False) -> dict:
    cached = load_raw("places")
    if cached is not None and not fresh:
        log(f"[places] 使用缓存 {len(cached)} 条")
        return cached
    raw: dict = {}

    places_list = load_raw("places_list")
    if places_list is None:
        places_data = request_json("/place/listPlaces")
        places_list = places_data.get("list", []) if isinstance(places_data, dict) else places_data or []
    raw["listPlaces"] = places_list
    save_raw("places_list", raw["listPlaces"])
    log(f"[places] 国内地点列表 {len(raw['listPlaces'])} 条")

    place_rows = []
    seen = set()
    for kw in PLACE_KEYWORDS:
        try:
            data = request_json(f"/place/{urllib.parse.quote(kw)}")
            key = uri_key(data)
            if key and key not in seen:
                seen.add(key)
                place_rows.append(data)
        except Exception:
            pass
    raw["placeQueries"] = place_rows
    log(f"[places] 地名检索 {len(place_rows)} 条")

    gazetteer = []
    for gtype in ["1", "2", "3", "4"]:
        items = fetch_paged(
            "/shnh/dmz/webapi/geonames/list",
            {"type": gtype, "freetext": ""},
            max_pages=50,
            page_size=100,
            key_fn=uri_key,
        )
        gazetteer.extend(items)
        for kw in GAZETTEER_KEYWORDS:
            items = fetch_paged(
                "/shnh/dmz/webapi/geonames/list",
                {"type": gtype, "freetext": kw},
                max_pages=20,
                page_size=100,
                key_fn=uri_key,
            )
            gazetteer.extend(items)
    raw["gazetteer"] = gazetteer
    log(f"[places] 上海地名志 {len(gazetteer)} 条")

    architectures = []
    for red in ["1", "2", "3"]:
        architectures.extend(
            fetch_paged(
                "/shnh/gmwx/webapi/architecture/getArchitectures",
                {"isRed": red, "freetext": ""},
                max_pages=200,
                page_size=200,
                key_fn=uri_key,
            )
        )
    for kw in ARCH_RED_KEYWORDS:
        architectures.extend(
            fetch_paged(
                "/shnh/gmwx/webapi/architecture/getArchitectures",
                {"isRed": "1", "freetext": kw},
                max_pages=20,
                page_size=200,
                key_fn=uri_key,
            )
        )
    raw["architectures"] = architectures
    log(f"[places] 红色/文物/历史建筑 {len(architectures)} 条")

    wkl_buildings = []
    for kw in WKL_KEYWORDS:
        wkl_buildings.extend(
            fetch_paged(
                "/shnh/wkl/webapi/building/list",
                {"freetext": kw},
                max_pages=10,
                page_size=100,
                key_fn=uri_key,
            )
        )
    raw["wkl_buildings"] = wkl_buildings
    log(f"[places] 武康路建筑 {len(wkl_buildings)} 条")

    roads = []
    for kw in ROAD_KEYWORDS:
        roads.extend(
            fetch_paged(
                "/shnh/wkl/webapi/road/list",
                {"freetext": kw, "type": "2"},
                max_pages=20,
                page_size=100,
                key_fn=uri_key,
            )
        )
    raw["roads"] = roads
    log(f"[places] 道路 {len(roads)} 条")

    map_points = []
    polygon = "POLYGON((120.85 30.67,122.12 30.67,122.12 31.88,120.85 31.88,120.85 30.67))"
    for kw in ["共产党", "革命", "上海", "旧址", "书店", "印刷"]:
        try:
            data = request_json(
                "/shnh/gmwx/webapi//instance/placeInArea",
                {"freetext": kw, "points": polygon},
            )
            map_points.extend(extract_data(data))
        except Exception:
            pass
    raw["map_points"] = map_points
    log(f"[places] 地图框选地点 {len(map_points)} 条")

    save_raw("places", raw)
    return raw


def fetch_events(fresh: bool = False) -> list:
    cached = load_raw("events")
    if cached is not None and not fresh:
        log(f"[events] 使用缓存 {len(cached)} 条")
        return cached
    rows = []
    seen = set()

    def key_fn(item):
        return safe_str(item.get("uri") or item.get("nodeId") or "")

    keywords = [str(year) for year in range(1919, 1946)] + EVENT_TYPES
    for kw in keywords:
        rows.extend(
            fetch_paged(
                "/webapi/hsly/route/getEventList",
                {"eventFreeText": kw},
                max_pages=50,
                page_size=100,
                key_fn=key_fn,
            )
        )
    log(f"[events] 原始事件 {len(rows)} 条")
    save_raw("events", rows)
    return rows


def fetch_organizations(fresh: bool = False) -> list:
    cached = load_raw("organizations")
    if cached is not None and not fresh:
        log(f"[organizations] 使用缓存 {len(cached)} 条")
        return cached
    rows = []
    for kw in ORG_KEYWORDS:
        rows.extend(
            fetch_paged(
                "/shnh/whzk/webapi/org/list",
                {"freetext": kw},
                max_pages=30,
                page_size=100,
                key_fn=uri_key,
            )
        )
    log(f"[organizations] 原始机构 {len(rows)} 条")
    save_raw("organizations", rows)
    return rows


def fetch_literature(fresh: bool = False) -> list:
    cached = load_raw("literature")
    if cached is not None and not fresh:
        log(f"[literature] 使用缓存 {len(cached)} 条")
        return cached
    rows = []
    for kw in LITERATURE_KEYWORDS:
        rows.extend(
            fetch_paged(
                "/shnh/gmwx/webapi/instance/search",
                {"freetext": kw},
                max_pages=30,
                page_size=100,
                key_fn=uri_key,
            )
        )
    log(f"[literature] 革命文献 {len(rows)} 条")
    save_raw("literature", rows)
    return rows


def fetch_event_details(events: list, fresh: bool = False, limit: int = 0) -> dict:
    cached = load_raw("event_details")
    if not isinstance(cached, dict):
        cached = {}
    details = dict(cached)
    if details and not fresh and limit and len(details) >= limit:
        log(f"[event_details] 使用缓存 {len(details)} 条")
        return details
    uris = [safe_str(e.get("uri") or e.get("nodeId") or "") for e in events]
    uris = list(OrderedDict.fromkeys(u for u in uris if u))
    if limit:
        uris = uris[:limit]
    total = len(uris)
    for idx, uri in enumerate(uris, 1):
        if uri in details:
            continue
        try:
            data = request_json("/webapi/hsly/route/getEventDetail", {"uri": uri})
            details[uri] = data
        except Exception as exc:
            log(f"  [event_detail] 跳过 {uri}: {str(exc)[:80]}")
        if idx % 50 == 0 or idx == total:
            log(f"  [event_detail] {idx}/{total}")
            save_raw("event_details", details)
        time.sleep(DELAY)
    save_raw("event_details", details)
    log(f"[event_details] 详情 {len(details)} 条")
    return details


def fetch_architecture_details(architectures: list, fresh: bool = False, limit: int = 0) -> dict:
    cached = load_raw("architecture_details")
    if not isinstance(cached, dict):
        cached = {}
    details = dict(cached)
    if details and not fresh and limit and len(details) >= limit:
        log(f"[architecture_details] 使用缓存 {len(details)} 条")
        return details
    uris = [uri_key(a) for a in architectures]
    uris = list(OrderedDict.fromkeys(u for u in uris if u))
    if limit:
        uris = uris[:limit]
    total = len(uris)
    for idx, uri in enumerate(uris, 1):
        if uri in details:
            continue
        try:
            data = request_json("/shnh/gmwx/webapi/architecture/getArchitectureDetail", {"uri": uri})
            details[uri] = data
        except Exception as exc:
            log(f"  [arch_detail] 跳过 {uri}: {str(exc)[:80]}")
        if idx % 50 == 0 or idx == total:
            log(f"  [arch_detail] {idx}/{total}")
            save_raw("architecture_details", details)
        time.sleep(DELAY)
    save_raw("architecture_details", details)
    log(f"[architecture_details] 详情 {len(details)} 条")
    return details


def fetch_wkl_events(wkl_buildings: list, fresh: bool = False) -> dict:
    cached = load_raw("wkl_events")
    if not isinstance(cached, dict):
        cached = {}
    events_by_building = dict(cached)
    building_uris = [uri_key(b) for b in wkl_buildings]
    if events_by_building and not fresh and all(uri in events_by_building for uri in building_uris):
        log(f"[wkl_events] 使用缓存 {len(events_by_building)} 条")
        return events_by_building
    for building in wkl_buildings:
        buri = uri_key(building)
        if not buri or buri in events_by_building:
            continue
        try:
            data = request_json("/shnh/wkl/webapi/building/event/list", {"buri": buri})
            events_by_building[buri] = extract_data(data)
        except Exception as exc:
            log(f"  [wkl_event] 跳过 {buri}: {str(exc)[:80]}")
        time.sleep(DELAY)
    save_raw("wkl_events", events_by_building)
    log(f"[wkl_events] 建筑事件 {sum(len(v) for v in events_by_building.values())} 条")
    return events_by_building


def fetch_org_label_map(event_details: dict, fresh: bool = False) -> dict:
    cached = load_raw("org_label_map")
    label_map = dict(cached or {})
    if cached and not fresh:
        log(f"[org_label_map] 使用缓存 {len(label_map)} 条")
        return label_map
    labels = []
    seen = set()
    for detail in event_details.values():
        data = detail.get("data", []) if isinstance(detail, dict) else []
        if not isinstance(data, list):
            data = [data]
        for item in data:
            if not isinstance(item, dict):
                continue
            for org_item in safe_list(item.get("organizationList", [])):
                if not isinstance(org_item, dict):
                    continue
                label = clean_name(org_item.get("label") or org_item.get("name") or "")
                if label and label not in seen:
                    seen.add(label)
                    labels.append(label)
    total = len(labels)
    for idx, label in enumerate(labels, 1):
        if label in label_map:
            continue
        try:
            items = fetch_paged(
                "/shnh/whzk/webapi/org/list",
                {"freetext": label},
                max_pages=2,
                page_size=100,
                key_fn=uri_key,
            )
            for item in items:
                if clean_name(item.get("name") or "") == label:
                    label_map[label] = uri_key(item)
                    break
        except Exception as exc:
            log(f"  [org_label_map] {label}: {str(exc)[:80]}")
        if idx % 50 == 0 or idx == total:
            log(f"  [org_label_map] {idx}/{total} resolved={len(label_map)}")
            save_raw("org_label_map", label_map)
        time.sleep(DELAY)
    save_raw("org_label_map", label_map)
    log(f"[org_label_map] 唯一机构名 {total}，已解析 {len(label_map)}")
    return label_map


def collect_person_uris(
    persons_raw: list,
    event_details: dict,
    architecture_details: dict,
    wkl_buildings: list,
) -> list:
    uris = []
    seen = set()

    def add(uri: str) -> None:
        if uri and uri not in seen:
            seen.add(uri)
            uris.append(uri)

    for person in persons_raw:
        add(uri_key(person))
    for detail in event_details.values():
        data = detail.get("data", []) if isinstance(detail, dict) else []
        if not isinstance(data, list):
            data = [data]
        for item in data:
            if not isinstance(item, dict):
                continue
            for person_item in safe_list(item.get("personList", [])):
                if isinstance(person_item, dict):
                    add(entity_uri(person_item))
    for detail in architecture_details.values():
        data = detail.get("data", []) if isinstance(detail, dict) else []
        if not isinstance(data, list):
            data = [data]
        for item in data:
            if not isinstance(item, dict):
                continue
            for person_item in safe_list(item.get("personList", [])):
                if isinstance(person_item, dict):
                    add(entity_uri(person_item))
    for building in wkl_buildings:
        for person_item in safe_list(building.get("relation", [])):
            if isinstance(person_item, dict):
                add(entity_uri(person_item))
    return uris


def fetch_person_details(person_uris: list, fresh: bool = False, limit: int = 0) -> dict:
    cached = load_raw("person_details")
    if not isinstance(cached, dict):
        cached = {}
    details = dict(cached)
    if details and not fresh and limit and len(details) >= limit:
        log(f"[person_details] 使用缓存 {len(details)} 条")
        return details
    uris = list(OrderedDict.fromkeys(u for u in person_uris if u))
    if limit:
        uris = uris[:limit]
    total = len(uris)
    for idx, uri in enumerate(uris, 1):
        if uri in details:
            continue
        try:
            data = request_json("/data/jsonld", {"uri": uri})
            if isinstance(data, dict):
                details[uri] = data
        except Exception as exc:
            log(f"  [person_detail] 跳过 {uri}: {str(exc)[:80]}")
        if idx % 50 == 0 or idx == total:
            log(f"  [person_detail] {idx}/{total} saved={len(details)}")
            save_raw("person_details", details)
        time.sleep(DELAY)
    save_raw("person_details", details)
    log(f"[person_details] 详情 {len(details)} 条")
    return details


def map_person(item: dict) -> dict:
    pid = uri_key(item)
    name = clean_name(item.get("fname") or item.get("name") or item.get("title") or "")
    active_to = safe_int(item.get("end") or item.get("deathday") or item.get("activeTo") or 0) or None
    active_from = safe_int(item.get("start") or item.get("birthday") or item.get("activeFrom") or 0)
    person = {
        "id": pid,
        "name": name,
        "aliases": safe_list(item.get("otherName") or item.get("alias") or []),
        "occupation": clean_name(item.get("speciality") or item.get("occupation") or item.get("officialPosition") or ""),
        "active_from": active_from,
        "active_to": active_to,
        "district": clean_name(item.get("place") or item.get("birthPlace") or item.get("district") or ""),
        "organizations": [],
        "description": clean_name(item.get("briefBiography") or item.get("description") or ""),
        "source": clean_name(item.get("noteOfSource") or "上海图书馆开放数据平台"),
    }
    if person["name"] in SPECIAL_ANOMALIES:
        person["is_anomaly"] = True
        person["anomaly_note"] = SPECIAL_ANOMALIES[person["name"]]
    elif active_to and active_to < 1945 and active_from < 1945:
        person["is_anomaly"] = True
        person["anomaly_note"] = f"{person['name']}在{active_to}年后史料中未见记载"
    else:
        person["is_anomaly"] = False
        person["anomaly_note"] = ""
    return person


def map_place(item: dict, source: str, type_label: str = "地点") -> dict:
    labels = item.get("label", []) or []
    name = clean_name(item.get("name") or item.get("nameS") or item.get("nameT") or "")
    if not name:
        for label in labels:
            if isinstance(label, dict) and label.get("@language") == "chs":
                name = clean_name(label.get("@value", ""))
                break
    lat = safe_float(item.get("lat", "0"))
    lng = safe_float(item.get("long", "0"))
    place = {
        "id": uri_key(item),
        "name": name,
        "address": clean_name(item.get("address") or item.get("houseNumber") or item.get("county") or ""),
        "district": clean_name(item.get("district") or item.get("placeValue") or item.get("city") or item.get("county") or item.get("placeLabel") or ""),
        "type": type_label,
        "lat": lat,
        "lng": lng,
        "established": parse_year(item.get("created") or item.get("established") or 0),
        "closed": None,
        "related_persons": [],
        "description": clean_name(item.get("description") or item.get("des") or item.get("riverLabel") or ""),
        "source": source,
    }
    if not place["name"]:
        place["name"] = place["district"] or place["id"]
    if not (30.6 <= lat <= 31.85 and 120.8 <= lng <= 122.1):
        place["lat"] = 0
        place["lng"] = 0
    return place


def map_event(item: dict, source: str = "上海图书馆开放数据平台") -> dict:
    ev_id = safe_str(item.get("uri") or item.get("nodeId") or "")
    name = clean_name(item.get("title") or item.get("name") or "")
    description = clean_name(item.get("description") or item.get("abstract") or "")
    date = normalize_yearish(item.get("dateLabel") or item.get("date") or item.get("startedAtTime") or "")
    year = parse_year(date)
    if year == 0 and re.fullmatch(r"\d{4}", date):
        date = ""
    if not name:
        name = description[:80]
    return {
        "id": ev_id,
        "name": name,
        "date": date,
        "year": year,
        "type": "事件" if source == "上海图书馆开放数据平台" else "建筑事件",
        "location_id": safe_str(item.get("placeUri") or item.get("location") or item.get("place") or ""),
        "person_ids": [],
        "description": description,
        "source": source,
    }


def map_organization(item: dict) -> dict:
    return {
        "id": uri_key(item),
        "name": clean_name(item.get("name") or item.get("label") or ""),
        "type": "组织",
        "description": clean_name(item.get("description") or item.get("des") or ""),
        "source": clean_name(item.get("noteOfSource") or "上海图书馆开放数据平台"),
    }


def extract_uri_list(value) -> list:
    out = []
    for item in safe_list(value):
        if isinstance(item, dict):
            uri = entity_uri(item)
            if uri:
                out.append(uri)
        else:
            text = safe_str(item)
            if text:
                out.append(text)
    return out


def resolve_uri_list(value, name_map) -> list:
    """Resolve detail lists to entity URIs, using URI first and name lookup second."""
    out = []
    for item in safe_list(value):
        if isinstance(item, dict):
            uri = entity_uri(item)
            if uri:
                out.append(uri)
                continue
            name = clean_name(item.get("label") or item.get("name") or "")
            if not name:
                continue
            for key, entity in name_map.items():
                if clean_name(entity.get("name") or entity.get("label") or "") == name:
                    out.append(key)
                    break
        else:
            text = clean_name(item)
            if text:
                for key, entity in name_map.items():
                    if clean_name(entity.get("name") or entity.get("label") or "") == text:
                        out.append(key)
                        break
    return list(OrderedDict.fromkeys(out))


def build_app_data(
    persons_raw: list,
    places_raw: dict,
    events_raw: list,
    organizations_raw: list,
    event_details: dict,
    architecture_details: dict,
    wkl_events: dict,
    org_label_map: dict | None = None,
    person_details: dict | None = None,
) -> dict:
    org_label_map = org_label_map or {}
    person_details = person_details or {}
    def detail_rows(detail):
        if not isinstance(detail, dict):
            return []
        data = detail.get("data", [])
        if not isinstance(data, list):
            data = [data]
        return [item for item in data if isinstance(item, dict)]

    person_map = {}
    for item in persons_raw:
        person = map_person(item)
        if person["id"]:
            person_map.setdefault(person["id"], person)

    for pid, person in person_map.items():
        detail = person_details.get(pid, {})
        if not person.get("description"):
            biographies = safe_list(detail.get("briefBiography") or [])
            if biographies:
                person["description"] = max((clean_name(b) for b in biographies if b), key=len, default="")
        if not person.get("active_from"):
            person["active_from"] = parse_year(detail.get("birthday") or 0)
        if not person.get("active_to"):
            death = parse_year(detail.get("deathday") or 0)
            person["active_to"] = death or None
        if not person.get("district"):
            native_place = detail.get("nativePlace") or ""
            if isinstance(native_place, str) and native_place.startswith("http"):
                native_place = ""
            person["district"] = clean_name(native_place)
        if not person.get("aliases"):
            person["aliases"] = [clean_name(v) for v in safe_list(detail.get("courtesyName") or []) if clean_name(v)]
        if not person.get("organizations"):
            person["organizations"] = [clean_name(v) for v in safe_list(detail.get("relatedOrganization") or []) if clean_name(v)]
        has_info = bool(
            person.get("description")
            or person.get("occupation")
            or person.get("active_from")
            or person.get("organizations")
        )
        person["is_incomplete"] = not has_info

    place_map = OrderedDict()
    for item in places_raw.get("listPlaces", []):
        place = map_place(item, "上海图书馆开放数据平台", "地点")
        if place["id"]:
            place_map.setdefault(place["id"], place)
    for item in places_raw.get("placeQueries", []):
        place = map_place(item, "上海图书馆开放数据平台", "地点")
        if place["id"]:
            place_map.setdefault(place["id"], place)
    for item in places_raw.get("gazetteer", []):
        place = map_place(item, "上海图书馆·上海地名志", "地名志")
        if place["id"]:
            place_map.setdefault(place["id"], place)
    for item in places_raw.get("architectures", []):
        red = safe_str(item.get("isRed") or "")
        type_label = "红色遗址"
        if red == "2":
            type_label = "上海市不可移动文物"
        elif red == "3":
            type_label = "上海市优秀历史建筑"
        place = map_place(item, "上海图书馆·红色旅游", type_label)
        if place["id"]:
            place_map.setdefault(place["id"], place)
    for item in places_raw.get("wkl_buildings", []):
        place = map_place(item, "上海图书馆·武康路建筑", "武康路建筑")
        if place["id"]:
            place_map.setdefault(place["id"], place)
    for item in places_raw.get("roads", []):
        place = map_place(item, "上海图书馆·地名志道路", "道路")
        if place["id"]:
            place_map.setdefault(place["id"], place)
    for item in places_raw.get("map_points", []):
        place = map_place(item, "上海图书馆·地图检索", "地点")
        if place["id"]:
            place_map.setdefault(place["id"], place)

    event_map = OrderedDict()
    for item in events_raw:
        event = map_event(item)
        if event["id"]:
            event_map.setdefault(event["id"], event)
    for buri, evt_items in wkl_events.items():
        for item in evt_items:
            event = map_event(item, "上海图书馆·武康路建筑")
            if event["id"]:
                event_map.setdefault(event["id"], event)
                if not event["location_id"]:
                    event["location_id"] = buri

    for aid, detail in architecture_details.items():
        for data_item in detail_rows(detail):
            event_list = data_item.get("eventList", []) if isinstance(data_item, dict) else []
            for idx, ev_item in enumerate(safe_list(event_list)):
                if not isinstance(ev_item, dict):
                    continue
                synthetic_id = f"arch:{aid}:{idx}"
                description = clean_name(ev_item.get("description") or "")
                started = normalize_yearish(clean_name(ev_item.get("startedAtTime") or ""))
                year = parse_year(started)
                if year == 0 and re.fullmatch(r"\d{4}", started):
                    started = ""
                event_map[synthetic_id] = {
                    "id": synthetic_id,
                    "name": description[:80] or "建筑关联事件",
                    "date": started,
                    "year": year,
                    "type": "建筑事件",
                    "location_id": aid,
                    "person_ids": [],
                    "description": description,
                    "source": "上海图书馆·红色旅游建筑详情",
                }

    org_map = OrderedDict()
    for item in organizations_raw:
        org = map_organization(item)
        if org["id"]:
            org_map.setdefault(org["id"], org)

    for label, uri in org_label_map.items():
        if uri and uri not in org_map:
            org_map[uri] = {
                "id": uri,
                "name": label,
                "type": "组织",
                "description": "",
                "source": "上海图书馆·事件详情",
                "member_ids": [],
            }

    # Merge entities discovered only in detail payloads, then create final lists.
    for detail in event_details.values():
        for data_item in detail_rows(detail):
            for person_item in safe_list(data_item.get("personList", [])):
                if not isinstance(person_item, dict):
                    continue
                uri = entity_uri(person_item)
                name = clean_name(person_item.get("label") or person_item.get("personName") or "")
                if uri and name and uri not in person_map:
                    person_map[uri] = {
                        "id": uri,
                        "name": name,
                        "aliases": [],
                        "occupation": "",
                        "active_from": 0,
                        "active_to": None,
                        "district": "",
                        "organizations": [],
                        "description": "",
                        "source": "上海图书馆·事件详情",
                        "is_anomaly": False,
                        "anomaly_note": "",
                    }
            for place_item in safe_list(data_item.get("placeList", [])):
                if not isinstance(place_item, dict):
                    continue
                uri = safe_str(place_item.get("uri") or "")
                if uri and uri not in place_map:
                    place_map[uri] = {
                        "id": uri,
                        "name": clean_name(place_item.get("label") or ""),
                        "address": "",
                        "district": "",
                        "type": "事件关联地点",
                        "lat": 0,
                        "lng": 0,
                        "established": 0,
                        "closed": None,
                        "related_persons": [],
                        "description": "",
                        "source": "上海图书馆·事件详情",
                    }
            for org_item in safe_list(data_item.get("organizationList", [])):
                if not isinstance(org_item, dict):
                    continue
                label = clean_name(org_item.get("label") or org_item.get("name") or "")
                uri = safe_str(org_item.get("uri") or "") or org_label_map.get(label, "")
                if uri and uri not in org_map:
                    org_map[uri] = {
                        "id": uri,
                        "name": label,
                        "type": "组织",
                        "description": "",
                        "source": "上海图书馆·事件详情",
                        "member_ids": [],
                    }

    for detail in architecture_details.values():
        for data_item in detail_rows(detail):
            for person_item in safe_list(data_item.get("personList", [])):
                if not isinstance(person_item, dict):
                    continue
                uri = entity_uri(person_item)
                name = clean_name(person_item.get("label") or person_item.get("personName") or "")
                if uri and name and uri not in person_map:
                    person_map[uri] = {
                        "id": uri,
                        "name": name,
                        "aliases": [],
                        "occupation": "",
                        "active_from": 0,
                        "active_to": None,
                        "district": "",
                        "organizations": [],
                        "description": "",
                        "source": "上海图书馆·建筑详情",
                        "is_anomaly": False,
                        "anomaly_note": "",
                    }
            place_uri = safe_str(data_item.get("placeUri") or "")
            if place_uri and place_uri not in place_map:
                place_map[place_uri] = {
                    "id": place_uri,
                    "name": clean_name(data_item.get("placeValue") or data_item.get("district") or place_uri),
                    "address": "",
                    "district": clean_name(data_item.get("placeValue") or data_item.get("district") or ""),
                    "type": "事件关联地点",
                    "lat": 0,
                    "lng": 0,
                    "established": 0,
                    "closed": None,
                    "related_persons": [],
                    "description": "",
                    "source": "上海图书馆·建筑详情",
                }

    persons = list(person_map.values())
    places = list(place_map.values())
    events = list(event_map.values())
    organizations = list(org_map.values())
    log(f"[build] prepared persons {len(persons)} places {len(places)} events {len(events)} organizations {len(organizations)}")

    relations = []
    seen_rel = set()
    place_persons: dict[str, set] = {}

    def add_place_person(place_uri: str, person_uri: str) -> None:
        if not place_uri or not person_uri:
            return
        place_persons.setdefault(place_uri, set()).add(person_uri)

    def add_relation(a: str, b: str, rtype: str, strength: float, year: int = 0, provenance: str = "inferred") -> None:
        if not a or not b or a == b:
            return
        key = tuple(sorted([a, b]))
        if key in seen_rel:
            return
        seen_rel.add(key)
        relations.append({
            "source": a,
            "target": b,
            "type": rtype,
            "strength": strength,
            "year": year,
            "provenance": provenance,
        })

    for event in events:
        detail = event_details.get(event["id"], {})
        detail_data = detail.get("data", []) if isinstance(detail, dict) else []
        if not isinstance(detail_data, list):
            detail_data = [detail_data]
        persons_in_event = []
        places_in_event = []
        orgs_in_event = []
        for data_item in detail_data:
            if isinstance(data_item, dict):
                persons_in_event.extend(resolve_uri_list(data_item.get("personList", []), person_map))
                places_in_event.extend(resolve_uri_list(data_item.get("placeList", []), place_map))
                orgs_in_event.extend(resolve_uri_list(data_item.get("organizationList", []), org_map))
        if event.get("location_id"):
            places_in_event.append(event["location_id"])
        persons_in_event = list(OrderedDict.fromkeys(persons_in_event))
        places_in_event = list(OrderedDict.fromkeys(places_in_event))
        orgs_in_event = list(OrderedDict.fromkeys(orgs_in_event))
        event["person_ids"] = persons_in_event
        if places_in_event:
            event["location_id"] = places_in_event[0]
        for i in range(len(persons_in_event)):
            for j in range(i + 1, len(persons_in_event)):
                add_relation(persons_in_event[i], persons_in_event[j], "事件共现", 0.5, event.get("year", 0))
            for place_uri in places_in_event:
                add_place_person(place_uri, persons_in_event[i])
        for person_uri in persons_in_event:
            for org_uri in orgs_in_event:
                org = org_map.get(org_uri)
                if org:
                    org.setdefault("member_ids", [])
                    if person_uri not in org["member_ids"]:
                        org["member_ids"].append(person_uri)
                    person = person_map.get(person_uri)
                    if person and org["name"] not in person.setdefault("organizations", []):
                        person["organizations"].append(org["name"])

    for arch_item in places_raw.get("architectures", []):
        aid = uri_key(arch_item)
        detail = architecture_details.get(aid, {})
        detail_data = detail.get("data", []) if isinstance(detail, dict) else []
        if not isinstance(detail_data, list):
            detail_data = [detail_data]
        for data_item in detail_data:
            if not isinstance(data_item, dict):
                continue
            for person_uri in extract_uri_list(data_item.get("personList", [])):
                add_place_person(aid, person_uri)
            for event_uri in extract_uri_list(data_item.get("eventList", [])):
                if event_uri in event_map:
                    event_map[event_uri]["location_id"] = aid

    for building in places_raw.get("wkl_buildings", []):
        bid = uri_key(building)
        rel_items = building.get("relation", []) or []
        rel_uris = extract_uri_list(rel_items)
        for rel_item in rel_items if isinstance(rel_items, list) else []:
            if not isinstance(rel_item, dict):
                continue
            uri = safe_str(rel_item.get("uri") or "")
            if uri and uri not in person_map:
                person_map[uri] = {
                    "id": uri,
                    "name": clean_name(rel_item.get("name") or rel_item.get("label") or uri),
                    "aliases": [],
                    "occupation": "",
                    "active_from": 0,
                    "active_to": None,
                    "district": "",
                    "organizations": [],
                    "description": "",
                    "source": "上海图书馆·武康路建筑",
                    "is_anomaly": False,
                    "anomaly_note": "",
                }
        for person_uri in rel_uris:
            add_place_person(bid, person_uri)
        for i in range(len(rel_uris)):
            for j in range(i + 1, len(rel_uris)):
                add_relation(rel_uris[i], rel_uris[j], "同址关系", 0.55, 0)
        designer_items = building.get("designer", []) or []
        for designer in designer_items:
            if isinstance(designer, dict):
                org_uri = safe_str(designer.get("uri") or "")
                if org_uri:
                    org_map.setdefault(org_uri, {
                        "id": org_uri,
                        "name": clean_name(designer.get("name") or designer.get("label") or org_uri),
                        "type": "组织",
                        "description": "",
                        "source": "上海图书馆·武康路建筑",
                        "member_ids": [],
                    })

    persons = list(person_map.values())
    log(f"[build] final persons {len(persons)}")

    for name_a, name_b, rtype, strength in MANUAL_RELS:
        id_a = next((p["id"] for p in persons if p["name"] == name_a), "")
        id_b = next((p["id"] for p in persons if p["name"] == name_b), "")
        add_relation(id_a, id_b, rtype, strength, 0, "manual")

    for place in places:
        place["related_persons"] = sorted(
            pid for pid in place_persons.get(place["id"], set()) if pid in person_map
        )
        if len(place["related_persons"]) >= 3:
            place["is_anomaly"] = True
            place["anomaly_score"] = min(len(place["related_persons"]) / 10, 0.95)
            place["anomaly_note"] = f"该地点关联{len(place['related_persons'])}位已知人物"
        else:
            place["is_anomaly"] = False
            place["anomaly_score"] = 0
            place["anomaly_note"] = ""

    for org in organizations:
        if "member_ids" in org:
            org["member_ids"] = sorted(set(org["member_ids"]))
        else:
            org["member_ids"] = []

    relations = [
        r for r in relations
        if r["source"] in person_map and r["target"] in person_map
    ]

    for person in persons:
        person["is_incomplete"] = not bool(
            person.get("description")
            or person.get("occupation")
            or person.get("active_from")
            or person.get("organizations")
        )

    out = {
        "persons": persons,
        "places": places,
        "events": events,
        "organizations": organizations,
        "relations": relations,
    }
    log(f"[build] relations {len(relations)}")
    log(f"[build] places_with_related {sum(1 for p in places if p['related_persons'])}")
    return out


def write_app_data(data: dict) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    SRC_DATA.mkdir(parents=True, exist_ok=True)
    annotate_provenance_fields(data)
    files = {
        "persons": OUT_DIR / "persons.json",
        "places": OUT_DIR / "places.json",
        "events": OUT_DIR / "events.json",
        "organizations": OUT_DIR / "organizations.json",
        "relations": SRC_DATA / "relations.json",
    }
    for key, path in files.items():
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data[key], f, ensure_ascii=False, indent=2)
    manifest = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "counts": {key: len(data[key]) for key in files},
        "places_with_related_persons": sum(1 for p in data["places"] if p.get("related_persons")),
        "events_with_person_ids": sum(1 for e in data["events"] if e.get("person_ids")),
        "complete_persons": sum(1 for p in data["persons"] if not p.get("is_incomplete")),
        "incomplete_persons": sum(1 for p in data["persons"] if p.get("is_incomplete")),
    }
    with open(OUT_DIR / "data_manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    with open(OUT_DIR / "provenance.json", "w", encoding="utf-8") as f:
        json.dump(build_provenance(data), f, ensure_ascii=False, indent=2)
    log(f"[build] 已写入 {OUT_DIR}")


def run_fetch(args: argparse.Namespace) -> None:
    persons = fetch_persons(args.fresh)
    places = fetch_places(args.fresh)
    events = fetch_events(args.fresh)
    organizations = fetch_organizations(args.fresh)
    literature = fetch_literature(args.fresh)
    event_details = fetch_event_details(events, args.fresh, args.max_event_details)
    architecture_details = fetch_architecture_details(
        places.get("architectures", []),
        args.fresh,
        args.max_arch_details,
    )
    wkl_events = fetch_wkl_events(places.get("wkl_buildings", []), args.fresh)
    org_label_map = fetch_org_label_map(event_details, args.fresh)
    person_uris = collect_person_uris(
        persons,
        event_details,
        architecture_details,
        places.get("wkl_buildings", []),
    )
    person_details = fetch_person_details(person_uris, args.fresh, args.max_person_details)
    raw = {
        "persons": persons,
        "places": places,
        "events": events,
        "organizations": organizations,
        "literature": literature,
        "event_details": event_details,
        "architecture_details": architecture_details,
        "wkl_events": wkl_events,
        "org_label_map": org_label_map,
        "person_details": person_details,
    }
    save_raw("full_payload", raw)
    log(f"[fetch] 原始数据总计约 {sum(len(v) if isinstance(v, list) else 1 for v in raw.values())} 项")


def run_build(args: argparse.Namespace) -> None:
    payload = load_raw("full_payload") or {}
    if not payload:
        raise SystemExit("请先运行 fetch 阶段：python scripts/fetch_full.py --stage fetch")
    data = build_app_data(
        payload["persons"],
        payload["places"],
        payload["events"],
        payload["organizations"],
        payload["event_details"],
        payload["architecture_details"],
        payload["wkl_events"],
        payload.get("org_label_map", {}),
        payload.get("person_details") or load_raw("person_details") or {},
    )
    write_app_data(data)


def main() -> None:
    parser = argparse.ArgumentParser(description="上海图书馆开放数据全量抓取与合并")
    parser.add_argument("--stage", choices=["all", "fetch", "build"], default="all")
    parser.add_argument("--fresh", action="store_true", help="忽略本地缓存重新请求")
    parser.add_argument("--max-event-details", type=int, default=0, help="0 表示抓取全部事件详情")
    parser.add_argument("--max-arch-details", type=int, default=0, help="0 表示抓取全部建筑详情")
    parser.add_argument("--max-person-details", type=int, default=0, help="0 表示抓取全部人物详情")
    args = parser.parse_args()

    if args.stage in ("all", "fetch"):
        run_fetch(args)
    if args.stage in ("all", "build"):
        run_build(args)


if __name__ == "__main__":
    main()
