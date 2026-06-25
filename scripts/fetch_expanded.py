#!/usr/bin/env python3
"""
全量数据抓取 — 隐脉申城
覆盖：人物 / 地点（地名志+红色建筑）/ 事件详情 / 机构名录 / 关系推断
"""
import json, os, sys, time, urllib.parse
import urllib.request
from common import (
    BASE_URL, API_KEY, DATA_DIR, UA, DELAY,
    api_get, safe_str, safe_list, safe_int, safe_float,
    extract_data, read_json, write_json, log,
)

# ══════════════════════════════════════════════════════════
# 搜索关键词 — 1930年代上海地下革命网络
# ══════════════════════════════════════════════════════════

PERSON_NAMES = [
    # 核心革命人物
    '鲁迅','茅盾','巴金','郭沫若','丁玲','柔石','殷夫','冯雪峰','夏衍','田汉',
    '洪深','阳翰笙','叶圣陶','郑振铎','胡愈之','李伯钊','瞿秋白','李大钊','陈独秀','蔡元培',
    '宋庆龄','邹韬奋','史沫特莱','沈钧儒','章乃器','邓演达','黄炎培','陶行知',
    '林语堂','徐志摩','胡适','梁实秋','柳亚子','闻一多','朱自清','冰心','张爱玲','苏青','潘汉年',
    '向警予','赵世炎','罗亦农','汪寿华','陈延年','陈乔年','李启汉','刘少奇','邓中夏','恽代英','萧楚女','彭湃',
    # 扩展人物
    '周恩来','毛泽东','董必武','何叔衡','陈潭秋','王尽美','邓恩铭','李达','李汉俊',
    '张国焘','刘仁静','陈公博','周佛海','包惠僧','林伯渠','吴玉章','徐特立','谢觉哉',
    '张太雷','苏兆征','蔡和森','王荷波','项英','关向应','任弼时','陈云','聂荣臻',
    '叶挺','贺龙','刘伯承','方志敏','张闻天','王稼祥','秦邦宪','杨尚昆','李立三',
]

EVENT_KEYWORDS = [
    # 年份
    '1919','1920','1921','1922','1923','1924','1925','1926','1927','1928',
    '1929','1930','1931','1932','1933','1934','1935','1936','1937','1938','1939','1940','1941','1945',
    # 事件类型
    '罢工','示威','集会','逮捕','枪决','牺牲','成立','创刊','停刊','搜查','暗杀','起义','暴动',
    # 上海特定
    '淞沪','五卅','四一二','左联','左翼','地下党','商务印书馆','申报','大公报',
    '龙华','闸北','租界','法租界','公共租界','华界',
    # 组织
    '共产党','共青团','工会','学生会','救国会','抗日',
]

PLACE_KEYWORDS = [
    '上海','虹口','徐汇','卢湾','静安','闸北','南市','普陀','杨浦','浦东',
    '宝山','嘉定','松江','青浦','奉贤','崇明','金山','黄浦','长宁','闵行',
    '法租界','公共租界','华界','租界','苏州河','黄浦江','外滩',
    '北四川路','霞飞路','福州路','四马路','大世界','城隍庙','龙华','江湾',
    '多伦路','山阴路','溧阳路','愚园路','武康路','思南路','南昌路',
]

ORG_KEYWORDS = [
    '商务印书馆','中华书局','申报馆','大公报馆','生活书店','新知书店','读书出版社',
    '左翼作家联盟','左联','中国自由运动大同盟','中国民权保障同盟',
    '上海大学','劳动大学','中华艺术大学','内山书店',
    '共青团','共产党','救国会','抗日救亡','总工会',
    '中国左翼文化界总同盟','中国左翼戏剧家联盟','中国左翼美术家联盟',
    '上海文化界救国会','上海妇女界救国会','上海职业界救国会',
]

ARCH_RED_KEYWORDS = [
    '中共一大会址','中共二大会址','中共四大会址','共青团中央机关旧址',
    '毛泽东旧居','周恩来旧居','鲁迅故居','鲁迅墓','茅盾旧居','瞿秋白旧居',
    '左联成立大会旧址','中国社会主义青年团中央机关旧址',
    '五卅运动纪念碑','龙华烈士陵园','上海总工会旧址',
    '陈云故居','宋庆龄故居','韬奋纪念馆','刘长胜故居','李白烈士故居',
]

