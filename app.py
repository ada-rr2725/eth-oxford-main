import streamlit as st
import time
import subprocess
import pandas as pd
import random

# --- PAGE CONFIGURATION ---
st.set_page_config(layout="wide", page_title="Sonar | System Admin")

# --- STATE MANAGEMENT ---
if 'is_risk_active' not in st.session_state:
    st.session_state.is_risk_active = False
if 'logs' not in st.session_state:
    st.session_state.logs = []
if 'z_scores' not in st.session_state:
    st.session_state.z_scores = [0.0] * 50

def log(message):
    timestamp = time.strftime("%H:%M:%S")
    st.session_state.logs.insert(0, f"[{timestamp}] {message}")

def trigger_blockchain_alert():
    """Executes the TypeScript Bridge Script"""
    log("INFO: Initiating FDC Bridge sequence...")
    try:
        # Calls the hardhat script
        result = subprocess.run(
            ["yarn", "hardhat", "run", "scripts/bridge.ts", "--network", "coston2"],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            log("SUCCESS: Bridge script executed successfully.")
            # Parse output for Tx Hash
            if "Tx: " in result.stdout:
                tx_hash = result.stdout.split('Tx: ')[-1].strip()
                log(f"CHAIN: Transaction Confirmed -> {tx_hash}")
            return True
        else:
            log("ERROR: Bridge script failed.")
            log(f"STDERR: {result.stderr[:200]}")
            return False
    except Exception as e:
        log(f"CRITICAL: Subprocess error -> {str(e)}")
        return False

# --- UI LAYOUT ---
st.title("Sonar System Control")
st.caption("Backend Logic & Blockchain Bridge Interface")

# Top Status Bar
col_stat1, col_stat2, col_stat3 = st.columns(3)

with col_stat1:
    st.metric("Target Network", "Coston2 (Testnet)")

with col_stat2:
    # Backend Logic Simulation (Z-Score)
    # 1. Update Data
    new_val = random.normalvariate(0.0, 0.5)
    if st.session_state.is_risk_active:
        new_val = random.normalvariate(4.0, 0.5) # Simulate anomaly
    
    st.session_state.z_scores.append(new_val)
    if len(st.session_state.z_scores) > 100:
        st.session_state.z_scores.pop(0)
    
    current_z = st.session_state.z_scores[-1]
    st.metric("Current Z-Score", f"{current_z:.4f}")

with col_stat3:
    if st.session_state.is_risk_active:
        st.error("STATUS: RISK DETECTED (CIRCUIT OPEN)")
    else:
        st.success("STATUS: MONITORING (NORMAL)")

st.divider()

# Main Logic Controls
col_left, col_right = st.columns([2, 1])

with col_left:
    st.subheader("Volatility Monitor")
    # Simple functional chart
    st.line_chart(st.session_state.z_scores)

with col_right:
    st.subheader("Admin Controls")
    
    st.write("**Simulation Triggers**")
    if st.button("Trigger 'Whale' Event", type="primary", use_container_width=True):
        st.session_state.is_risk_active = True
        log("WARN: Manual Trigger - Simulating 3-Sigma Event")
        log("INFO: Calculating market impact...")
        
        with st.spinner("Bridging to Smart Contract..."):
            success = trigger_blockchain_alert()
            
        if success:
            st.success("On-Chain Alert Sent")
        else:
            st.error("Bridge Execution Failed")

    if st.button("Reset System", use_container_width=True):
        st.session_state.is_risk_active = False
        st.session_state.z_scores = [0.0] * 50
        log("INFO: System state reset to Normal.")

# Logs / Terminal Output
st.subheader("System Logs")
log_text = "\n".join(st.session_state.logs)
st.text_area("Console Output", log_text, height=200, disabled=True)