"""
DEQODE EARTH — Coastal Loss & Damage Analysis
Cinematic dark UI — full screen map — geospatial intelligence aesthetic
"""

import streamlit as st
import ee
import folium
from streamlit_folium import st_folium
import datetime
import json

st.set_page_config(
    page_title="DEQODE EARTH",
    page_icon="🌏",
    layout="wide",
    initial_sidebar_state="collapsed"
)

SATELLITE_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
SATELLITE_ATTR  = 'Esri World Imagery'

st.markdown("""
<style>
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Outfit:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

  html, body, [class*="css"] { font-family:'Outfit',sans-serif; background:#060608; color:#d0d0d8; }
  .main { background:#060608; }
  .block-container { padding:0 !important; max-width:100% !important; }
  #MainMenu, footer, header { visibility:hidden; }
  div[data-testid="stSidebar"] { display:none; }

  /* Subtle grid */
  .main::before {
    content:''; position:fixed; inset:0;
    background-image:
      linear-gradient(rgba(0,229,160,0.018) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,229,160,0.018) 1px, transparent 1px);
    background-size:64px 64px; pointer-events:none; z-index:0;
  }

  /* ── NAV ── */
  .topnav {
    display:flex; align-items:center; justify-content:space-between;
    padding:16px 48px;
    background:rgba(6,6,8,0.96);
    border-bottom:1px solid rgba(255,255,255,0.04);
    position:sticky; top:0; z-index:200;
    backdrop-filter:blur(16px);
  }
  .nav-left { display:flex; align-items:center; gap:20px; }
  .logo { font-family:'Syne',sans-serif; font-size:1.05rem; font-weight:800; color:#fff; letter-spacing:0.03em; }
  .logo span { color:#00E5A0; }
  .nav-divider { width:1px; height:18px; background:rgba(255,255,255,0.08); }
  .nav-tag { font-family:'DM Mono',monospace; font-size:0.58rem; letter-spacing:0.2em; text-transform:uppercase; color:#aaa; }
  .live-pill {
    display:flex; align-items:center; gap:6px;
    background:rgba(0,229,160,0.07); border:1px solid rgba(0,229,160,0.18);
    padding:5px 12px; border-radius:20px;
    font-family:'DM Mono',monospace; font-size:0.58rem;
    letter-spacing:0.1em; text-transform:uppercase; color:#00E5A0;
  }
  .live-dot { width:5px; height:5px; background:#00E5A0; border-radius:50%; animation:pulse 2s infinite; }
  @keyframes pulse {
    0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(0,229,160,0.5);}
    50%{opacity:.6;box-shadow:0 0 0 6px rgba(0,229,160,0);}
  }

  /* ── HERO ── */
  .hero {
    padding:56px 48px 40px;
    background:linear-gradient(180deg, rgba(0,229,160,0.03) 0%, rgba(6,6,8,0) 100%);
    border-bottom:1px solid rgba(255,255,255,0.04);
    position:relative; overflow:hidden;
  }
  .hero::after {
    content:'';
    position:absolute; top:-120px; right:-80px;
    width:400px; height:400px;
    background:radial-gradient(circle, rgba(0,229,160,0.06) 0%, transparent 70%);
    pointer-events:none;
  }
  .hero-eyebrow {
    font-family:'DM Mono',monospace; font-size:0.6rem;
    letter-spacing:0.22em; text-transform:uppercase;
    color:#00E5A0; margin-bottom:16px;
    display:flex; align-items:center; gap:10px;
  }
  .hero-eyebrow::before {
    content:''; display:none;
  }
  .hero-title {
    font-family:'Outfit',sans-serif;
    font-size:2rem; font-weight:300; color:#ffffff;
    line-height:1.2; margin-bottom:12px;
    max-width:640px;
  }
  .hero-title strong { font-weight:600; }
  .hero-desc {
    font-size:0.88rem; color:#888; line-height:1.7;
    max-width:540px; margin-bottom:0;
  }

  /* ── CONTROLS ── */
  .ctrl-wrap {
    padding:20px 0;
    background:rgba(6,6,8,0.95);
    border-bottom:1px solid rgba(255,255,255,0.04);
  }
  [data-testid="stHorizontalBlock"] {
    padding-left:48px !important;
    padding-right:48px !important;
  }
  .ctrl-label {
    font-family:'DM Mono',monospace; font-size:0.56rem;
    letter-spacing:0.16em; text-transform:uppercase;
    color:#888; margin:0; padding:0 0 6px; display:block;
  }

  /* ── STATUS BAR ── */
  .status-bar {
    display:flex; align-items:center; gap:24px;
    padding:8px 48px;
    background:#060608;
    border-bottom:1px solid rgba(255,255,255,0.03);
    font-family:'DM Mono',monospace;
    font-size:0.56rem; letter-spacing:0.1em; text-transform:uppercase;
  }
  .s-item { display:flex; gap:7px; color:#333; }
  .s-green { color:#00E5A060; }
  .s-amber { color:#F59E0B60; }
  .s-red   { color:#EF444460; }

  /* ── METRIC CARDS ── */
  .cards-row {
    display:grid; grid-template-columns:repeat(3,1fr);
    gap:1px; background:rgba(255,255,255,0.03);
  }
  .card {
    background:#060608; padding:28px 48px;
    position:relative; overflow:hidden;
    transition:background 0.2s;
  }
  .card:hover { background:#08080c; }
  .card::before {
    content:''; position:absolute;
    top:0; left:0; right:0; height:1.5px;
  }
  .card.red::before   { background:linear-gradient(90deg,#EF4444,transparent); }
  .card.green::before { background:linear-gradient(90deg,#00E5A0,transparent); }
  .card.blue::before  { background:linear-gradient(90deg,#3B82F6,transparent); }
  .card-label {
    font-family:'DM Mono',monospace; font-size:0.56rem;
    letter-spacing:0.16em; text-transform:uppercase;
    color:#666; margin-bottom:12px;
  }
  .card-number {
    font-family:'Syne',sans-serif; font-size:1.7rem;
    font-weight:700; color:#fff; line-height:1;
  }
  .card-unit { font-family:'Outfit',sans-serif; font-size:0.9rem; color:#444; }
  .card-human { font-size:0.75rem; color:#555; margin-top:8px; }
  .card-delta { font-family:'DM Mono',monospace; font-size:0.58rem; margin-top:6px; letter-spacing:0.06em; }
  .red-text   { color:#EF444490; }
  .green-text { color:#00E5A090; }
  .blue-text  { color:#3B82F690; }

  /* ── TABS ── */
  .stTabs [data-baseweb="tab-list"] {
    background:#060608 !important;
    border-bottom:1px solid rgba(255,255,255,0.04) !important;
    padding:0 48px !important; gap:0 !important;
  }
  .stTabs [data-baseweb="tab"] {
    font-family:'DM Mono',monospace !important;
    font-size:0.58rem !important; letter-spacing:0.16em !important;
    text-transform:uppercase !important; color:#444 !important;
    background:transparent !important; padding:14px 24px !important;
    border-bottom:2px solid transparent !important;
  }
  .stTabs [aria-selected="true"] {
    color:#00E5A0 !important;
    border-bottom:2px solid #00E5A0 !important;
  }
  .stTabs [data-baseweb="tab-panel"] { padding:0 !important; }

  /* ── MAP — FULL BLEED ── */
  .map-container { margin:0; padding:0; }
  iframe { border:none !important; display:block !important; }
  .stFolium { border:none !important; }
  div[data-testid="stIFrame"] { border:none !important; }

  /* ── EMPTY STATE ── */
  .empty-state {
    display:flex; flex-direction:column;
    align-items:center; justify-content:center;
    height:500px; gap:16px; text-align:center;
    background:#060608;
  }
  .empty-icon { font-size:3rem; opacity:0.15; }
  .empty-title { font-family:'Outfit',sans-serif; font-size:1.1rem; color:#555; font-weight:400; }
  .empty-sub { font-size:0.82rem; color:#333; max-width:320px; line-height:1.6; }

  /* ── SENSOR TAG ── */
  .sensor-tag {
    display:inline-block; font-family:'DM Mono',monospace;
    font-size:0.52rem; letter-spacing:0.1em; text-transform:uppercase;
    padding:2px 8px; border-radius:3px; margin-left:8px; vertical-align:middle;
  }
  .tag-sar  { background:rgba(59,130,246,0.1);  color:#3B82F6;  border:1px solid rgba(59,130,246,0.2); }
  .tag-opt  { background:rgba(245,158,11,0.1);  color:#F59E0B;  border:1px solid rgba(245,158,11,0.2); }
  .tag-dual { background:rgba(0,229,160,0.1);   color:#00E5A0;  border:1px solid rgba(0,229,160,0.2); }

  /* ── REPORT ── */
  .report-wrap { padding:32px 48px; }
  .report-block {
    background:#08080c; border:1px solid rgba(255,255,255,0.05);
    border-radius:6px; padding:24px 28px; margin-bottom:16px;
  }
  .report-heading {
    font-family:'DM Mono',monospace; font-size:0.58rem;
    letter-spacing:0.18em; text-transform:uppercase;
    color:#00E5A0; margin-bottom:14px;
    padding-bottom:10px; border-bottom:1px solid rgba(0,229,160,0.08);
  }
  .report-body { font-size:0.88rem; color:#999; line-height:1.75; }
  .report-body strong { color:#ddd; font-weight:500; }
  .spec-row {
    display:flex; justify-content:space-between; align-items:center;
    padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.03);
    font-size:0.8rem;
  }
  .spec-row:last-child { border-bottom:none; }
  .spec-k { font-family:'DM Mono',monospace; font-size:0.56rem; color:#555; letter-spacing:0.1em; text-transform:uppercase; }
  .spec-v { color:#999; }

  /* ── EXPORT ── */
  .export-wrap { padding:32px 48px; }
  .export-block {
    background:#08080c; border:1px solid rgba(255,255,255,0.05);
    border-radius:6px; padding:24px 28px; max-width:520px;
  }
  .export-title { font-family:'Outfit',sans-serif; font-size:1rem; font-weight:500; color:#ddd; margin-bottom:8px; }
  .export-sub { font-size:0.82rem; color:#666; line-height:1.7; margin-bottom:20px; }

  /* ── BUTTONS ── */
  div[data-testid="stButton"] button {
    background:#00E5A0 !important; color:#060608 !important;
    border:none !important; border-radius:3px !important;
    font-family:'DM Mono',monospace !important;
    font-size:0.65rem !important; letter-spacing:0.16em !important;
    text-transform:uppercase !important; font-weight:600 !important;
    padding:10px 24px !important; transition:all 0.15s !important;
  }
  div[data-testid="stButton"] button:hover {
    background:#00ffb2 !important;
    box-shadow:0 0 20px rgba(0,229,160,0.3) !important;
  }
  .stSelectbox > div > div {
    background:#0a0a0e !important; border-color:rgba(255,255,255,0.06) !important;
    color:#bbb !important; font-size:0.82rem !important; border-radius:3px !important;
  }
  div[data-testid="stHorizontalBlock"] { gap:16px !important; }

  /* ── FOOTER ── */
  .app-footer {
    font-family:'DM Mono',monospace; font-size:0.54rem;
    letter-spacing:0.1em; text-transform:uppercase;
    color:#1a1a1e; text-align:center;
    padding:16px 48px; border-top:1px solid rgba(255,255,255,0.03);
  }
</style>
""", unsafe_allow_html=True)