# ══════════════════════════════════════════════════════════
# API Endpoints (from api_2026.md)
# ══════════════════════════════════════════════════════════

def api_person_search_freetext(kw, page=1, size=50):
    q = urllib.parse.quote(kw)
    return f"{BASE_URL}/persons/data?freetext={q}&pageth={page}&pageSize={size}&key={API_KEY}"

def api_person_search_fname(name, page=1, size=50):
    q = urllib.parse.quote(name)
    return f"{BASE_URL}/persons/data?fname={q}&pageth={page}&pageSize={size}&key={API_KEY}"

def api_event_list(kw, page=1, size=50):
    q = urllib.parse.quote(kw)
    return f"{BASE_URL}/webapi/hsly/route/getEventList?eventFreeText={q}&pageth={page}&pageSize={size}&key={API_KEY}"

def api_event_detail(uri):
    q = urllib.parse.quote(uri, safe='')
    return f"{BASE_URL}/webapi/hsly/route/getEventDetail?uri={q}&key={API_KEY}"

def api_red_architecture(kw='', is_red='1', page=1, size=50):
    q = urllib.parse.quote(kw)
    return f"{BASE_URL}/shnh/gmwx/webapi/architecture/getArchitectures?freetext={q}&isRed={is_red}&pageth={page}&pageSize={size}&key={API_KEY}"

def api_architecture_detail(uri):
    q = urllib.parse.quote(uri, safe='')
    return f"{BASE_URL}/shnh/gmwx/webapi/architecture/getArchitectureDetail?uri={q}&key={API_KEY}"

def api_gazetteer_list(freetext='', gtype=1, page=1, size=50):
    q = urllib.parse.quote(freetext)
    return f"{BASE_URL}/shnh/dmz/webapi/geonames/list?freetext={q}&type={gtype}&pageth={page}&pageSize={size}&key={API_KEY}"

def api_org_list(kw, page=1, size=50):
    q = urllib.parse.quote(kw)
    return f"{BASE_URL}/shnh/whzk/webapi/org/list?freetext={q}&pageth={page}&pageSize={size}&key={API_KEY}"

def api_wkl_building_list(freetext='', page=1, size=50):
    q = urllib.parse.quote(freetext)
    return f"{BASE_URL}/shnh/wkl/webapi/building/list?freetext={q}&pageth={page}&pageSize={size}&key={API_KEY}"

def api_wkl_building_event_list(buri):
    q = urllib.parse.quote(buri, safe='')
    return f"{BASE_URL}/shnh/wkl/webapi/building/event/list?buri={q}&key={API_KEY}"

def api_jsonld(uri):
    q = urllib.parse.quote(uri, safe='')
    return f"{BASE_URL}/data/jsonld?uri={q}&key={API_KEY}"

def api_place(name):
    q = urllib.parse.quote(name)
    return f"{BASE_URL}/place/{q}?key={API_KEY}"


# ══════════════════════════════════════════════════════════
# Batch fetchers with pagination
# ══════════════════════════════════════════════════════════

def batch_fetch(url_builder, keywords, label='', size=50, max_pages=20):
    """Generic batch fetcher with pagination."""
    results = []
    for kw in keywords:
        kw_short = str(kw)[:20]
        count = 0
        try:
            for page in range(1, max_pages + 1):
                url = url_builder(kw, page, size)
                data = api_get(url)
                items = extract_data(data)
                if not items:
                    break
                results.extend(items)
                count += len(items)
                pager = data.get('pager', {}) if isinstance(data, dict) else {}
                page_count = int(pager.get('pageCount', 1) or 1)
                if page >= page_count:
                    break
                time.sleep(DELAY)
            log(f'  [{label}] {kw_short} → {count}条')
        except Exception as e:
            log(f'  [{label}] {kw_short} → 失败: {str(e)[:60]}')
        time.sleep(DELAY)
    return results


