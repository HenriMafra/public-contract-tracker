# Public Contract Tracker: Temporal Trajectory Analysis and Commercial Renewal Forecasting

**Author:** Henri Mafra  
**License:** MIT License  
**Domain:** Lifecycle Management, Procurement Analytics, Predictive Business Development  

---

## 1. Overview

Public Contract Tracker is an analytical management system designed to monitor the complete lifecycle of government contracts and Price Registration Minutes (Atas de Registro de Preços - ARP). By analyzing statutory renewal limitations under Brazilian Public Bidding Laws (Federal Laws 14.133/2021 and 8.666/1993), the platform forecasts pre-tender commercial engagement windows, enabling technical teams to position competitive solutions before notices are published.

---

## 2. Mathematical Modeling of Renewal Trajectories

Let contract $C_k$ possess an initial effective execution date $t_{\text{start}}$, an active duration $\Delta t_{\text{curr}}$, and a statutory maximum duration $T_{\max} \in \{60, 120\}\text{ months}$.

The remaining valid execution time $\tau(C_k, t)$ at evaluation date $t$ is:

$$\tau(C_k, t) = (t_{\text{start}} + \Delta t_{\text{curr}}) - t$$

The remaining legal extension ceiling $\Omega(C_k, t)$ is defined as:

$$\Omega(C_k, t) = (t_{\text{start}} + T_{\max}) - t$$

### Status Classification Function:
$$Status(C_k, t) = \begin{cases}
\text{CRITICAL\_IMMINENT}, & \text{if } \tau(C_k, t) \le 90\text{ days} \land \Omega(C_k, t) \le 90\text{ days} \\
\text{TACTICAL\_ENGAGEMENT}, & \text{if } 90\text{ days} < \tau(C_k, t) \le 180\text{ days} \\
\text{ACTIVE\_COMPLIANT}, & \text{if } \tau(C_k, t) > 180\text{ days}
\end{cases}$$

---

## 3. Architecture and Data Model

- **Full-Stack Tier:** Next.js 14 (App Router), TypeScript, Tailwind CSS.
- **Data Engine:** Supabase PostgreSQL with B-tree indices on temporal bounds (`end_date`, `start_date`).
- **Pipeline Interface:** Interactive Kanban board tracking engagement stages (Pre-Tender PoC, RFI Response, Draft Notice Review).

---

## 4. Setup and Execution

```bash
# 1. Clone repository
git clone https://github.com/HenriMafra/public-contract-tracker.git
cd public-contract-tracker

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local

# 4. Start local development server
npm run dev
```

---

## 5. References

- Federative Republic of Brazil. (2021). *Federal Law n. 14.133 (Public Bidding and Administrative Contracts Framework)*.
- Thai, K. V. (2001). Public procurement re-examined. *Journal of Public Procurement*, 1(1), 9-50.

---

## 6. License

Licensed under the MIT License. Copyright (c) Henri Mafra.