# ── EARTH ENGINE ──────────────────────────────────────────────────────────────
@st.cache_resource
def init_ee():
    try:
        # Streamlit Cloud — read individual fields from [gee] section
        g = st.secrets["gee"]
        key_data = {
            "type": "service_account",
            "project_id": g["project_id"],
            "private_key_id": g["private_key_id"],
            "private_key": g["private_key"],
            "client_email": g["client_email"],
            "client_id": g["client_id"],
            "token_uri": "https://oauth2.googleapis.com/token",
        }
        credentials = ee.ServiceAccountCredentials(
            email=key_data["client_email"],
            key_data=json.dumps(key_data)
        )
        ee.Initialize(credentials, project='deqode-earth')
        return True, None
    except KeyError:
        # No secrets found — try local personal auth
        try:
            ee.Initialize(project='deqode-earth')
            return True, None
        except Exception as e:
            return False, f"Local auth failed: {e}"
    except Exception as e:
        return False, f"Service account auth failed: {type(e).__name__}: {str(e)[:120]}"

ee_init, ee_error = init_ee()
ee_ready = ee_init

# ── LOCATIONS ─────────────────────────────────────────────────────────────────
LOCATIONS = {
    "🇳🇺  Niue":             {"bbox":[-169.9647,-19.155,-169.78,-18.955], "center":[-19.05,-169.87], "zoom":12, "flag":"🇳🇺", "risk":"HIGH",     "pop":"1,500",      "coords":"19°03'S 169°52'W", "name":"Niue"},
    "🇵🇼  Palau":            {"bbox":[134.4,7.0,134.7,7.4],               "center":[7.2,134.55],     "zoom":11, "flag":"🇵🇼", "risk":"CRITICAL", "pop":"18,000",     "coords":"7°21'N 134°28'E",  "name":"Palau"},
    "🇫🇯  Fiji":             {"bbox":[177.2,-18.2,178.0,-17.5],           "center":[-17.85,177.6],   "zoom":10, "flag":"🇫🇯", "risk":"HIGH",     "pop":"930,000",    "coords":"17°44'S 178°27'E", "name":"Fiji"},
    "🇹🇻  Tuvalu":           {"bbox":[179.0,-8.7,179.3,-8.4],             "center":[-8.52,179.2],    "zoom":13, "flag":"🇹🇻", "risk":"CRITICAL", "pop":"11,000",     "coords":"8°31'S 179°13'E",  "name":"Tuvalu"},
    "🇰🇮  Kiribati":         {"bbox":[172.9,1.3,173.1,1.5],               "center":[1.42,172.98],    "zoom":12, "flag":"🇰🇮", "risk":"CRITICAL", "pop":"119,000",    "coords":"1°25'N 172°59'E",  "name":"Kiribati"},
    "🇲🇭  Marshall Islands": {"bbox":[171.0,7.0,171.4,7.2],               "center":[7.1,171.2],      "zoom":12, "flag":"🇲🇭", "risk":"CRITICAL", "pop":"42,000",     "coords":"7°06'N 171°12'E",  "name":"Marshall Islands"},
    "🇻🇺  Vanuatu":          {"bbox":[168.1,-17.8,168.5,-17.5],           "center":[-17.73,168.32],  "zoom":11, "flag":"🇻🇺", "risk":"HIGH",     "pop":"320,000",    "coords":"17°44'S 168°19'E", "name":"Vanuatu"},
    "🇸🇧  Solomon Islands":  {"bbox":[159.9,-9.5,160.2,-9.3],             "center":[-9.43,160.03],   "zoom":11, "flag":"🇸🇧", "risk":"HIGH",     "pop":"720,000",    "coords":"9°26'S 160°02'E",  "name":"Solomon Islands"},
    "🇫🇲  Micronesia":       {"bbox":[158.1,6.8,158.4,7.0],               "center":[6.92,158.22],    "zoom":12, "flag":"🇫🇲", "risk":"HIGH",     "pop":"115,000",    "coords":"6°55'N 158°13'E",  "name":"Micronesia"},
    "🇹🇴  Tonga":            {"bbox":[-175.4,-21.2,-175.1,-21.0],         "center":[-21.13,-175.2],  "zoom":12, "flag":"🇹🇴", "risk":"HIGH",     "pop":"100,000",    "coords":"21°08'S 175°12'W", "name":"Tonga"},
    "🇼🇸  Samoa":            {"bbox":[-172.1,-13.9,-171.5,-13.5],         "center":[-13.76,-172.1],  "zoom":11, "flag":"🇼🇸", "risk":"HIGH",     "pop":"220,000",    "coords":"13°45'S 172°06'W", "name":"Samoa"},
    "🇵🇬  Papua New Guinea": {"bbox":[147.0,-9.5,147.3,-9.2],             "center":[-9.45,147.18],   "zoom":11, "flag":"🇵🇬", "risk":"MODERATE", "pop":"10,000,000", "coords":"9°27'S 147°11'E",  "name":"Papua New Guinea"},
    "🇧🇩  Bangladesh":       {"bbox":[89.5,21.5,92.7,24.7],               "center":[23.0,90.4],      "zoom":7,  "flag":"🇧🇩", "risk":"CRITICAL", "pop":"170,000,000","coords":"23°41'N 90°21'E",  "name":"Bangladesh"},
    "🇵🇭  Philippines":      {"bbox":[120.9,14.5,121.1,14.7],             "center":[14.59,121.0],    "zoom":10, "flag":"🇵🇭", "risk":"HIGH",     "pop":"115,000,000","coords":"14°35'N 121°00'E", "name":"Philippines"},
    "🇮🇩  Indonesia":        {"bbox":[106.7,-6.3,107.0,-6.1],             "center":[-6.2,106.82],    "zoom":10, "flag":"🇮🇩", "risk":"HIGH",     "pop":"275,000,000","coords":"6°12'S 106°49'E",  "name":"Indonesia"},
    "🇲🇻  Maldives":         {"bbox":[73.4,4.1,73.6,4.3],                 "center":[4.17,73.51],     "zoom":12, "flag":"🇲🇻", "risk":"CRITICAL", "pop":"540,000",    "coords":"4°10'N 73°30'E",   "name":"Maldives"},
    "🇱🇰  Sri Lanka":        {"bbox":[79.8,6.8,80.1,7.1],                 "center":[6.93,79.86],     "zoom":11, "flag":"🇱🇰", "risk":"HIGH",     "pop":"22,000,000", "coords":"6°55'N 79°51'E",   "name":"Sri Lanka"},
    "🇻🇳  Vietnam":          {"bbox":[108.1,16.0,108.3,16.2],             "center":[16.07,108.22],   "zoom":11, "flag":"🇻🇳", "risk":"HIGH",     "pop":"97,000,000", "coords":"16°04'N 108°13'E", "name":"Vietnam"},
    "🇲🇲  Myanmar":          {"bbox":[96.1,16.7,96.3,16.9],               "center":[16.84,96.18],    "zoom":11, "flag":"🇲🇲", "risk":"HIGH",     "pop":"54,000,000", "coords":"16°50'N 96°10'E",  "name":"Myanmar"},
    "🇳🇬  Nigeria":          {"bbox":[3.3,6.3,3.5,6.5],                   "center":[6.45,3.4],       "zoom":11, "flag":"🇳🇬", "risk":"HIGH",     "pop":"220,000,000","coords":"6°27'N 3°24'E",    "name":"Nigeria"},
    "🇲🇿  Mozambique":       {"bbox":[32.5,-25.1,32.7,-24.9],             "center":[-25.0,32.59],    "zoom":11, "flag":"🇲🇿", "risk":"HIGH",     "pop":"33,000,000", "coords":"25°00'S 32°35'E",  "name":"Mozambique"},
    "🇲🇬  Madagascar":       {"bbox":[47.4,-18.9,47.6,-18.7],             "center":[-18.91,47.54],   "zoom":11, "flag":"🇲🇬", "risk":"HIGH",     "pop":"28,000,000", "coords":"18°54'S 47°32'E",  "name":"Madagascar"},
    "🇧🇿  Belize":           {"bbox":[-88.2,17.2,-88.0,17.4],             "center":[17.25,-88.1],    "zoom":11, "flag":"🇧🇿", "risk":"HIGH",     "pop":"400,000",    "coords":"17°15'N 88°06'W",  "name":"Belize"},
    "🇭🇹  Haiti":            {"bbox":[-72.4,18.5,-72.2,18.7],             "center":[18.54,-72.34],   "zoom":11, "flag":"🇭🇹", "risk":"CRITICAL", "pop":"11,000,000", "coords":"18°32'N 72°20'W",  "name":"Haiti"},
    "🇦🇺  Australia":        {"bbox":[115.8,-31.9,116.0,-31.7],           "center":[-31.95,115.86],  "zoom":10, "flag":"🇦🇺", "risk":"MODERATE", "pop":"26,000,000", "coords":"31°57'S 115°51'E", "name":"Australia"},
    "🇳🇿  New Zealand":      {"bbox":[174.7,-36.9,174.9,-36.7],           "center":[-36.85,174.76],  "zoom":10, "flag":"🇳🇿", "risk":"LOW",      "pop":"5,000,000",  "coords":"36°51'S 174°45'E", "name":"New Zealand"},
    "🇯🇵  Japan":            {"bbox":[135.4,34.6,135.6,34.8],             "center":[34.69,135.5],    "zoom":10, "flag":"🇯🇵", "risk":"MODERATE", "pop":"125,000,000","coords":"34°41'N 135°30'E", "name":"Japan"},
    "🇺🇸  United States":    {"bbox":[-80.2,25.7,-80.0,25.9],             "center":[25.77,-80.19],   "zoom":10, "flag":"🇺🇸", "risk":"MODERATE", "pop":"335,000,000","coords":"25°46'N 80°11'W",  "name":"United States"},
    "🇬🇧  United Kingdom":   {"bbox":[-0.2,51.4,0.0,51.6],                "center":[51.5,-0.12],     "zoom":10, "flag":"🇬🇧", "risk":"MODERATE", "pop":"67,000,000", "coords":"51°30'N 0°07'W",   "name":"United Kingdom"},
}