def batch_fetch_single(url_builder, keywords, label=''):
    """Batch fetcher for single-item endpoints (no pagination)."""
    results = []
    for kw in keywords:
        kw_short = str(kw)[:30]
        try:
            url = url_builder(kw)
            data = api_get(url)
            if isinstance(data, dict) and data.get('@id'):
                results.append(data)
                log(f'  [{label}] {kw_short} → 成功')
            elif isinstance(data, dict) and data.get('data'):
                results.append(data)
                log(f'  [{label}] {kw_short} → 成功')
            else:
                log(f'  [{label}] {kw_short} → 无数据')
        except Exception as e:
            log(f'  [{label}] {kw_short} → 失败: {str(e)[:50]}')
        time.sleep(DELAY)
    return results


# ══════════════════════════════════════════════════════════
# Data mappers
# ══════════════════════════════════════════════════════════

def map_person(item):
    birth_place = safe_str(item.get('birthPlace') or item.get('place') or '')
    return {
        'id': safe_str(item.get('uri') or item.get('id')),
        'name': safe_str(item.get('fname') or item.get('name') or item.get('title')),
        'aliases': safe_list(item.get('otherName') or item.get('alias') or []),
        'occupation': safe_str(item.get('speciality') or item.get('occupation') or ''),
        'active_from': safe_int(item.get('start') or item.get('activeFrom') or item.get('birthday')),
        'active_to': safe_int(item.get('end') or item.get('activeTo') or item.get('deathday') or 0) or None,
        'district': safe_str(item.get('district') or birth_place),
        'organizations': safe_list(item.get('org') or item.get('organization') or item.get('affiliation') or []),
        'description': safe_str(item.get('briefBiography') or item.get('description') or ''),
        'source': '上海图书馆开放数据平台',
    }


def map_place(item):
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
    return {
        'id': safe_str(item.get('@id') or item.get('uri') or item.get('id')),
        'name': cn_name or safe_str(item.get('name') or item.get('label')),
        'address': safe_str(item.get('address') or safe_str(item.get('county', ''))),
        'district': safe_str(item.get('city') or item.get('district') or item.get('county', '')),
        'type': '地点',
        'lat': lat, 'lng': lng,
        'established': 0, 'closed': None,
        'related_persons': [],
        'description': safe_str(item.get('description') or item.get('des') or ''),
        'source': '上海图书馆开放数据平台',
    }


def map_architecture(item):
    lat = safe_float(item.get('lat', '0'))
    lng = safe_float(item.get('long', '0'))
    if not (30.6 <= lat <= 31.85 and 120.8 <= lng <= 122.1):
        lat, lng = 0, 0
    return {
        'id': safe_str(item.get('uri')),
        'name': safe_str(item.get('nameS') or item.get('nameT') or item.get('nameE')),
        'address': safe_str(item.get('address') or ''),
        'district': safe_str(item.get('placeValue') or ''),
        'type': '红色遗址',
        'lat': lat, 'lng': lng,
        'established': 0, 'closed': None,
        'related_persons': [],
        'description': safe_str(item.get('des') or ''),
        'source': '上海图书馆·红色旅游',
    }


def map_event(item):
    return {
        'id': safe_str(item.get('uri') or item.get('id')),
        'name': safe_str(item.get('title') or item.get('name')),
        'date': safe_str(item.get('dateLabel') or item.get('date') or ''),
        'year': safe_int(str(item.get('dateLabel') or item.get('year') or '')[:4]),
        'type': '事件',
        'location_id': safe_str(item.get('placeUri') or item.get('location') or ''),
        'person_ids': safe_list(item.get('personUri') or item.get('personIds') or []),
        'description': safe_str(item.get('description') or ''),
        'source': '上海图书馆开放数据平台',
    }


def map_organization(item):
    name_val = safe_str(item.get('name') or item.get('label'))
    if isinstance(item.get('name'), list):
        for entry in item['name']:
            if isinstance(entry, dict) and entry.get('@language') == 'chs':
                name_val = entry.get('@value', name_val)
                break
    return {
        'id': safe_str(item.get('uri') or item.get('@id')),
        'name': name_val,
        'type': '组织',
        'description': safe_str(item.get('description') or ''),
        'source': '上海图书馆·机构名录',
    }


