import json, os, sys, time
import urllib.request, urllib.parse, urllib.error
from common import (
    BASE_URL, API_KEY, DATA_DIR, UA,
    api_get, safe_str, safe_list, safe_int, safe_float,
    extract_data, write_json,
)

PERSON_KW = ['巴金', '鲁迅', '茅盾', '邹韬奋', '胡适', '陈独秀', '李大钊', '蔡元培', '宋庆龄', '邓中夏', '杨明旭', '荣宗任', '李公朴', '傅雷', '熊庆来', '杜府', '郑洛洛', '蒙核', '潘庆勤', '沧明']
PLACE_KW = ['上海', '徐汇区', '黄浦区', '闵行区', '浦东']
EVENT_KW = ['1925','1927','1930','1932','1935','1937']


def build_person_url(kw, page=1, size=20):
    return f"{BASE_URL}/persons/data?name={urllib.parse.quote(kw)}&key={API_KEY}&pageth={page}&pageSize={size}"


def build_place_url(name):
    return f"{BASE_URL}/place/{urllib.parse.quote(name)}?key={API_KEY}"


def build_event_url(text, page=1, size=10):
    return f"{BASE_URL}/webapi/hsly/route/getEventList?eventFreeText={urllib.parse.quote(text)}&key={API_KEY}&pageth={page}&pageSize={size}"


def mask_key(s):
    if not s:
        return s
    return s[:8] + '...' + s[-4:]


def debug_test_url(label, url, headers, timeout=10):
    import json as _j, urllib.request as _ur
    print()
    print('=' * 60)
    print(f'[{label}]')
    print(f'URL: {url}')
    safe = {}
    for k, v in headers.items():
        safe[k] = mask_key(v) if ('key' in k.lower() or 'auth' in k.lower()) else v
    print(f'Headers: {_j.dumps(safe, ensure_ascii=False)}')
    req = _ur.Request(url, headers=headers, method='GET')
    try:
        with _ur.urlopen(req, timeout=timeout) as resp:
            print(f'Status: {resp.status}')
            rh = dict(resp.getheaders())
            for kw in ['X-', 'CF-', 'Server', 'via']:
                waf = {k: v for k, v in rh.items() if k.startswith(kw)}
                if waf:
                    print(f'WAF: {_j.dumps(waf, ensure_ascii=False)}')
            body = resp.read().decode('utf-8', 'replace')[:500]
            print(f'Body:\n{body}')
            return resp.status, body
    except urllib.error.HTTPError as e:
        print(f'Status: {e.code}')
        body = e.read().decode('utf-8', 'replace')[:500]
        print(f'Body:\n{body}')
        return e.code, body
    except Exception as e:
        print(f'Error: {e}')
        return 0, str(e)


def step1_explore():
    print()
    print('=' * 60)
    print('Step 1: API Debug')
    print('=' * 60)
    debug_test_url('Root', 'https://data1.library.sh.cn/', {'User-Agent': UA})
    headers = {'User-Agent': UA}
    for kw in PERSON_KW[:1]:
        debug_test_url('Person', build_person_url(kw, 1, 2), headers)
    for kw in PLACE_KW[:1]:
        debug_test_url('Place', build_place_url(kw), headers)
    for kw in EVENT_KW[:1]:
        debug_test_url('Event', build_event_url(kw, 1, 2), headers)
    print()
    print('Debug complete')


def map_person(item):
    return {
        'id': safe_str(item.get('uri') or item.get('id')),
        'name': safe_str(item.get('fname') or item.get('name')),
        'aliases': safe_list(item.get('otherName') or []),
        'occupation': safe_str(item.get('speciality') or item.get('occupation')),
        'active_from': safe_int(item.get('start') or item.get('activeFrom')),
        'active_to': safe_int(item.get('end') or item.get('activeTo') or 0) or None,
        'district': safe_str(item.get('place') or item.get('district')),
        'organizations': safe_list(item.get('org') or item.get('organization') or []),
        'description': safe_str(item.get('briefBiography') or item.get('description')),
        'source': 'Shanghai Library Open Data',
    }


