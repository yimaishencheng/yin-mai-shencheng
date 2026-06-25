#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json, os, sys, time, re
import urllib.request, urllib.parse, urllib.error
from common import (
    BASE_URL, API_KEY, DATA_DIR, UA, DELAY,
    api_get, safe_str, safe_list, safe_int, safe_float,
    extract_data, read_json, write_json, log,
)


# ── 人物姓名列表 ─────────────────────────────────
P_B1 = ['鲁迅','茅盾','巴金','郭沫若','丁玲','柔石','殷夫','冯雪峰','夏衍','田汉','洪深','阳翰笙','叶圣陶','郑振铎','胡愈之','李伯钊','瞿秋白','李大钊','陈独秀','蔡元培']
P_B2 = ['宋庆龄','邹韬奋','史沫特莱','沈钧儒','章乃器','邓演达','黄炎培','陶行知','林语堂','徐志摩','胡适','梁实秋','柳亚子','闻一多','朱自清','冰心','张爱玲','苏青','潘汉年']
P_B3 = ['向警予','赵世炎','罗亦农','汪寿华','陈延年','陈乔年','李启汉','刘少奇','邓中夏','恽代英','萧楚女','彭湃']


def fetch_persons():
    all_names = P_B1 + P_B2 + P_B3
    seen_ids = set()
    seen_names = set()
    results = []
    for name in all_names:
        try:
            data = api_get(f"{BASE_URL}/persons/data?name={urllib.parse.quote(name)}&pageth=1&pageSize=50&key={API_KEY}")
            items = extract_data(data)
            if not items:
                data = api_get(f"{BASE_URL}/persons/data?fname={urllib.parse.quote(name)}&pageth=1&pageSize=50&key={API_KEY}")
                items = extract_data(data)
            count = 0
            for item in (items or []):
                n = safe_str(item.get('name') or item.get('fname') or '')
                if name not in n:
                    continue
                pid = safe_str(item.get('uri') or item.get('id') or '')
                if pid and pid in seen_ids:
                    continue
                dn = n or pid
                if not pid and dn in seen_names:
                    continue
                if pid:
                    seen_ids.add(pid)
                else:
                    seen_names.add(dn)
                results.append(item)
                count += 1
            log(f'[人物] {name} → {count}条')
            time.sleep(DELAY)
        except Exception as e:
            log(f'[人物] {name} → 失败: {str(e)[:60]}')
            time.sleep(DELAY)

    persons = []
    seen2 = set()
    for item in results:
        pid = safe_str(item.get('uri') or item.get('id') or '')
        dn = safe_str(item.get('name') or item.get('fname') or '') or pid
        if not pid and dn in seen2:
            continue
        if not pid:
            seen2.add(dn)
        p = {
            'id': pid,
            'name': safe_str(item.get('fname') or item.get('name') or item.get('title') or ''),
            'aliases': safe_list(item.get('otherName') or []),
            'occupation': safe_str(item.get('speciality') or item.get('occupation') or ''),
            'active_from': safe_int(item.get('start') or item.get('activeFrom') or 0),
            'active_to': safe_int(item.get('end') or item.get('activeTo') or 0) or None,
            'district': safe_str(item.get('place') or item.get('district') or ''),
            'organizations': safe_list(item.get('org') or item.get('organization') or item.get('affiliation') or []),
            'description': safe_str(item.get('briefBiography') or item.get('description') or ''),
            'source': '上海图书馆开放数据平台',
        }
        persons.append(p)
    return persons


# ── 地点抓取 ─────────────────────────────────
PLACE_A = ['上海','虹口','徐汇','卢湾','静安','闸北','南市','普陀','杨浦','浦东','宝山','嘉定','松江','青浦','奉贤','崇明','金山']
PLACE_B = ['法租界','公共租界','华界','租界','苏州河','黄浦江','外滩','北四川路','霞飞路','福州路','四马路','大世界','城隍庙','龙华','江湾']
PLACE_C = ['书店','印刷厂','报社','学校','大学','医院','工厂','会馆','公所','茶馆']


