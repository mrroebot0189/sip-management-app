# Azure Deployment Guide

## Architecture

```
Azure App Service (Node.js 20)
  ├── Express API  (/api/*)
  └── React SPA    (/* - static files)

Azure SQL Database (General Purpose, 2 vCores recommended for 50 users)
```

## Step-by-Step Deployment

### 1. Provision Azure Resources

**Azure SQL Database:**
```bash
az group create --name rg-work-programme --location uksouth
az sql server create \
  --name sql-work-programme \
  --resource-group rg-work-programme \
  --location uksouth \
  --admin-user <your-admin> \
  --admin-password <strong-password>

az sql db create \
  --resource-group rg-work-programme \
  --server sql-work-programme \
  --name WorkProgrammeDB \
  --service-objective S1
```

**Azure App Service:**
```bash
az appservice plan create \
  --name asp-work-programme \
  --resource-group rg-work-programme \
  --sku B2 \
  --is-linux

az webapp create \
  --name work-programme-app \
  --resource-group rg-work-programme \
  --plan asp-work-programme \
  --runtime "NODE:20-lts"
```

### 2. Configure App Service Settings

In the Azure Portal > App Service > Configuration > Application Settings, add:

| Setting | Value |
|---------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `8080` |
| `JWT_SECRET` | (generate a strong 64-char random string) |
| `DB_HOST` | `sql-work-programme.database.windows.net` |
| `DB_PORT` | `1433` |
| `DB_NAME` | `WorkProgrammeDB` |
| `DB_USER` | `<your-admin>` |
| `DB_PASSWORD` | `<strong-password>` |

### 3. Configure Azure SQL Firewall

Allow your App Service outbound IPs:
```bash
# Get App Service outbound IPs
az webapp show --name work-programme-app --resource-group rg-work-programme \
  --query outboundIpAddresses -o tsv

# Add each IP to SQL firewall
az sql server firewall-rule create \
  --resource-group rg-work-programme \
  --server sql-work-programme \
  --name allow-app-service \
  --start-ip-address <ip> \
  --end-ip-address <ip>
```

Alternatively, enable "Allow Azure services and resources to access this server".

### 4. Set Up GitHub Actions CI/CD

In GitHub repository Settings > Secrets, add:
- `AZURE_WEBAPP_NAME`: `work-programme-app`
- `AZURE_WEBAPP_PUBLISH_PROFILE`: (download from Azure Portal > App Service > Get publish profile)

### 5. Deploy

Push to `main`/`master` branch to trigger automatic deployment, or run manually:
```bash
git push origin main
```

### 6. Initialise Database

After first deployment, run migrations and seed data via App Service Console or SSH:
```bash
cd /home/site/wwwroot
npm run migrate
npm run seed
```

### 7. Access the Application

Navigate to: `https://work-programme-app.azurewebsites.net`

Default credentials (change immediately):
- Admin: `admin@yourorganisation.com` / `Admin@123456`
- PM: `pm@yourorganisation.com` / `Manager@123456`

---

## Sizing Recommendations (50 Users)

| Resource | Tier | Reason |
|----------|------|--------|
| App Service | B2 (2 vCore, 3.5GB RAM) | Handles concurrent requests comfortably |
| Azure SQL | S1 (20 DTU) | Suitable for 50 concurrent users, light workload |
| Node.js | 20 LTS | Current LTS, Azure-supported |

## Security Checklist

- [ ] Change default seed passwords immediately after first login
- [ ] Use Azure Key Vault for `JWT_SECRET` and DB credentials in production
- [ ] Enable Azure SQL Transparent Data Encryption (enabled by default)
- [ ] Configure Azure App Service Managed Identity for DB access (recommended)
- [ ] Enable Azure Active Directory authentication for the app (optional upgrade)
- [ ] Review and tighten SQL firewall rules
- [ ] Enable App Service Always On to prevent cold starts

---

## Azure SQL Incident Triage (Check This First)

