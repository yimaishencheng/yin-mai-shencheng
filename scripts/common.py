import json, os, time
import urllib.request, urllib.error

BASE_URL = 'https://data1.library.sh.cn'
API_KEY = os.environ.get('SH_LIBRARY_API_KEY', '')
if not API_KEY:
    raise SystemExit('请设置环境变量 SH_LIBRARY_API_KEY')

PROJ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(PROJ, 'src', 'data')
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
DELAY = 0.3
MAX_RETRIES = 3


def api_get(url, timeout=15):
    """GET JSON with retry and exponential backoff."""
    headers = {'User-Agent': UA}
    last_err = None
    for attempt in range(MAX_RETRIES):
        try:
            req = urllib.request.Request(url, headers=headers, method='GET')
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            if e.code in (429, 503):
                wait = (2 ** attempt) * DELAY
                time.sleep(wait)
                last_err = e
                continue
            raise
        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                wait = (2 ** attempt) * DELAY
                time.sleep(wait)
                last_err = e
                continue
            raise
    raise last_err or RuntimeError('api_get failed after retries')


# ── Safe accessors ─────────────────────────────────

def safe_str(v, d=''):
    if v is None:
        return d
    if isinstance(v, list):
        return str(v[0]) if v else d
    return str(v)


def safe_list(v, d=None):
    if d is None:
        d = []
    if v is None:
        return d
    if isinstance(v, str):
        return [v]
    if isinstance(v, list):
        return v
    return d


def safe_int(v, d=0):
    if v is None:
        return d
    try:
        return int(float(str(v)))
    except (ValueError, TypeError):
        return d


def safe_float(v, d=0.0):
    if v is None:
        return d
    try:
        return float(str(v))
    except (ValueError, TypeError):
        return d


def extract_data(resp):
    if isinstance(resp, dict):
        d = resp.get('data')
        if d is not None:
            return d if isinstance(d, list) else [d]
    if isinstance(resp, list):
        return resp
    return []


# ── I/O helpers ─────────────────────────────────

def read_json(fn):
    fp = os.path.join(DATA_DIR, fn)
    if os.path.exists(fp):
        with open(fp, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []


def write_json(fn, data):
    os.makedirs(DATA_DIR, exist_ok=True)
    fp = os.path.join(DATA_DIR, fn)
    with open(fp, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return fp


def log(s):
    print(s, flush=True)