def ha_to_human(ha):
    fields = ha * 1.4
    if fields < 1:   return "less than 1 football field"
    if fields < 100: return f"≈ {fields:.0f} football fields"
    return f"≈ {ha/100:.1f} km²"

# ── SESSION STATE ─────────────────────────────────────────────────────────────
for k,v in [('results',None),('ran',False)]:
    if k not in st.session_state: st.session_state[k] = v

# ── NAV ───────────────────────────────────────────────────────────────────────
st.markdown("""
<div class="topnav">
  <div class="nav-left">
    <div class="logo">DEQODE <span>EARTH</span></div>
    <div class="nav-divider"></div>
    <div class="nav-tag">Coastal Intelligence Platform</div>
  </div>
  <div class="live-pill"><div class="live-dot"></div>Sentinel Live</div>
</div>
""", unsafe_allow_html=True)

# ── HERO ──────────────────────────────────────────────────────────────────────
st.markdown("""
<div class="hero">
  <div class="hero-eyebrow">Asia-Pacific &amp; Global Coastal Intelligence</div>
  <div class="hero-title">
    The ocean is taking land.<br>
    <strong>We measure it.</strong>
  </div>
  <div class="hero-desc">
    Satellite-verified coastal loss and damage analysis for the world's most vulnerable coastlines.
    Select any country, set a time period, and see exactly how much land has been lost or gained, measured from space.
  </div>
</div>
""", unsafe_allow_html=True)