# ══════════════════════════════════════════════════════════
# Relation inference
# ══════════════════════════════════════════════════════════

def infer_relations_from_events(event_details, person_id_set, org_id_set):
    """Extract relations from event detail personList/organizationList/placeList.
    API returns {data: [{personList, placeList, organizationList}]} — lists are
    nested inside each data item, not at the top level."""
    person_rel = []
    org_rel = []
    seen_pr = set()
    seen_or = set()

    for detail in event_details:
        evt_id = detail.get('uri', '')
        for data_item in detail.get('data', []) or []:
            evt_year = safe_int(str(data_item.get('dateLabel') or data_item.get('year') or '')[:4])
            plist = data_item.get('personList', []) or []
            olist = data_item.get('organizationList', []) or []

            # Person ↔ Person via event
            for i in range(len(plist)):
                for j in range(i + 1, len(plist)):
                    pu1 = safe_str(plist[i].get('uri') if isinstance(plist[i], dict) else str(plist[i]))
                    pu2 = safe_str(plist[j].get('uri') if isinstance(plist[j], dict) else str(plist[j]))
                    if not pu1 or not pu2:
                        continue
                    key = tuple(sorted([pu1, pu2]))
                    if key not in seen_pr:
                        seen_pr.add(key)
                        person_rel.append({
                            'source': pu1, 'target': pu2, 'type': '事件共现',
                            'strength': 0.5, 'year': evt_year, 'event_id': evt_id,
                        })

            # Person ↔ Org
            for pitem in plist:
                pu = safe_str(pitem.get('uri') if isinstance(pitem, dict) else str(pitem))
                if not pu:
                    continue
                for oitem in olist:
                    ou = safe_str(oitem.get('uri') if isinstance(oitem, dict) else str(oitem))
                    if not ou:
                        continue
                    key = (pu, ou)
                    if key not in seen_or:
                        seen_or.add(key)
                        org_rel.append({
                            'person_id': pu, 'org_id': ou, 'type': '参与事件',
                            'strength': 0.4, 'year': evt_year,
                        })

    return person_rel, org_rel


def infer_relations_co_org(persons):
    """Co-membership in same organization."""
    rels = []
    seen = set()
    for i in range(len(persons)):
        for j in range(i + 1, len(persons)):
            pi, pj = persons[i], persons[j]
            oi = set(safe_list(pi.get('organizations', [])))
            oj = set(safe_list(pj.get('organizations', [])))
            common = oi & oj
            if common:
                pid_i = pi.get('id', '')
                pid_j = pj.get('id', '')
                key = tuple(sorted([pid_i, pid_j]))
                if key not in seen:
                    seen.add(key)
                    rels.append({
                        'source': pid_i, 'target': pid_j,
                        'type': '同组织成员', 'strength': 0.6, 'year': 0,
                        'org_name': list(common)[0] if common else '',
                    })
    return rels


# ══════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════

