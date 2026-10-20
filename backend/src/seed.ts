
import bcrypt from "bcryptjs";
import pool from "./config/database.js";

async function seed() {
  console.log("🌱 Seeding LOGIFORGE AI demo database...");

  let client;

  try {
    console.log("Step 1: Hashing demo password...");
    const password = await bcrypt.hash("Demo@12345", 12);
    console.log("Step 1 complete.");

    console.log("Step 2: Connecting to database...");
    client = await pool.connect();
    console.log("Step 2 complete: Database connected.");

    console.log("Step 3: Starting transaction...");
    await client.query("BEGIN");

    console.log("Step 4: Seeding users...");
    await client.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES
         ('planner@logiforge.demo', $1, 'Demo Planner', 'LOGISTICS_PLANNER'),
         ('admin@logiforge.demo', $1, 'System Admin', 'ADMIN'),
         ('analyst@logiforge.demo', $1, 'Demo Analyst', 'ANALYST'),
         ('depot@logiforge.demo', $1, 'Depot Manager', 'DEPOT_MANAGER')
       ON CONFLICT (email) DO NOTHING`,
      [password]
    );

    console.log("Step 5: Seeding locations...");
    await client.query(
      `INSERT INTO locations
       (code, name, type, latitude, longitude, storage_capacity, priority_level)
       VALUES
         ('DEPOT-001','Central Demo Depot','CENTRAL_DEPOT',22.572600,88.363900,10000,5),
         ('DEPOT-002','Regional Demo Depot','REGIONAL_DEPOT',23.250000,87.850000,7000,4),
         ('LOC-A01','Forward Demo Location A01','FORWARD_LOCATION',23.500000,87.300000,2500,5),
         ('LOC-B02','Forward Demo Location B02','FORWARD_LOCATION',23.650000,88.100000,2200,4),
         ('LOC-C03','Remote Demo Location C03','FORWARD_LOCATION',24.000000,87.600000,1800,3),
         ('LOC-D04','Distribution Point D04','DISTRIBUTION_POINT',23.200000,88.450000,1200,3)
       ON CONFLICT (code) DO NOTHING`
    );

    console.log("Step 6: Seeding items...");
    await client.query(
      `INSERT INTO items (code, name, category, unit, minimum_days)
       VALUES
         ('FOOD-001','Ration Pack','Food / Rations','packs',4),
         ('FUEL-001','Fuel Unit','Fuel','litres',5),
         ('MED-001','Medical Kit','Medical Supplies','kits',3),
         ('MAINT-001','Maintenance Kit','Maintenance Supplies','kits',4),
         ('ESS-001','General Essentials','General Essentials','units',3)
       ON CONFLICT (code) DO NOTHING`
    );

    const locs = await client.query(
      "SELECT id, code FROM locations"
    );
    const items = await client.query(
      "SELECT id, code, unit FROM items"
    );

    const itemRates: Record<string, number> = {
      "FOOD-001": 95,
      "FUEL-001": 75,
      "MED-001": 12,
      "MAINT-001": 18,
      "ESS-001": 35
    };

    console.log("Step 7: Seeding inventory and consumption history...");

    for (const l of locs.rows) {
      for (const i of items.rows) {
        const base = itemRates[i.code] ?? 20;
        const factor =
          l.code === "LOC-A01" ? 1.25 :
          l.code === "LOC-C03" ? 1.1 : 1;

        const daily = Number((base * factor).toFixed(2));
        const stock =
          l.code === "LOC-A01" && i.code === "FUEL-001"
            ? daily * 2.4
            : daily * (7 + (l.code.length % 3));

        const min = daily * 3;
        const days = stock / daily;
        const status =
          days <= 3 ? "RED" :
          days <= 6 ? "AMBER" : "GREEN";

        await client.query(
          `INSERT INTO inventory
           (location_id, item_id, current_quantity, minimum_threshold,
            maximum_capacity, daily_average_consumption, days_of_supply, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (location_id, item_id) DO UPDATE SET
             current_quantity = EXCLUDED.current_quantity,
             daily_average_consumption = EXCLUDED.daily_average_consumption,
             days_of_supply = EXCLUDED.days_of_supply,
             status = EXCLUDED.status,
             last_updated = NOW()`,
          [l.id, i.id, stock, min, 5000, daily, days, status]
        );

        for (let d = 30; d >= 1; d--) {
          const date = new Date(Date.now() - d * 86400000)
            .toISOString()
            .slice(0, 10);

          const wave = 1 + Math.sin(d / 4) * 0.08;
          const qty = Number((daily * wave).toFixed(2));

          await client.query(
            `INSERT INTO consumption_history
             (location_id, item_id, consumption_date, quantity, unit)
             VALUES ($1,$2,$3,$4,$5)
             ON CONFLICT (location_id, item_id, consumption_date)
             DO NOTHING`,
            [l.id, i.id, date, qty, i.unit]
          );
        }
      }
    }

    console.log("Step 8: Seeding routes...");
    const allLocs = await client.query(
      "SELECT id, code FROM locations ORDER BY code"
    );

    const depots = allLocs.rows.filter(
      (x: { code: string }) => x.code.startsWith("DEPOT")
    );
    const destinations = allLocs.rows.filter(
      (x: { code: string }) => x.code.startsWith("LOC")
    );

    let routeNo = 1;

    for (const d of depots) {
      for (const l of destinations) {
        const current = routeNo++;

        await client.query(
          `INSERT INTO routes
           (route_code, from_location_id, to_location_id, distance_km,
            estimated_time_hours, capacity, road_condition, weather_impact,
            availability_percent, modeled_cost)
           VALUES ($1,$2,$3,$4,$5,$6,'NORMAL','LOW',95,$7)
           ON CONFLICT (route_code) DO NOTHING`,
          [
            `R-${String(current).padStart(3, "0")}`,
            d.id,
            l.id,
            80 + current * 7,
            3 + current * 0.1,
            1000,
            500 + current * 15
          ]
        );
      }
    }

    console.log("Step 9: Seeding transport assets...");
    for (let n = 1; n <= 12; n++) {
      const code = `TR-${String(n).padStart(3, "0")}`;
      const capacity = 500 + (n % 5) * 250;

      await client.query(
        `INSERT INTO transport_assets
         (vehicle_code, asset_type, capacity, capacity_unit, status,
          availability_percent, current_location_id)
         VALUES ($1,'Synthetic Transport Asset',$2,'units',$3,$4,$5)
         ON CONFLICT (vehicle_code) DO NOTHING`,
        [
          code,
          capacity,
          n % 5 === 0 ? "MAINTENANCE" : "AVAILABLE",
          n % 5 === 0 ? 40 : 100,
          depots[n % depots.length]?.id ?? null
        ]
      );
    }

    console.log("Step 10: Seeding supply requests and alerts...");

    const a01 = allLocs.rows.find(
      (x: { code: string }) => x.code === "LOC-A01"
    );
    const fuel = items.rows.find(
      (x: { code: string }) => x.code === "FUEL-001"
    );
    const food = items.rows.find(
      (x: { code: string }) => x.code === "FOOD-001"
    );

    const planner = await client.query(
      "SELECT id FROM users WHERE email = 'planner@logiforge.demo'"
    );

    if (a01 && fuel && planner.rows[0]) {
      await client.query(
        `INSERT INTO supply_requests
         (request_code, location_id, item_id, quantity, required_by,
          priority, reason, created_by, status)
         VALUES
         ('REQ-DEMO-001',$1,$2,400,CURRENT_DATE+2,'CRITICAL',
          'Predicted fuel shortage risk in synthetic demo scenario',
          $3,'UNDER_REVIEW')
         ON CONFLICT (request_code) DO NOTHING`,
        [a01.id, fuel.id, planner.rows[0].id]
      );
    }

    if (a01 && food && planner.rows[0]) {
      await client.query(
        `INSERT INTO supply_requests
         (request_code, location_id, item_id, quantity, required_by,
          priority, reason, created_by, status)
         VALUES
         ('REQ-DEMO-002',$1,$2,300,CURRENT_DATE+5,'HIGH',
          'Forecasted demand increase in demo location',
          $3,'SUBMITTED')
         ON CONFLICT (request_code) DO NOTHING`,
        [a01.id, food.id, planner.rows[0].id]
      );
    }

    await client.query(
      `INSERT INTO alerts
       (alert_type, severity, title, message, location_id, item_id)
       VALUES
       ('LOW_INVENTORY','CRITICAL','LOC-A01 · Fuel shortage risk',
        'Days of supply is below the configured critical threshold.',$1,$2),
       ('DEMAND_SPIKE','WARNING','LOC-A01 · Demand spike detected',
        'Recent synthetic consumption trend is above baseline.',$1,$3),
       ('CAPACITY','WARNING','Route capacity reduced',
        'Synthetic route R-004 has reduced modeled availability.',NULL,NULL),
       ('FORECAST','INFO','Forecast model refreshed',
        'Baseline moving-average forecast generated from synthetic history.',NULL,NULL)
       ON CONFLICT DO NOTHING`,
      [a01?.id ?? null, fuel?.id ?? null, food?.id ?? null]
    );

    console.log("Step 11: Committing transaction...");
    await client.query("COMMIT");

    console.log("✅ Seed complete");
    console.log("Demo login: planner@logiforge.demo / Demo@12345");
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Ignore rollback errors if the connection has already failed.
      }
    }

    console.error("❌ Seed failed:", error);
    process.exitCode = 1;
  } finally {
    client?.release();

    try {
      await pool.end();
    } catch (error) {
      console.error("Error closing database pool:", error);
    }
  }
}

seed().catch((error) => {
  console.error("Unexpected seed error:", error);
  process.exitCode = 1;
});