# ── CONTROLS ──────────────────────────────────────────────────────────────────
st.markdown('<div class="ctrl-wrap">', unsafe_allow_html=True)
ca, cb, cc, cd, ce = st.columns([2.5, 1.2, 1.2, 1.4, 0.9])
with ca:
    st.markdown('<span class="ctrl-label">Select country or coastline</span>', unsafe_allow_html=True)
    location = st.selectbox("loc", list(LOCATIONS.keys()), label_visibility="collapsed")
with cb:
    st.markdown('<span class="ctrl-label">Compare from</span>', unsafe_allow_html=True)
    baseline_year = st.selectbox("base", ["2019","2020","2021","2022"], index=1, label_visibility="collapsed")
with cc:
    st.markdown('<span class="ctrl-label">To</span>', unsafe_allow_html=True)
    recent_year = st.selectbox("rec", ["2022","2023","2024","2025"], index=2, label_visibility="collapsed")
with cd:
    st.markdown('<span class="ctrl-label">Data source</span>', unsafe_allow_html=True)
    sensor_pref = st.selectbox("sensor", ["Best available","Radar only","Optical only"], label_visibility="collapsed")
with ce:
    st.markdown('<span class="ctrl-label" style="visibility:hidden">x</span>', unsafe_allow_html=True)
    run = st.button("Analyse", use_container_width=True)