def fetch_places():
    seen = set()
    results = []
    all_kw = list(dict.fromkeys(PLACE_A + PLACE_B + PLACE_C))
    for name in all_kw:
        try:
            url = f"{BASE_URL}/place/{urllib.parse.quote(name)}?key={API_KEY}"
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=15) as resp:
                raw = resp.read().decode('utf-8', errors='replace')
            if raw and raw.strip().startswith('{'):
                data = json.loads(raw)
                if data.get('@id'):
                    pid = safe_str(data.get('@id'))
                    if pid not in seen:
                        seen.add(pid)
                        results.append(data)
                    log(f'  [地点] {name} → 成功')
                else:
                    log(f'  [地点] {name} → 存在但无ID')
            else:
                log(f'  [地点] {name} → 未查到')
            time.sleep(DELAY)
        except Exception as e:
            log(f'  [地点] {name} → 失败: {str(e)[:50]}')
            time.sleep(DELAY)

    # Strategy D: from events
    evts = read_json('events.json')
    place_kw_from_evt = set()
    for ev in evts:
        for fld in ['location', 'place', 'address', 'venue', 'site']:
            v = ev.get(fld, '') or ''
            if v and isinstance(v, str) and len(v) >= 2:
                place_kw_from_evt.add(v.strip())
    for name in place_kw_from_evt:
        if len(name) > 50:
            continue
        try:
            url = f"{BASE_URL}/place/{urllib.parse.quote(name)}?key={API_KEY}"
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=15) as resp:
                raw = resp.read().decode('utf-8', errors='replace')
            if raw and raw.strip().startswith('{'):
                data = json.loads(raw)
                if data.get('@id') and data.get('@id') not in seen:
                    seen.add(data['@id'])
                    results.append(data)
                    log(f'  [地点-event] {name[:30]} → 成功')
            time.sleep(DELAY)
        except Exception:
            time.sleep(DELAY)

    places = []
    for item in results:
        labels = item.get('label', []) or []
        cn_name = ''
        for lb in (labels if isinstance(labels, list) else []):
            if isinstance(lb, dict) and lb.get('@language') == 'chs':
                cn_name = lb.get('@value', '')
                break
        lat = safe_float(item.get('lat', '0'))
        lng = safe_float(item.get('long', '0'))
        if not (30.6 <= lat <= 31.85 and 120.8 <= lng <= 122.1):
            lat, lng = 0, 0
        places.append({
            'id': safe_str(item.get('@id') or ''),
            'name': cn_name or safe_str(item.get('label', '')),
            'address': safe_str(item.get('county', '') or '') + safe_str(item.get('city', '') or '') + safe_str(item.get('province', '') or ''),
            'district': safe_str(item.get('city') or item.get('district') or item.get('county', '') or ''),
            'type': '地点',
            'lat': lat, 'lng': lng,
            'established': 0, 'closed': None,
            'related_persons': [],
            'description': f"省份: {safe_str(item.get('province',''))}, 城市: {safe_str(item.get('city',''))}, 区: {safe_str(item.get('county',''))}",
            'is_anomaly': False, 'anomaly_score': 0, 'anomaly_note': '',
            'source': '上海图书馆开放数据平台',
        })
    return places


# ── 事件抓取 ─────────────────────────────────
EVT_YEARS = ['1919','1920','1921','1922','1923','1924','1925','1926','1927','1928','1929','1930','1931','1932','1933','1934','1935','1936','1937','1938','1939','1940']
EVT_TYPES = ['罢工','示威','集会','逮捕','枪决','牺牲','成立','出版','创刊','停刊','搜查','暗杀','起义','暴动']


