import streamlit as st
import time
import subprocess
import pandas as pd
import numpy as np
import ccxt
import random

# --- PAGE CONFIGURATION ---
st.set_page_config(
    page_title="LUMISCAN",
    layout="wide",
    initial_sidebar_state="expanded"  # FORCE SIDEBAR OPEN
)

# --- THEME ---
st.markdown("""
    <style>
    .stApp { background-color: #000000; color: #e0e0e0; font-family: 'Helvetica Neue', sans-serif; }
    h1 { font-weight: 200; letter-spacing: 4px; text-transform: uppercase; font-size: 2.5rem; 
         background: linear-gradient(90deg, #fff, #666); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    h3 { font-family: 'JetBrains Mono', monospace; font-weight: 400; font-size: 14px; color: #666; }
    div[data-testid="stMetricValue"] { font-family: 'JetBrains Mono', monospace; color: #FF5F1F; font-size: 24px; }
    div[data-testid="stMetricLabel"] { font-family: 'Helvetica Neue', sans-serif; font-size: 10px; color: #444; text-transform: uppercase; letter-spacing: 1px; }
    /* BUTTON STYLING */
    div.stButton > button { width: 100%; border-radius: 0px; text-transform: uppercase; font-weight: bold; }
    </style>
    """, unsafe_allow_html=True)

# --- CONFIGURATION ---
RISK_THRESHOLD = 2.5

# --- BINANCE CONNECTION ---
@st.cache_resource
def init_exchange():
    return ccxt.binance()
exchange = init_exchange()

def get_current_price():
    try:
        ticker = exchange.fetch_ticker('BTC/USDT')
        return float(ticker['last'])
    except:
        return 95000.00 

# --- NOISE GENERATOR ---
def generate_initial_history(start_price, points=50):
    history = [start_price]
    current = start_price
    for _ in range(points):
        change = random.uniform(-0.008, 0.008) 
        current = current * (1 + change)
        history.append(current)
    return history[-50:]

# --- CRASH SCENARIO ---
CRASH_PATTERN = [
    0.99, 0.85, 0.82, 0.75, 0.76, 0.75, 0.75, 0.76 
]

# --- STATE MANAGEMENT ---
if 'system_status' not in st.session_state:
    st.session_state.system_status = "NOMINAL"
if 'logs' not in st.session_state:
    st.session_state.logs = []
if 'price_history' not in st.session_state:
    real_p = get_current_price()
    st.session_state.price_history = generate_initial_history(real_p)
if 'scenario_index' not in st.session_state:
    st.session_state.scenario_index = 0
if 'simulation_start_price' not in st.session_state:
    st.session_state.simulation_start_price = 0.0

def log(message):
    timestamp = time.strftime("%H:%M:%S")
    st.session_state.logs.insert(0, f"{timestamp} :: {message}")

# --- BLOCKCHAIN COMMANDS ---
def run_bridge_script():
    log("UPLINK :: THRESHOLD BREACHED. Sending Kill Switch...")
    cmd = ["yarn", "hardhat", "run", "scripts/bridge.ts", "--network", "coston2"]
    try:
        subprocess.run(cmd, capture_output=True, text=True)
        log("UPLINK :: CONTRACT CONFIRMED. ASSETS FROZEN.")
        return True
    except Exception as e:
        log(f"ERROR :: {str(e)}")
        return False

# --- SIDEBAR CONTROLS (MOVED HERE FOR VISIBILITY) ---
with st.sidebar:
    st.title("COMMAND")
    st.write("---")
    
    # SIMULATION BUTTON
    if st.button("INJECT FTX SCENARIO", type="primary"):
        st.session_state.system_status = "SIMULATING"
        st.session_state.scenario_index = 0
        log("WARN :: LARGE WHALE MOVEMENT DETECTED")
        log("SIM :: REPLAYING 'FTX COLLAPSE' PATTERN")
        st.rerun()

    st.write("") # Spacer
    
    # RESET BUTTON
    if st.button("SYSTEM RESET"):
        st.session_state.system_status = "NOMINAL"
        real_p = get_current_price()
        st.session_state.price_history = generate_initial_history(real_p)
        st.session_state.scenario_index = 0
        log("ADMIN :: SYSTEM RESET TO NOMINAL")
        st.rerun()
        
    st.write("---")
    st.caption("LUMISCAN v1.0")