st.markdown('</div>', unsafe_allow_html=True)

cfg      = LOCATIONS[location]
loc_name = cfg['name']

# ── STATUS BAR ────────────────────────────────────────────────────────────────
now = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
risk_cls = "s-red" if cfg['risk'] == "CRITICAL" else "s-amber"
ee_cls   = "s-green" if ee_ready else "s-red"

st.markdown(f"""
<div class="status-bar">
  <div class="s-item">GEE <span class="{ee_cls}">{'ONLINE' if ee_ready else 'OFFLINE'}</span></div>
  <div class="s-item">LOCATION <span class="s-green">{cfg['coords']}</span></div>
  <div class="s-item">POPULATION <span class="s-green">{cfg['pop']}</span></div>
  <div class="s-item">CLIMATE RISK <span class="{risk_cls}">{cfg['risk']}</span></div>
  <div class="s-item">PERIOD <span class="s-green">{baseline_year} → {recent_year}</span></div>
  <div class="s-item">UTC <span class="s-green">{now}</span></div>
</div>
""", unsafe_allow_html=True)

# ── ANALYSIS ──────────────────────────────────────────────────────────────────
def run_analysis(location, baseline_year, recent_year, sensor_pref):
    cfg = LOCATIONS[location]
    aoi = ee.Geometry.Rectangle(cfg["bbox"])

    def s1_col(year):
        return (ee.ImageCollection('COPERNICUS/S1_GRD')
            .filterBounds(aoi).filterDate(f'{year}-01-01',f'{year}-12-31')
            .filter(ee.Filter.eq('instrumentMode','IW'))
            .filter(ee.Filter.listContains('transmitterReceiverPolarisation','VV'))
            .select('VV'))

    def s2_col(year):
        def mask(img):
            qa = img.select('QA60')
            return img.updateMask(qa.bitwiseAnd(1<<10).eq(0).And(qa.bitwiseAnd(1<<11).eq(0)))
        return (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
            .filterBounds(aoi).filterDate(f'{year}-01-01',f'{year}-12-31')
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',30))
            .map(mask).select(['B3','B8']))

    s1b,s1r = s1_col(baseline_year).size().getInfo(), s1_col(recent_year).size().getInfo()
    s2b,s2r = s2_col(baseline_year).size().getInfo(), s2_col(recent_year).size().getInfo()

    use_sar = use_opt = False
    if sensor_pref == "Radar only":
        if s1b==0 or s1r==0: return None,"No radar data found. Try different years or switch to Best available."
        use_sar = True
    elif sensor_pref == "Optical only":
        if s2b==0 or s2r==0: return None,"No optical data found. Try different years or switch to Best available."
        use_opt = True
    else:
        use_sar = (s1b>0 and s1r>0)
        use_opt = (s2b>0 and s2r>0)
        if not use_sar and not use_opt:
            return None,"No satellite data found for this location and period. Try different years."

    result = {'s1_counts':(s1b,s1r),'s2_counts':(s2b,s2r),'use_sar':use_sar,'use_opt':use_opt}

    def area(img, band):
        v = img.multiply(ee.Image.pixelArea()).reduceRegion(
            ee.Reducer.sum(), aoi, scale=10, maxPixels=1e9).get(band).getInfo()
        return v or 0

    def s1_img(year):
        col = s1_col(year)
        asc  = col.filter(ee.Filter.eq('orbitProperties_pass','ASCENDING'))
        desc = col.filter(ee.Filter.eq('orbitProperties_pass','DESCENDING'))
        return (desc if desc.size().getInfo() >= asc.size().getInfo() else asc).mean()

    def s2_ndwi(year):
        return s2_col(year).mean().normalizedDifference(['B3','B8']).rename('ndwi')

    if use_sar:
        b,r = s1_img(baseline_year), s1_img(recent_year)
        chg = r.subtract(b).rename('change')
        wb,wr = b.lt(-15), r.lt(-15)
        loss = wb.eq(0).And(wr.eq(1)); gain = wb.eq(1).And(wr.eq(0))
        result['sar'] = {
            'loss_m2':  area(loss,'VV'), 'gain_m2': area(gain,'VV'),
            'mean_chg': chg.reduceRegion(ee.Reducer.mean(),aoi,10,maxPixels=1e9).get('change').getInfo(),
            'change_id':chg.getMapId({'min':-5,'max':5,'palette':['#EF4444','#F59E0B','#0a0a0e','#3B82F6','#00E5A0']}),
            'loss_id':  loss.getMapId({'min':0,'max':1,'palette':['00000000','EF4444DD']}),
            'gain_id':  gain.getMapId({'min':0,'max':1,'palette':['00000000','00E5A0DD']}),
        }

    if use_opt:
        b,r = s2_ndwi(baseline_year), s2_ndwi(recent_year)
        chg = r.subtract(b).rename('change')
        wb,wr = b.gt(0), r.gt(0)
        loss = wb.eq(0).And(wr.eq(1)); gain = wb.eq(1).And(wr.eq(0))
        result['opt'] = {
            'loss_m2':  area(loss,'ndwi'), 'gain_m2': area(gain,'ndwi'),
            'mean_chg': chg.reduceRegion(ee.Reducer.mean(),aoi,10,maxPixels=1e9).get('change').getInfo() or 0,
            'change_id':chg.getMapId({'min':-0.3,'max':0.3,'palette':['#EF4444','#F59E0B','#0a0a0e','#3B82F6','#00E5A0']}),
            'loss_id':  loss.getMapId({'min':0,'max':1,'palette':['00000000','EF4444DD']}),
            'gain_id':  gain.getMapId({'min':0,'max':1,'palette':['00000000','00E5A0DD']}),
        }

    return result, None