def fetch_events(persons):
    seen_ids = set()
    seen_combo = set()
    results = []
    all_kw = list(dict.fromkeys(EVT_YEARS + EVT_TYPES))
    for p in persons:
        n = p.get('name', '')
        if n and len(n) >= 2:
            all_kw.append(n)
    all_kw += ['上海', '虹口', '租界', '龙华', '四川路', '霞飞路', '外滩']
    for kw in all_kw:
        page = 1
        kw_counts = 0
        while page <= 20:
            try:
                url = f"{BASE_URL}/webapi/hsly/route/getEventList?eventFreeText={urllib.parse.quote(kw)}&pageth={page}&pageSize=50&key={API_KEY}"
                data = api_get(url)
                items = extract_data(data)
                if not items:
                    break
                added = 0
                for item in items:
                    eid = safe_str(item.get('uri') or item.get('id') or '')
                    combo = (eid,) if eid else (safe_str(item.get('title', '')), safe_str(item.get('dateLabel', '')))
                    if eid and eid in seen_ids:
                        continue
                    if combo in seen_combo:
                        continue
                    if not eid:
                        seen_combo.add(combo)
                    if eid:
                        seen_ids.add(eid)
                    results.append(item)
                    added += 1
                kw_counts += added
                log(f'  [事件] 关键词"{kw[:10]}" 第{page}页 → {len(items)}条(新增{added})')
                page += 1
                time.sleep(DELAY)
                if len(items) < 50:
                    break
            except Exception as e:
                log(f'  [事件] 关键词"{kw[:10]}" 第{page}页 → 失败: {str(e)[:40]}')
                time.sleep(DELAY)
                break
        log(f'[事件] 关键词"{kw[:10]}" 完成 → 共{kw_counts}条')

    events = []
    for item in results:
        events.append({
            'id': safe_str(item.get('uri') or item.get('id') or ''),
            'name': safe_str(item.get('title') or item.get('name') or ''),
            'date': safe_str(item.get('dateLabel') or item.get('date') or ''),
            'year': safe_int(str(item.get('dateLabel') or item.get('year', ''))[:4] if item.get('dateLabel') else 0),
            'type': '事件',
            'location_id': safe_str(item.get('placeUri') or item.get('location') or item.get('place') or ''),
            'person_ids': safe_list(item.get('personUri') or item.get('personIds') or item.get('persons') or []),
            'description': safe_str(item.get('description') or item.get('abstract') or ''),
            'source': '上海图书馆开放数据平台',
        })
    return events


# ── 关系推断 ─────────────────────────────────
MANUAL_RELS = [
    ('鲁迅','茅盾','合作',0.9), ('鲁迅','瞿秋白','合作',0.85),
    ('鲁迅','冯雪峰','合作',0.8), ('巴金','茅盾','合作',0.7),
    ('邹韬奋','宋庆龄','合作',0.75), ('丁玲','冯雪峰','合作',0.7),
    ('田汉','夏衍','合作',0.8), ('柔石','殷夫','被同时逮捕',0.9),
    ('瞿秋白','柔石','被同时逮捕',0.85),
]


def infer_relations(persons, events):
    rels = []
    seen = set()
    name_to_id = {}
    for p in persons:
        n = p.get('name', '')
        if n:
            name_to_id[n] = p.get('id', '')

    # Source 1: event co-occurrence
    for ev in events:
        pids = ev.get('person_ids', []) or []
        if isinstance(pids, str):
            pids = [pids]
        if len(pids) < 2:
            continue
        year = int(ev.get('year', 0) or 0)
        for i in range(len(pids)):
            for j in range(i + 1, len(pids)):
                key = tuple(sorted([pids[i], pids[j]]))
                if key in seen:
                    continue
                seen.add(key)
                rels.append({'source': pids[i], 'target': pids[j], 'type': '事件共现', 'strength': 0.5, 'year': year})

    # Source 2: same organization
    for i in range(len(persons)):
        for j in range(i + 1, len(persons)):
            pi, pj = persons[i], persons[j]
            oi = set(safe_list(pi.get('organizations', [])))
            oj = set(safe_list(pj.get('organizations', [])))
            if oi & oj:
                key = tuple(sorted([pi.get('id', ''), pj.get('id', '')]))
                if key not in seen:
                    seen.add(key)
                    rels.append({'source': pi.get('id', ''), 'target': pj.get('id', ''), 'type': '同组织成员', 'strength': 0.6, 'year': 0})

    # Source 3: description mentions
    for p in persons:
        desc = p.get('description', '') or ''
        for other in persons:
            oid = other.get('id', '')
            oname = other.get('name', '')
            if oid == p['id'] or not oname:
                continue
            if oname in desc:
                key = tuple(sorted([p['id'], oid]))
                if key not in seen:
                    seen.add(key)
                    rels.append({'source': p['id'], 'target': oid, 'type': '文献共现', 'strength': 0.4, 'year': 0})

    # Source 4: manual
    for src_name, tgt_name, rtype, strength in MANUAL_RELS:
        src_id = name_to_id.get(src_name, '')
        tgt_id = name_to_id.get(tgt_name, '')
        if src_id and tgt_id and src_id != tgt_id:
            key = tuple(sorted([src_id, tgt_id]))
            if key not in seen:
                seen.add(key)
                rels.append({'source': src_id, 'target': tgt_id, 'type': rtype, 'strength': strength, 'year': 0})

    return rels