def map_place(item):
    labels = item.get('label', [])
    name = ''
    for lb in (labels if isinstance(labels, list) else []):
        if isinstance(lb, dict) and lb.get('@language') == 'chs':
            name = lb.get('@value', '')
            break
    lat = safe_float(item.get('lat', '0'))
    lng = safe_float(item.get('long', '0'))
    if not (30.6 <= lat <= 31.85 and 120.8 <= lng <= 122.1):
        lat, lng = 0, 0
    return {
        'id': safe_str(item.get('@id') or item.get('id')),
        'name': name or safe_str(item.get('label')),
        'address': safe_str(item.get('county') or '') + ', ' + safe_str(item.get('city') or '') + ', ' + safe_str(item.get('province') or ''),
        'district': safe_str(item.get('city') or item.get('district') or item.get('county', '')),
        'type': 'place',
        'lat': lat, 'lng': lng,
        'established': 0, 'closed': None,
        'related_persons': [],
        'description': 'Location: ' + safe_str(item.get('province', '')) + ', ' + safe_str(item.get('city', '')),
        'source': 'Shanghai Library Open Data',
    }


def map_event(item):
    return {
        'id': safe_str(item.get('uri') or item.get('id')),
        'name': safe_str(item.get('title') or item.get('name')),
        'date': safe_str(item.get('dateLabel') or item.get('date') or ''),
        'year': safe_int(str(item.get('dateLabel') or item.get('year', ''))[:4]),
        'type': 'event',
        'location_id': '',
        'person_ids': safe_list(item.get('personUri') or item.get('person_ids') or []),
        'description': safe_str(item.get('description') or ''),
        'source': 'Shanghai Library Open Data',
    }


def batch_fetch(url_builder, keywords, limit=20, delay=0.3):
    all_items = []
    for kw in keywords:
        print(f'  [{kw[:20]}]...', end=' ')
        sys.stdout.flush()
        try:
            page = 1
            while True:
                url = url_builder(kw, page, limit)
                data = api_get(url)
                items = extract_data(data)
                if not items:
                    break
                all_items.extend(items)
                pager = data.get('pager', {}) if isinstance(data, dict) else {}
                page_count = int(pager.get('pageCount', 1) or 1)
                if page >= page_count:
                    break
                page += 1
                time.sleep(delay)
            print(f'{len(all_items)} total (last batch: loop complete)')
            time.sleep(delay)
        except Exception as e:
            print(f'ERR: {e}')
    return all_items


def batch_fetch_place(keywords, delay=0.3):
    items = []
    for kw in keywords:
        kw_str = str(kw)[:20]
        print(f'  [{kw_str}]...', end=' ')
        sys.stdout.flush()
        try:
            url = build_place_url(kw)
            import urllib.request as _ur
            req = _ur.Request(url, headers={'User-Agent': UA})
            with _ur.urlopen(req, timeout=15) as resp:
                raw = resp.read().decode('utf-8', errors='replace')
            if raw and raw.strip().startswith('{'):
                data = json.loads(raw)
                if data.get('@id'):
                    items.append(data)
                    print('1 item')
                else:
                    print('no @id')
            else:
                print(f'non-JSON: {(raw[:50])}')
            time.sleep(delay)
        except Exception as e:
            print(f'ERR: {e}')
            time.sleep(delay)
    return items


def infer_relations(events, known_names=None):
    rels = []
    seen = set()
    if known_names is None:
        known_names = set()
    for evt in events:
        desc = evt.get('description', '') or ''
        title = evt.get('name', '') or ''
        text = desc + ' ' + title
        year = int(evt.get('year', 0) or 0)
        found = set()
        for name in known_names:
            if name and len(name) >= 2 and name in text:
                found.add(name)
        if len(found) < 2:
            continue
        flist = list(found)
        for i in range(len(flist)):
            for j in range(i + 1, len(flist)):
                key = tuple(sorted([flist[i], flist[j]]))
                if key in seen:
                    continue
                seen.add(key)
                rels.append({'source': flist[i], 'target': flist[j], 'type': '同事件', 'strength': 0.3, 'year': year})
    return rels


def main():
    step1_explore()
    if '--step' in sys.argv and '1' in sys.argv:
        return

    print('\nFetch persons...')
    rp = batch_fetch(build_person_url, PERSON_KW)
    persons = [map_person(p) for p in rp]

    print('\nFetch places...')
    rl = batch_fetch_place(PLACE_KW)
    places = [map_place(p) for p in rl]

    print('\nFetch events...')
    re = batch_fetch(build_event_url, EVENT_KW)
    events = [map_event(e) for e in re]

    know = set(p.get('name', '') for p in persons if p.get('name'))
    rels = infer_relations(events, know)

    print('\nWrite JSON...')
    write_json('persons.json', persons)
    write_json('places.json', places)
    write_json('events.json', events)
    write_json('relations.json', rels)

    print('\n=== Summary ===')
    print(f'Persons: {len(persons)}')
    print(f'Places: {len(places)}')
    print(f'Events: {len(events)}')
    print(f'Relations: {len(rels)}')


if __name__ == '__main__':
    main()