When troubleshooting a slowdown or outage, check Azure SQL metrics before app-level changes.

### 1) Start with these metrics

In **Azure Portal → SQL database → Monitoring → Metrics**, chart:

- `cpu_percent` (or vCore CPU usage)
- `dtu_consumption_percent` (DTU model only)
- `physical_data_read_percent` (Data IO %)
- `log_write_percent` (Log IO %)
- `workers_percent` and `sessions_percent`

Use **1-minute granularity** for the incident window.

### 2) Compare baseline vs incident window

For each metric above, compare:

- **Baseline window**: same weekday/time band from a normal recent period (for example, previous 7 days)
- **Incident window**: 15 minutes before to 30 minutes after the reported incident timestamp

Look for abrupt step-ups, sustained saturation, or correlated spikes across CPU/IO/workers/sessions.

### 3) Confirm spike timing exactly at incident time

Use this Log Analytics query (if diagnostic metrics are routed to a workspace):

```kusto
let incidentStart = datetime(2026-03-26T10:00:00Z);
let incidentEnd   = datetime(2026-03-26T10:30:00Z);
let baselineStart = incidentStart - 7d;
let baselineEnd   = incidentEnd   - 7d;
AzureMetrics
| where ResourceProvider == "MICROSOFT.SQL"
| where MetricName in (
    "cpu_percent",
    "dtu_consumption_percent",
    "physical_data_read_percent",
    "log_write_percent",
    "workers_percent",
    "sessions_percent"
  )
| where TimeGenerated between (baselineStart .. baselineEnd)
    or TimeGenerated between (incidentStart .. incidentEnd)
| extend Window = iff(TimeGenerated between (incidentStart .. incidentEnd), "incident", "baseline")
| summarize Avg=avg(Total), P95=percentile(Total,95), P99=percentile(Total,99), Max=max(Total)
    by MetricName, Window
| order by MetricName asc, Window desc
```

### 4) Average vs P95/P99 latency (query performance)

From **Query Store** (or Azure SQL Insights), compare average and tail latency:

```sql
-- Compare baseline and incident latency for top queries
DECLARE @incident_start datetime2 = '2026-03-26T10:00:00';
DECLARE @incident_end   datetime2 = '2026-03-26T10:30:00';
DECLARE @baseline_start datetime2 = DATEADD(day, -7, @incident_start);
DECLARE @baseline_end   datetime2 = DATEADD(day, -7, @incident_end);

WITH q AS (
    SELECT
        qt.query_sql_text,
        CASE
            WHEN rs.first_execution_time >= @incident_start AND rs.last_execution_time <= @incident_end THEN 'incident'
            WHEN rs.first_execution_time >= @baseline_start AND rs.last_execution_time <= @baseline_end THEN 'baseline'
        END AS window_name,
        rs.avg_duration,
        rs.max_duration,
        rs.count_executions
    FROM sys.query_store_query_text qt
    JOIN sys.query_store_query qq ON qt.query_text_id = qq.query_text_id
    JOIN sys.query_store_plan qp ON qq.query_id = qp.query_id
    JOIN sys.query_store_runtime_stats rs ON qp.plan_id = rs.plan_id
    WHERE (rs.first_execution_time >= @baseline_start AND rs.last_execution_time <= @baseline_end)
       OR (rs.first_execution_time >= @incident_start AND rs.last_execution_time <= @incident_end)
)
SELECT TOP 20
    window_name,
    LEFT(query_sql_text, 200) AS query_sample,
    AVG(avg_duration) AS avg_duration_us,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY avg_duration) OVER (PARTITION BY window_name) AS p95_duration_us,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY avg_duration) OVER (PARTITION BY window_name) AS p99_duration_us,
    MAX(max_duration) AS max_duration_us,
    SUM(count_executions) AS executions
FROM q
WHERE window_name IS NOT NULL
ORDER BY max_duration_us DESC;
```

If **P95/P99 rises sharply** while average changes only slightly, suspect bursty contention, blocking, or uneven query plans.