# ── 异常标注 ─────────────────────────────────
SPECIAL_ANOMALIES = {
    '柔石': '1931年2月7日与殷夫等左联五烈士在龙华就义',
    '殷夫': '1931年2月7日与柔石等左联五烈士在龙华就义',
    '瞿秋白': '1935年6月18日在福建长汀就义',
}


def annotate_anomalies(persons, events, places):
    for p in persons:
        name = p.get('name', '')
        ate = p.get('active_to', None)
        active_from = p.get('active_from', 0)
        if name in SPECIAL_ANOMALIES:
            p['is_anomaly'] = True
            p['anomaly_note'] = SPECIAL_ANOMALIES[name]
            continue
        if ate is not None and ate < 1945:
            if active_from < 1945:
                p['is_anomaly'] = True
                p['anomaly_note'] = f"{name}在{ate}年后史料中未见记载"
        if not p.get('is_anomaly'):
            p['is_anomaly'] = False
            p['anomaly_note'] = ''

    for pl in places:
        rp = safe_list(pl.get('related_persons', []))
        if len(rp) >= 3:
            pl['is_anomaly'] = True
            pl['anomaly_score'] = min(len(rp) / 10, 0.95)
            pl['anomaly_note'] = f"该地点关联{len(rp)}位已知革命人物，史料记载相对有限"
        else:
            pl['is_anomaly'] = False
            pl['anomaly_score'] = 0
            pl['anomaly_note'] = ''


def main():
    log('开始全量数据抓取...')

    log('\n── 抓取人物 ──')
    persons = fetch_persons()
    log(f'人物合计: {len(persons)}条')
    write_json('persons.json', persons)

    log('\n── 抓取地点 ──')
    places = fetch_places()
    log(f'地点合计: {len(places)}条')
    write_json('places.json', places)

    log('\n── 抓取事件 ──')
    events = fetch_events(persons)
    log(f'事件合计: {len(events)}条')
    write_json('events.json', events)

    log('\n── 推断关系 ──')
    relations = infer_relations(persons, events)
    log(f'关系合计: {len(relations)}条')
    write_json('relations.json', relations)

    log('\n── 标注异常 ──')
    annotate_anomalies(persons, events, places)
    anomaly_p = sum(1 for p in persons if p.get('is_anomaly'))
    anomaly_l = sum(1 for pl in places if pl.get('is_anomaly'))
    write_json('persons.json', persons)
    write_json('places.json', places)

    log('\n' + '=' * 50)
    log('抓取完成')
    log(f'人物: {len(persons)}条 (目标50+)')
    log(f'地点: {len(places)}条')
    log(f'事件: {len(events)}条 (目标1000+)')
    log(f'关系: {len(relations)}条')
    log(f'异常人物: {anomaly_p}个')
    log(f'异常地点: {anomaly_l}个')
    log(f'输出目录: {DATA_DIR}')
    log('=' * 50)


if __name__ == '__main__':
    main()