# --- HEADER ---
col_head1, col_head2 = st.columns([3, 1])
with col_head1:
    st.markdown("<h1>LUMISCAN</h1>", unsafe_allow_html=True)
    st.markdown("<h3>AUTONOMOUS RISK PROTOCOL // FLARE NETWORK</h3>", unsafe_allow_html=True)

with col_head2:
    if st.session_state.system_status == "PROTECTED":
        status_color = "#FF5F1F" 
        status_text = "INTERVENTION ACTIVE"
        border_color = "#FF5F1F"
    elif st.session_state.system_status == "SIMULATING":
        status_color = "#FFFF00"
        status_text = "ANALYZING PATTERN..."
        border_color = "#FFFF00"
    else:
        status_color = "#444"
        status_text = "MONITORING"
        border_color = "#444"
        
    st.markdown(f"""
        <div style="text-align: right; margin-top: 20px;">
            <span style="font-family: 'JetBrains Mono'; font-size: 12px; color: {status_color}; border: 1px solid {border_color}; padding: 8px 16px;">
                {status_text}
            </span>
        </div>
    """, unsafe_allow_html=True)

st.divider()

# --- CORE LOGIC ENGINE ---

# 1. DATA INGESTION
if st.session_state.system_status == "NOMINAL":
    last_price = st.session_state.price_history[-1]
    noise = random.uniform(-0.005, 0.005) 
    current_price = last_price * (1 + noise)
    st.session_state.simulation_start_price = current_price 
else:
    if st.session_state.scenario_index < len(CRASH_PATTERN):
        multiplier = CRASH_PATTERN[st.session_state.scenario_index]
        current_price = st.session_state.simulation_start_price * multiplier
        current_price += random.uniform(-200, 200) 
        st.session_state.scenario_index += 1
    else:
        multiplier = CRASH_PATTERN[-1]
        current_price = st.session_state.simulation_start_price * multiplier
        current_price += random.uniform(-100, 100)

st.session_state.price_history.append(current_price)
if len(st.session_state.price_history) > 50:
    st.session_state.price_history.pop(0)

# 2. VOLATILITY CALCULATION
data_slice = st.session_state.price_history[-15:]
mean_price = np.mean(data_slice)
std_dev = np.std(data_slice)
volatility_pct = (std_dev / mean_price) * 100 if mean_price > 0 else 0.0

# 3. TRIGGER LOGIC
if st.session_state.system_status == "SIMULATING":
    if volatility_pct > RISK_THRESHOLD:
        st.session_state.system_status = "PROTECTED"
        run_bridge_script()

# --- METRICS GRID ---
m1, m2, m3, m4 = st.columns(4)

with m1:
    st.metric("ASSET CLASS", "BTC / USDT", "Binance")
with m2:
    st.metric("SPOT PRICE", f"${current_price:,.2f}")
with m3:
    vol_color = "inverse" if volatility_pct > RISK_THRESHOLD else "normal"
    st.metric("VOLATILITY (10M)", f"{volatility_pct:.2f}%", f"Limit: {RISK_THRESHOLD}%", delta_color=vol_color)
with m4:
    iris_state = "CLOSED" if st.session_state.system_status == "PROTECTED" else "OPEN"
    st.metric("IRIS SHUTTER", iris_state, "PROTECTED" if iris_state == "CLOSED" else "PASSIVE")

# --- MAIN CHART ---
st.subheader("MARKET DEPTH")
st.line_chart(st.session_state.price_history, height=350)

# --- FOOTER ---
st.divider()
st.text("EVENT LOGS")
st.text_area("console", "\n".join(st.session_state.logs), height=150, label_visibility="collapsed")

# --- ANIMATION LOOP ---
if st.session_state.system_status == "NOMINAL":
    time.sleep(0.5) 
    st.rerun()
elif st.session_state.system_status in ["SIMULATING", "PROTECTED"]:
    time.sleep(0.1) 
    if st.session_state.scenario_index < len(CRASH_PATTERN):
        st.rerun()