def main():
    log('=' * 60)
    log('隐脉申城 · 全量数据抓取')
    log(f'目标 API: {BASE_URL}')
    log('=' * 60)

    # Safety initializations (populated by phases)
    wkl_buildings = []
    wkl_events = []

    # ── 1. 人物 ──
    log('\n' + '─' * 40)
    log('1/7 抓取人物 (fname + freetext)')
    log('─' * 40)
    all_person_ids = set()
    persons_raw = []

    # by name
    for name in PERSON_NAMES:
        try:
            data = api_get(api_person_search_fname(name))
            items = extract_data(data)
            for item in items:
                pid = safe_str(item.get('uri') or item.get('id'))
                if pid and pid not in all_person_ids:
                    all_person_ids.add(pid)
                    persons_raw.append(item)
            log(f'  [人物-fname] {name} → {len(items)}条')
            time.sleep(DELAY)
        except Exception as e:
            log(f'  [人物-fname] {name} → 失败: {str(e)[:50]}')
            time.sleep(DELAY)

    # broad freetext search for additional persons
    extra_kw = ['革命','左联','地下党','上海','作家','共产党']
    for kw in extra_kw:
        try:
            data = api_get(api_person_search_freetext(kw))
            items = extract_data(data)
            added = 0
            for item in items:
                pid = safe_str(item.get('uri') or item.get('id'))
                if pid and pid not in all_person_ids:
                    all_person_ids.add(pid)
                    persons_raw.append(item)
                    added += 1
            log(f'  [人物-freetext] {kw} → +{added}新 ({len(items)}条总数)')
            time.sleep(DELAY)
        except Exception as e:
            log(f'  [人物-freetext] {kw} → 失败: {str(e)[:50]}')
            time.sleep(DELAY)

    persons = [map_person(p) for p in persons_raw]
    log(f'人物合计: {len(persons)}条')

    # ── 2. 事件 ──
    log('\n' + '─' * 40)
    log('2/7 抓取事件')
    log('─' * 40)
    seen_event_ids = set()
    events_raw = batch_fetch(api_event_list, EVENT_KEYWORDS, '事件')
    events = []
    for item in events_raw:
        eid = safe_str(item.get('uri') or item.get('id'))
        if eid and eid not in seen_event_ids:
            seen_event_ids.add(eid)
            events.append(map_event(item))
        elif not eid:
            events.append(map_event(item))
    log(f'事件合计: {len(events)}条 (去重后)')

    # ── 3. 事件详情 (获取 personList, placeList, orgList) ──
    log('\n' + '─' * 40)
    log('3/7 抓取事件详情 (获取关联人物/地点/机构)')
    log('─' * 40)
    event_details = []
    new_person_ids = set()
    new_place_ids = set()
    new_org_ids = set()

    for i, evt in enumerate(events[:500]):  # 限制500个事件详情避免过多请求
        eid = evt.get('id', '')
        if not eid:
            continue
        try:
            detail = api_get(api_event_detail(eid))
            if isinstance(detail, dict):
                event_details.append(detail)
                # API returns {data: [{personList, placeList, organizationList}]}
                for data_item in detail.get('data', []) or []:
                    for p in safe_list(data_item.get('personList', [])):
                        pu = safe_str(p.get('uri') if isinstance(p, dict) else str(p))
                        if pu:
                            new_person_ids.add(pu)
                    for pl in safe_list(data_item.get('placeList', [])):
                        pu = safe_str(pl.get('uri') if isinstance(pl, dict) else str(pl))
                        if pu:
                            new_place_ids.add(pu)
                    for o in safe_list(data_item.get('organizationList', [])):
                        ou = safe_str(o.get('uri') if isinstance(o, dict) else str(o))
                        if ou:
                            new_org_ids.add(ou)
            if (i + 1) % 50 == 0:
                log(f'  事件详情进度: {i+1}/{min(len(events), 500)}')
            time.sleep(DELAY * 0.5)
        except Exception as e:
            pass  # skip detail failures

    log(f'事件详情: {len(event_details)}条')
    log(f'从事件中发现: {len(new_person_ids)}个人物URI, {len(new_place_ids)}个地点URI, {len(new_org_ids)}个机构URI')

    # ── 4. 红色旅游建筑 ──
    log('\n' + '─' * 40)
    log('4/7 抓取红色旅游建筑')
    log('─' * 40)
    arch_raw = []
    # Query all red buildings (empty freetext, different isRed values)
    for red_val in ['1', '2', '3']:
        try:
            data = api_get(api_red_architecture(kw='', is_red=red_val, page=1, size=200))
            items = extract_data(data)
            arch_raw.extend(items)
            log(f'  [红色建筑] isRed={red_val} → {len(items)}条')
        except Exception as e:
            log(f'  [红色建筑] isRed={red_val} → 失败: {str(e)[:50]}')
        time.sleep(DELAY)
    # Also search by keyword
    for kw_set in [ARCH_RED_KEYWORDS, ['上海','革命','旧址','故居','纪念馆','中共','鲁迅','陈云','宋庆龄']]:
        arch_raw += batch_fetch(
            lambda kw, page, size: api_red_architecture(kw=kw, page=page, size=size),
            kw_set, '红色建筑-kw',
        )

    arch_seen = set()
    architectures = []
    for item in arch_raw:
        aid = safe_str(item.get('uri'))
        if aid and aid not in arch_seen:
            arch_seen.add(aid)
            architectures.append(map_architecture(item))

    # Architecture details for events/persons
    arch_details = []
    for arch in architectures[:50]:  # limit
        aid = arch.get('id', '')
        if not aid:
            continue
        try:
            detail = api_get(api_architecture_detail(aid))
            if isinstance(detail, dict):
                arch_details.append(detail)
                data = detail.get('data', {}) or {}
                # Extract events from architecture
                for evt in safe_list(data.get('eventList', [])):
                    eu = safe_str(evt.get('uri') if isinstance(evt, dict) else str(evt))
                for p in safe_list(data.get('personList', [])):
                    pu = safe_str(p.get('uri') if isinstance(p, dict) else str(p))
                    if pu: new_person_ids.add(pu)
            time.sleep(DELAY * 0.5)
        except Exception:
            pass

    log(f'红色建筑: {len(architectures)}条, 详情: {len(arch_details)}条')

    # ── 4b. 武康路建筑 (含嵌入事件) ──
    log('\n' + '─' * 40)
    log('4b/7 抓取武康路建筑列表 (含嵌入事件)')
    log('─' * 40)
    wkl_buildings_raw = []
    wkl_kw = ['武康路','上海','虹口','徐汇','静安','黄浦','卢湾','法租界','公共租界','霞飞路','愚园路','思南路','多伦路']
    for kw in wkl_kw:
        try:
            data = api_get(api_wkl_building_list(freetext=kw, page=1, size=100))
            items = extract_data(data)
            wkl_buildings_raw.extend(items)
            log(f'  [武康路建筑] {kw} → {len(items)}条')
        except Exception as e:
            log(f'  [武康路建筑] {kw} → 失败: {str(e)[:50]}')
        time.sleep(DELAY)

    # Dedup WKL buildings
    wkl_seen = set()
    wkl_buildings = []
    wkl_events = []
    wkl_event_ids = set()
    for item in wkl_buildings_raw:
        buri = safe_str(item.get('uri'))
        if buri and buri not in wkl_seen:
            wkl_seen.add(buri)
            wkl_buildings.append(item)
            # Extract embedded events
            for evt in safe_list(item.get('event', [])):
                eid = safe_str(evt.get('event') if isinstance(evt, dict) else str(evt))
                if eid and eid not in wkl_event_ids:
                    wkl_event_ids.add(eid)
                    wkl_events.append({
                        'id': eid,
                        'name': safe_str(evt.get('description') if isinstance(evt, dict) else str(evt))[:80],
                        'date': safe_str(evt.get('startedAtTime') if isinstance(evt, dict) else ''),
                        'year': safe_int(str(evt.get('startedAtTime', ''))[:4] if isinstance(evt, dict) else 0),
                        'type': '建筑事件',
                        'location_id': buri,
                        'person_ids': [],
                        'description': safe_str(evt.get('description') if isinstance(evt, dict) else str(evt)),
                        'source': '上海图书馆·武康路建筑',
                    })

    # Fetch building events for top buildings (sample)
    wkl_evt_details = []
    for bld in wkl_buildings[:100]:
        buri = bld.get('uri', '')
        if not buri:
            continue
        try:
            edata = api_get(api_wkl_building_event_list(buri))
            items = extract_data(edata)
            for evt in items:
                eid = safe_str(evt.get('event') if isinstance(evt, dict) else str(evt))
                if eid and eid not in wkl_event_ids:
                    wkl_event_ids.add(eid)
                    wkl_events.append({
                        'id': eid,
                        'name': safe_str(evt.get('description') if isinstance(evt, dict) else str(evt))[:80],
                        'date': safe_str(evt.get('startedAtTime') if isinstance(evt, dict) else ''),
                        'year': safe_int(str(evt.get('startedAtTime', ''))[:4] if isinstance(evt, dict) else 0),
                        'type': '建筑事件',
                        'location_id': buri,
                        'person_ids': [],
                        'description': safe_str(evt.get('description') if isinstance(evt, dict) else str(evt)),
                        'source': '上海图书馆·武康路建筑',
                    })
            wkl_evt_details.append({'buri': buri, 'events': items})
            time.sleep(DELAY * 0.3)
        except Exception:
            pass

    log(f'武康路建筑: {len(wkl_buildings)}条, 建筑事件: {len(wkl_events)}条')

    # ── 5. 上海地名志 ──
    log('\n' + '─' * 40)
    log('5/7 抓取上海地名志 (4种类型)')
    log('─' * 40)
    places_raw = []
    for gtype in [1, 2, 3, 4]:  # 自然地理/政区/居民点/经济文化
        type_names = {1: '自然地理', 2: '政区地名', 3: '居民点', 4: '经济文化'}
        items = batch_fetch(
            lambda kw, page, size: api_gazetteer_list(kw, gtype, page, size),
            PLACE_KEYWORDS[:5] + ['上海'],
            f'地名志-{type_names[gtype]}',
        )
        places_raw += items
        time.sleep(DELAY)

    # Also fetch places by name via /place/{name}
    for kw in PLACE_KEYWORDS:
        try:
            url = api_place(kw)
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=15) as resp:
                raw = resp.read().decode('utf-8', errors='replace')
            if raw and raw.strip().startswith('{'):
                data = json.loads(raw)
                if data.get('@id'):
                    places_raw.append(data)
            time.sleep(DELAY)
        except Exception:
            time.sleep(DELAY)

    place_seen = set()
    places = []
    for item in places_raw:
        pid = safe_str(item.get('@id') or item.get('uri') or item.get('id'))
        if pid and pid not in place_seen:
            place_seen.add(pid)
            places.append(map_place(item))

    # Add architectures as places too
    for arch in architectures:
        pid = arch.get('id', '')
        if pid and pid not in place_seen:
            place_seen.add(pid)
            places.append(arch)

    log(f'地点合计: {len(places)}条 (含红色建筑)')

    # ── 6. 机构名录 ──
    log('\n' + '─' * 40)
    log('6/7 抓取机构名录')
    log('─' * 40)
    org_raw = batch_fetch(api_org_list, ORG_KEYWORDS, '机构')
    org_seen = set()
    organizations = []
    for item in org_raw:
        oid = safe_str(item.get('uri') or item.get('@id'))
        if oid and oid not in org_seen:
            org_seen.add(oid)
            organizations.append(map_organization(item))
    log(f'机构合计: {len(organizations)}条')

    # ── 关系推断 ──
    log('\n' + '─' * 40)
    log('推断关系网络')
    log('─' * 40)

    person_id_set = {p['id'] for p in persons if p.get('id')}
    relations = []

    # 从事件详情提取关系
    pr, _ = infer_relations_from_events(event_details, person_id_set, set())
    relations += pr

    # 同组织成员关系
    relations += infer_relations_co_org(persons)

    # 手动标注的关键关系
    MANUAL_KEY_RELS = [
        ('鲁迅','茅盾','合作',0.9), ('鲁迅','瞿秋白','合作',0.85),
        ('鲁迅','冯雪峰','合作',0.8), ('巴金','茅盾','合作',0.7),
        ('邹韬奋','宋庆龄','合作',0.75), ('丁玲','冯雪峰','合作',0.7),
        ('田汉','夏衍','合作',0.8), ('柔石','殷夫','同时被捕',0.9),
        ('瞿秋白','柔石','同时被捕',0.85),
        ('陈独秀','李大钊','合作',0.9), ('周恩来','邓颖超','夫妻',1.0),
    ]

    name_to_id = {p.get('name', ''): p.get('id', '') for p in persons}
    seen_rel = set()
    for r in relations:
        seen_rel.add(tuple(sorted([r.get('source',''), r.get('target','')])))

    for src_name, tgt_name, rtype, strength in MANUAL_KEY_RELS:
        src_id = name_to_id.get(src_name, '')
        tgt_id = name_to_id.get(tgt_name, '')
        if src_id and tgt_id and src_id != tgt_id:
            key = tuple(sorted([src_id, tgt_id]))
            if key not in seen_rel:
                seen_rel.add(key)
                relations.append({
                    'source': src_id, 'target': tgt_id,
                    'type': rtype, 'strength': strength, 'year': 0,
                })

    log(f'关系合计: {len(relations)}条')

    # ── 异常标注 ──
    log('\n' + '─' * 40)
    log('标注历史异常')
    log('─' * 40)

    SPECIAL_ANOMALIES = {
        '柔石': '1931年2月7日与殷夫等左联五烈士在龙华就义',
        '殷夫': '1931年2月7日与柔石等左联五烈士在龙华就义',
        '瞿秋白': '1935年6月18日在福建长汀就义',
        '赵世炎': '1927年7月19日在上海龙华就义',
        '罗亦农': '1928年4月21日在上海龙华就义',
        '陈延年': '1927年7月4日在上海龙华就义',
        '陈乔年': '1928年6月6日在上海龙华就义',
        '向警予': '1928年5月1日在武汉就义',
        '汪寿华': '1927年4月11日在上海被暗杀',
        '彭湃': '1929年8月30日在上海龙华就义',
        '邓中夏': '1933年9月21日在南京就义',
        '恽代英': '1931年4月29日在南京就义',
    }

    for p in persons:
        name = p.get('name', '')
        ate = p.get('active_to', None)
        active_from = p.get('active_from', 0)
        if name in SPECIAL_ANOMALIES:
            p['is_anomaly'] = True
            p['anomaly_note'] = SPECIAL_ANOMALIES[name]
        elif ate is not None and ate < 1945 and active_from < 1945:
            p['is_anomaly'] = True
            p['anomaly_note'] = f"{name}在{ate}年后史料中未见记载"
        else:
            p['is_anomaly'] = False
            p['anomaly_note'] = ''

    for pl in places:
        rp = safe_list(pl.get('related_persons', []))
        pl['is_anomaly'] = len(rp) >= 3
        pl['anomaly_score'] = min(len(rp) / 10, 0.95) if len(rp) >= 3 else 0
        pl['anomaly_note'] = f"关联{len(rp)}位已知革命人物" if len(rp) >= 3 else ''

    # Merge WKL building events into main events list
    wkl_as_events = [e for e in wkl_events if e.get('year', 0) >= 1900]
    all_events = events + wkl_as_events

    # ── Write output ──
    log('\n' + '─' * 40)
    log('写入数据文件')
    log('─' * 40)

    write_json('persons.json', persons)
    write_json('places.json', places)
    write_json('events.json', all_events)
    write_json('relations.json', relations)
    write_json('organizations.json', organizations)

    # Also export event_details for reference
    os.makedirs(DATA_DIR, exist_ok=True)
    detail_path = os.path.join(DATA_DIR, 'event_details.json')
    with open(detail_path, 'w', encoding='utf-8') as f:
        json.dump(event_details, f, ensure_ascii=False, indent=2)

    # Also export WKL building data
    wkl_path = os.path.join(DATA_DIR, 'wkl_buildings.json')
    with open(wkl_path, 'w', encoding='utf-8') as f:
        json.dump(wkl_buildings, f, ensure_ascii=False, indent=2)

    # ── Summary ──
    anomaly_p = sum(1 for p in persons if p.get('is_anomaly'))
    anomaly_l = sum(1 for pl in places if pl.get('is_anomaly'))
    log('\n' + '=' * 60)
    log('全量抓取完成！')
    log(f'人物:   {len(persons)}条 (异常: {anomaly_p})')
    log(f'地点:   {len(places)}条 (异常: {anomaly_l})')
    log(f'事件:   {len(all_events)}条 (含建筑事件{len(wkl_as_events)}条)')
    log(f'关系:   {len(relations)}条')
    log(f'机构:   {len(organizations)}条')
    log(f'武康路建筑: {len(wkl_buildings)}条')
    log(f'事件详情: {len(event_details)}条')
    log(f'输出:   {DATA_DIR}')
    log('=' * 60)


if __name__ == '__main__':
    main()
