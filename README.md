![Lumiscan Protocol Banner](./assets/iris_banner.png)

# LUMISCAN // Autonomous Risk Layer
### *Bridging the 1.8s Latency Gap on Flare*

[![Flare Network](https://img.shields.io/badge/Network-Flare_Coston2-FF5F1F?style=flat-square)](https://flare.network) [![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](./LICENSE) [![Status](https://img.shields.io/badge/Status-Prototyping-yellow?style=flat-square)]() [![Stack](https://img.shields.io/badge/Tech-Solidity_%7C_React_%7C_Hardhat-black?style=flat-square)]()

---

**Lumiscan** is an infrastructure-grade security primitive designed to solve the **Oracle Latency Gap** on the Flare Network. By utilizing a hybrid architecture of high-frequency off-chain sensing and decentralized FDC verification, Lumiscan protects F-Asset vaults and dApps from insolvency and arbitrage exploitation during periods of extreme market volatility.

---

## 01 // The Problem: Temporal Desync

The core friction in F-Asset security is the **Latency Gap**. While Flare's FTSO v2 offers industry-leading updates (~1.8s), this still creates a stochastic window where the "Real World" price (e.g., BTC on Binance) has crashed, but the "On-Chain" price is still stale.

High-Frequency Trading (HFT) firms exploit this **Temporal Desync** to:

1. **Drain Vaults:** Withdrawing F-Assets at stale, inflated prices before the oracle updates.
2. **Manipulate Liquidations:** Triggering cascades before market equilibrium is found.
3. **Gaming Exploits:** Arbitraging in-game economies that use F-Assets as currency.

---

## 02 // The Solution: Hybrid Optimistic Defense

Lumiscan neutralizes this window by separating **Detection (Speed)** from **Settlement (Truth)**.

### **A. The Sentinel (Optimistic Detection)**

Instead of waiting for the 90s FDC finality or the 1.8s FTSO update, the **Sentinel Agent** monitors off-chain spot prices via high-frequency polling.

* **Action:** When a risk threshold is breached (e.g., >5% drop), the Sentinel triggers an immediate "Optimistic Lock" on the **Sonar** contract.
* **Speed:** **Sub-Second Response** (Designed to preempt the 1.8s FTSO block heartbeat).

### **B. The FDC (Decentralized Settlement)**

Once the lock is active, the system utilizes the **Flare Data Connector (FDC)** to retrospectively verify the threat.

* **Verification:** The Sentinel submits a cryptographic proof of the external price drop (or "Whale Movement") to the FDC.
* **Resolution:** If the FDC verifies the proof (after the ~90s voting epoch), the lock is confirmed. If the proof is invalid, the Sentinel is slashed, and the protocol automatically resets.

---

## 03 // System Architecture

### **The Iris Mechanism**

The "Iris" is the logical gatekeeper of the system.

* **Open:** Liquidity flows freely.
* **Closed:** High-risk transactions (Withdrawals, Borrows) are reverted.

### **The Sonar Primitive**

**`Sonar.sol`** is the universal smart contract interface that dApp developers integrate. It acts as a **Global Circuit Breaker**.

* **Integration:** Developers wrap critical functions with a check to `opticNerve.isRiskDetected()`.
* **Result:** The protocol locks **before** the stale Oracle price can be exploited.

---

## 04 // Technical Specification (Transparency Layer)

To provide full transparency for the hackathon technical review, the system components are categorized as follows:

| Component | Status | Implementation Detail |
| --- | --- | --- |
| **FTSO v2 Latency** | **Simulated** | Recalibrated to Flare's 1.8s block-heartbeat in the UI to demonstrate the "Vulnerable Window." |
| **FDC Sentinel Feed** | **Implemented** | High-frequency polling agent representing the **Flare Data Connector**. It ingests **non-smart-contract data** (CEX Spot) as a leading indicator. |
| **Sonar Interface** | **Implemented** | Solidity logic-gate (`Sonar.sol`) that allows for external triggers (`triggerArtificialAlert`) and FDC verification hooks (`triggerRiskAlert`). |
| **Iris Protection** | **Implemented** | Client contract (`Iris.sol`) that successfully reverts transactions (`SHUTTER CLOSED`) when risk is detected. |
| **FDC Attestation** | **Roadmap** | Transitioning from the current optimistic trigger to a fully decentralized FDC Attestation Request for permanent state settlement. |

---

## 05 // Project Structure

To navigate this repository:

* **`/contracts`**: Contains the core logic.
* `Sonar.sol`: The risk primitive and FDC verification logic.
* `Iris.sol`: The client contract representing a protected Vault/dApp.


* **`/scripts`**: Hardhat deployment scripts and `demoScenario.ts` for testing the circuit breaker flow.
* **`/lumiscan-ui`**: The React/Next.js dashboard. This is the **Sentinel Terminal** that visualizes the 1.8s latency gap and the "Iris" mechanism.

---

## 06 // Flare Track Feedback (Technical Review)

**Experience Building on Flare:**
As postgraduate students in Applied Computational Science (Imperial College London), our focus was on the **Control Theory** of decentralized networks. While FTSO v2's 1.8s block time is a significant leap for on-chain price discovery, the FDC provides a unique 'Out-of-Band' attestation capability.

By treating the FDC as a high-frequency sensor and the FTSO as a state-settlement layer, we were able to implement a **Feed-Forward Control Loop** that is mathematically impossible on higher-latency networks. Lumiscan is the "Guardian" that ensures **Solvency** (Asset Backing) takes precedence over **Instant Liquidity** (Withdrawals) during black swan events.

---

## 07 // Future Work: The Road to Autonomous Defense

The current MVP demonstrates the **Sentinel-to-Sonar** signal flow. The next phase focuses on moving from a centralized simulation to a fully decentralized, production-grade security primitive:

* **Stochastic LRI Optimization:** Replacing deterministic thresholds with **LSTM (Long Short-Term Memory)** models to recognize "Flash Crash" signatures before they manifest in price.
* **Adversarial Neutralization:** Minimizing time-to-lock () to eliminate the profit margins for HFT arbitrage bots.
* **Decentralized Keepers:** Automating the `resetSystem()` call via a network of FDC-verified keepers.

---

## 08 // Installation & Setup

To run the full **Lumiscan** environment, you will need two terminal windows.

### **Phase 1: The Protocol Core (Terminal A)**

First, verify the On-Chain Logic (contracts and protection scripts).

```bash
# 1. Clone & Install Dependencies
git clone https://github.com/ada-rr2725/lumiscan-protocol.git
cd lumiscan-protocol
npm install

# 2. Setup .env file
cp .env.example .env

# 3. Change PRIVATE_KEY to yours

# 4. Compile the project
npx hardhat compile

# 5. Run the "Crash Test" Simulation
# This deploys contracts to a local Hardhat network and simulates a circuit-breaker event.
npx hardhat run scripts/demoScenario.ts

```

*Expected Output: `SUCCESS: Transaction Reverted!*`

### **Phase 2: The Sentinel UI (Terminal B)**

Next, launch the visual dashboard to see the Latency Gap in action.

```bash
# 1. Navigate to the UI folder
cd lumiscan-ui

# 2. Install UI Dependencies
npm install

# 3. Launch the Dashboard
npm run dev

```

### **Phase 3: Access the System**

Open your browser to [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000).

> **Note for Judges:** The UI is configured in **Simulation Mode**. Click "Inject Threat" to visualize how the Sentinel Agent detects volatility and closes the Iris shutter before the on-chain price updates.