if not ee_ready and ee_error:
    st.error(f"Earth Engine unavailable: {ee_error}")

if run and ee_ready:
    if st.session_state.get('last_run') == (location, baseline_year, recent_year, sensor_pref):
        pass  # same params — skip re-run, show existing results
    else:
        with st.spinner(f"Scanning {cfg['flag']} {loc_name} coastline {baseline_year} → {recent_year}..."):
            res, err = run_analysis(location, baseline_year, recent_year, sensor_pref)
            if err:
                st.error(err)
            else:
                st.session_state.results = res
                st.session_state.last_run = (location, baseline_year, recent_year, sensor_pref)

results = st.session_state.results

# ── METRIC CARDS ──────────────────────────────────────────────────────────────
if results:
    r = results.get('sar') or results.get('opt')
    loss_ha = r['loss_m2']/1e4
    gain_ha = r['gain_m2']/1e4
    net_ha  = gain_ha - loss_ha
    sensor_label = ("Radar + Optical" if results.get('use_sar') and results.get('use_opt')
                    else "Radar" if results.get('use_sar') else "Optical")
    tag_cls = "tag-dual" if (results.get('use_sar') and results.get('use_opt')) else ("tag-sar" if results.get('use_sar') else "tag-opt")

    st.markdown(f"""
    <div class="cards-row">
      <div class="card red">
        <div class="card-label">Land lost to the ocean</div>
        <div class="card-number">{loss_ha:,.2f}<span class="card-unit"> ha</span></div>
        <div class="card-human">{ha_to_human(loss_ha)}</div>
        <div class="card-delta red-text">▼ {baseline_year} → {recent_year}</div>
      </div>
      <div class="card green">
        <div class="card-label">New land formed</div>
        <div class="card-number">{gain_ha:,.2f}<span class="card-unit"> ha</span></div>
        <div class="card-human">{ha_to_human(gain_ha)}</div>
        <div class="card-delta green-text">▲ Accretion detected</div>
      </div>
      <div class="card blue">
        <div class="card-label">Net change <span class="sensor-tag {tag_cls}">{sensor_label}</span></div>
        <div class="card-number">{net_ha:+,.2f}<span class="card-unit"> ha</span></div>
        <div class="card-human">{ha_to_human(abs(net_ha))} {'net loss' if net_ha<0 else 'net gain'}</div>
        <div class="card-delta {'red-text' if net_ha<0 else 'green-text'}">{'▼ Net erosion' if net_ha<0 else '▲ Net accretion'}</div>
      </div>
    </div>
    """, unsafe_allow_html=True)

# ── TABS ──────────────────────────────────────────────────────────────────────
tab_map, tab_report, tab_export = st.tabs(["Map", "Full Report", "Download"])

with tab_map:
    m = folium.Map(
        location=cfg["center"], zoom_start=cfg["zoom"],
        tiles=SATELLITE_TILES, attr=SATELLITE_ATTR,
        prefer_canvas=True
    )
    m.get_root().html.add_child(folium.Element("""
    <style>
      .leaflet-container { background:#060608 !important; }
      .leaflet-control-attribution { display:none !important; }
    </style>
    """))

    folium.Rectangle(
        bounds=[[cfg['bbox'][1],cfg['bbox'][0]],[cfg['bbox'][3],cfg['bbox'][2]]],
        color='#00E5A0', weight=1, fill=True,
        fill_color='#00E5A0', fill_opacity=0.03,
        tooltip=f'{cfg["flag"]} {loc_name} — Analysis zone'
    ).add_to(m)

    if results:
        r_sar = results.get('sar')
        r_opt = results.get('opt')
        rd = r_sar or r_opt
        if rd:
            folium.TileLayer(rd['loss_id']['tile_fetcher'].url_format,   attr='GEE', name='Land lost',   overlay=True, show=True).add_to(m)
            folium.TileLayer(rd['gain_id']['tile_fetcher'].url_format,   attr='GEE', name='Land gained', overlay=True, show=True).add_to(m)
            folium.TileLayer(rd['change_id']['tile_fetcher'].url_format, attr='GEE', name='Change intensity', overlay=True, show=False).add_to(m)

    # Map legend
    m.get_root().html.add_child(folium.Element("""
    <div style="position:fixed;bottom:24px;left:24px;z-index:9999;
                background:rgba(6,6,8,0.9);border:1px solid rgba(255,255,255,0.06);
                border-radius:6px;padding:14px 18px;
                font-family:monospace;font-size:11px;
                letter-spacing:0.08em;text-transform:uppercase;color:#555;">
      <div style="color:#777;margin-bottom:10px;font-size:10px;letter-spacing:0.14em;">Map Legend</div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <div style="width:12px;height:12px;background:#EF4444CC;border-radius:2px;flex-shrink:0;"></div>
        <span style="color:#999">Land lost to ocean</span>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:12px;height:12px;background:#00E5A0CC;border-radius:2px;flex-shrink:0;"></div>
        <span style="color:#999">New land formed</span>
      </div>
    </div>
    """))

    folium.LayerControl(collapsed=True).add_to(m)

    if not results:
        st.markdown("""
        <div class="empty-state">
          <div class="empty-icon">🛰</div>
          <div class="empty-title">Select a location and click Analyse</div>
          <div class="empty-sub">The map will show where coastline has been lost or gained between your two selected years.</div>
        </div>
        """, unsafe_allow_html=True)
    else:
        st_folium(m, height=600, use_container_width=True)

with tab_report:
    if not results:
        st.markdown('<div style="padding:40px 48px;color:#444;font-size:0.85rem;">Run an analysis first.</div>', unsafe_allow_html=True)
    else:
        r = results.get('sar') or results.get('opt')
        s1b,s1r = results['s1_counts']
        s2b,s2r = results['s2_counts']
        loss_ha = r['loss_m2']/1e4; gain_ha = r['gain_m2']/1e4; net_ha = gain_ha - loss_ha
        sensor_label = ("Radar + Optical" if results.get('use_sar') and results.get('use_opt')
                        else "Sentinel-1 Radar" if results.get('use_sar') else "Sentinel-2 Optical")

        st.markdown('<div class="report-wrap">', unsafe_allow_html=True)
        col1, col2 = st.columns([3, 2])
        with col1:
            st.markdown(f"""
            <div class="report-block">
              <div class="report-heading">What the data shows</div>
              <div class="report-body">
                Between <strong>{baseline_year}</strong> and <strong>{recent_year}</strong>,
                the coastline of <strong>{cfg['flag']} {loc_name}</strong> lost
                <strong style="color:#EF4444">{loss_ha:,.2f} hectares</strong> of land to the ocean —
                equivalent to {ha_to_human(loss_ha)}.
                {'This exceeds new land formation, resulting in a net coastal loss — consistent with climate-driven erosion.' if net_ha < 0 else 'New land formation slightly exceeded losses in this period.'}
              </div>
            </div>
            <div class="report-block">
              <div class="report-heading">Santiago Network relevance</div>
              <div class="report-body">
                {loc_name} is a highly vulnerable coastal nation with a population of {cfg['pop']}.
                This analysis provides satellite-verified loss and damage evidence for Santiago Network
                technical assistance submissions — at zero data cost, using free ESA Copernicus infrastructure.
                The methodology is replicable across any coastline globally.
              </div>
            </div>
            """, unsafe_allow_html=True)
        with col2:
            st.markdown(f"""
            <div class="report-block">
              <div class="report-heading">Data specifications</div>
              <div class="spec-row"><span class="spec-k">Location</span><span class="spec-v">{cfg['flag']} {loc_name}</span></div>
              <div class="spec-row"><span class="spec-k">Period</span><span class="spec-v">{baseline_year} → {recent_year}</span></div>
              <div class="spec-row"><span class="spec-k">Sensor</span><span class="spec-v">{sensor_label}</span></div>
              <div class="spec-row"><span class="spec-k">Radar scenes</span><span class="spec-v">{s1b} / {s1r}</span></div>
              <div class="spec-row"><span class="spec-k">Optical scenes</span><span class="spec-v">{s2b} / {s2r}</span></div>
              <div class="spec-row"><span class="spec-k">Resolution</span><span class="spec-v">10m × 10m</span></div>
              <div class="spec-row"><span class="spec-k">Land lost</span><span class="spec-v" style="color:#EF444490">{loss_ha:,.2f} ha</span></div>
              <div class="spec-row"><span class="spec-k">Land gained</span><span class="spec-v" style="color:#00E5A090">{gain_ha:,.2f} ha</span></div>
              <div class="spec-row"><span class="spec-k">Net change</span><span class="spec-v" style="color:{'#EF444490' if net_ha<0 else '#00E5A090'}">{net_ha:+,.2f} ha</span></div>
              <div class="spec-row"><span class="spec-k">Risk level</span><span class="spec-v">{cfg['risk']}</span></div>
              <div class="spec-row"><span class="spec-k">Data source</span><span class="spec-v">ESA Copernicus — Free</span></div>
            </div>
            """, unsafe_allow_html=True)
        st.markdown('</div>', unsafe_allow_html=True)

with tab_export:
    if not results:
        st.markdown('<div style="padding:40px 48px;color:#444;font-size:0.85rem;">Run an analysis first.</div>', unsafe_allow_html=True)
    else:
        r = results.get('sar') or results.get('opt')
        loss_ha = r['loss_m2']/1e4; gain_ha = r['gain_m2']/1e4; net_ha = gain_ha - loss_ha
        sensor_label = ("Radar + Optical" if results.get('use_sar') and results.get('use_opt')
                        else "Sentinel-1 Radar" if results.get('use_sar') else "Sentinel-2 Optical")

        brief = f"""DEQODE EARTH — Coastal Loss & Damage Intelligence Brief
================================================================
Location:     {cfg['flag']} {loc_name}  |  {cfg['coords']}
Population:   {cfg['pop']}  |  Climate Risk: {cfg['risk']}
Period:       {baseline_year} → {recent_year}
Sensor:       {sensor_label}
Generated:    {now}
================================================================

KEY FINDINGS
------------
Land lost to ocean:    {loss_ha:,.2f} ha  ({ha_to_human(loss_ha)})
New land formed:       {gain_ha:,.2f} ha
Net coastal change:    {net_ha:+,.2f} ha  ({'Net loss' if net_ha < 0 else 'Net gain'})

SUMMARY
-------
Between {baseline_year} and {recent_year}, {loc_name} lost {loss_ha:,.2f} hectares
of coastline to the ocean. {'Net coastal loss detected — consistent with climate-driven erosion.' if net_ha < 0 else 'Accretion marginally exceeded erosion during this period.'}

This analysis supports Santiago Network technical assistance requirements
for loss and damage mapping in highly vulnerable coastal nations.

METHODOLOGY
-----------
Data:       {sensor_label} via ESA Copernicus (free and open)
Resolution: 10m × 10m per pixel
Engine:     Google Earth Engine
Method:     Annual composite comparison, water boundary detection

================================================================
DEQODE Group — Sovereign Geospatial Intelligence
deqodegroup.com  |  hello@deqodestudio.com
================================================================
"""
        st.markdown('<div class="export-wrap">', unsafe_allow_html=True)
        st.markdown(f"""
        <div class="export-block">
          <div class="export-title">Intelligence Brief — {cfg['flag']} {loc_name}</div>
          <div class="export-sub">
            Ready to attach to Santiago Network submissions, government briefings,
            or stakeholder presentations.
          </div>
        </div>
        """, unsafe_allow_html=True)
        st.download_button(
            label="Download Intelligence Brief",
            data=brief,
            file_name=f"deqode-earth_{loc_name.lower().replace(' ','-')}_{baseline_year}-{recent_year}.txt",
            mime="text/plain"
        )
        st.markdown('</div>', unsafe_allow_html=True)

# ── FOOTER ────────────────────────────────────────────────────────────────────
st.markdown("""
<div class="app-footer">
  DEQODE EARTH &nbsp;·&nbsp; Sentinel-1 SAR + Sentinel-2 Optical &nbsp;·&nbsp;
  ESA Copernicus Open Data &nbsp;·&nbsp; Google Earth Engine &nbsp;·&nbsp;
  DEQODE Group 2026 &nbsp;·&nbsp; deqodegroup.com
</div>
""", unsafe_allow_html=True)
