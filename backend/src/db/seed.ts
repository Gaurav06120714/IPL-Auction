// Run with: npm run db:seed
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { playersTable } from "./schema.js";

const db = drizzle(new pg.Pool({ connectionString: process.env.DATABASE_URL }));
const players = [

  // GOAT PLAYERS
  { name: "Virat Kohli", role: "Batsman", country: "India", category: "goat", basePrice: 200, powerScore: 98 },
  { name: "AB de Villiers", role: "Batsman", country: "South Africa", category: "goat", basePrice: 200, powerScore: 97 },
  { name: "MS Dhoni", role: "Wicket-Keeper", country: "India", category: "goat", basePrice: 200, powerScore: 96 },
  { name: "Rohit Sharma", role: "Batsman", country: "India", category: "goat", basePrice: 200, powerScore: 96 },
  { name: "Jasprit Bumrah", role: "Bowler", country: "India", category: "goat", basePrice: 200, powerScore: 98 },
  { name: "Shakib Al Hasan", role: "All-Rounder", country: "Bangladesh", category: "goat", basePrice: 150, powerScore: 96 },
  { name: "Lasith Malinga", role: "Bowler", country: "Sri Lanka", category: "goat", basePrice: 150, powerScore: 97 },
  { name: "Rashid Khan", role: "Bowler", country: "Afghanistan", category: "goat", basePrice: 150, powerScore: 95 },
  { name: "Chris Gayle", role: "Batsman", country: "West Indies", category: "goat", basePrice: 150, powerScore: 97 },
  { name: "Brendon McCullum", role: "Batsman", country: "New Zealand", category: "goat", basePrice: 120, powerScore: 90 },
  { name: "Shane Watson", role: "All-Rounder", country: "Australia", category: "goat", basePrice: 120, powerScore: 96 },
  { name: "Glenn Maxwell", role: "All-Rounder", country: "Australia", category: "goat", basePrice: 120, powerScore: 97 },
  { name: "David Warner", role: "Batsman", country: "Australia", category: "goat", basePrice: 120, powerScore: 96 },
  { name: "Dale Steyn", role: "Bowler", country: "South Africa", category: "goat", basePrice: 120, powerScore: 95 },
  { name: "Daniel Vettori", role: "Bowler", country: "New Zealand", category: "goat", basePrice: 100, powerScore: 96 },
  { name: "Martin Guptill", role: "Batsman", country: "New Zealand", category: "goat", basePrice: 100, powerScore: 97 },

  // CAPPED PLAYERS
  { name: "KL Rahul", role: "Batsman", country: "India", category: "capped", basePrice: 100, powerScore: 88 },
  { name: "Hardik Pandya", role: "All-Rounder", country: "India", category: "capped", basePrice: 100, powerScore: 90 },
  { name: "Suryakumar Yadav", role: "Batsman", country: "India", category: "capped", basePrice: 100, powerScore: 92 },
  { name: "Rishabh Pant", role: "Wicket-Keeper", country: "India", category: "capped", basePrice: 100, powerScore: 89 },
  { name: "Ravindra Jadeja", role: "All-Rounder", country: "India", category: "capped", basePrice: 100, powerScore: 91 },
  { name: "Shubman Gill", role: "Batsman", country: "India", category: "capped", basePrice: 100, powerScore: 87 },
  { name: "Shreyas Iyer", role: "Batsman", country: "India", category: "capped", basePrice: 100, powerScore: 85 },
  { name: "Yuzvendra Chahal", role: "Bowler", country: "India", category: "capped", basePrice: 80, powerScore: 84 },
  { name: "Mohammed Shami", role: "Bowler", country: "India", category: "capped", basePrice: 80, powerScore: 86 },
  { name: "Trent Boult", role: "Bowler", country: "New Zealand", category: "capped", basePrice: 100, powerScore: 88 },
  { name: "Pat Cummins", role: "All-Rounder", country: "Australia", category: "capped", basePrice: 100, powerScore: 91 },
  { name: "Faf du Plessis", role: "Batsman", country: "South Africa", category: "capped", basePrice: 80, powerScore: 83 },
  { name: "Quinton de Kock", role: "Wicket-Keeper", country: "South Africa", category: "capped", basePrice: 80, powerScore: 85 },
  { name: "Kagiso Rabada", role: "Bowler", country: "South Africa", category: "capped", basePrice: 100, powerScore: 90 },
  { name: "Jos Buttler", role: "Wicket-Keeper", country: "England", category: "capped", basePrice: 100, powerScore: 92 },
  { name: "Ben Stokes", role: "All-Rounder", country: "England", category: "capped", basePrice: 100, powerScore: 90 },
  { name: "Sam Curran", role: "All-Rounder", country: "England", category: "capped", basePrice: 80, powerScore: 82 },
  { name: "Liam Livingstone", role: "All-Rounder", country: "England", category: "capped", basePrice: 80, powerScore: 83 },
  { name: "Nicholas Pooran", role: "Wicket-Keeper", country: "West Indies", category: "capped", basePrice: 80, powerScore: 84 },
  { name: "Andre Russell", role: "All-Rounder", country: "West Indies", category: "capped", basePrice: 100, powerScore: 92 },
  { name: "Sunil Narine", role: "All-Rounder", country: "West Indies", category: "capped", basePrice: 80, powerScore: 86 },

  // UNCAPPED / DOMESTIC
  { name: "Tilak Varma", role: "Batsman", country: "India", category: "capped", basePrice: 30, powerScore: 74 },
  { name: "Rinku Singh", role: "Batsman", country: "India", category: "capped", basePrice: 30, powerScore: 72 },
  { name: "Yashasvi Jaiswal", role: "Batsman", country: "India", category: "capped", basePrice: 40, powerScore: 78 },
  { name: "Prabhsimran Singh", role: "Wicket-Keeper", country: "India", category: "capped", basePrice: 20, powerScore: 67 },
  { name: "Arshdeep Singh", role: "Bowler", country: "India", category: "capped", basePrice: 40, powerScore: 76 },
  { name: "Mukesh Kumar", role: "Bowler", country: "India", category: "capped", basePrice: 20, powerScore: 65 },
  { name: "Avesh Khan", role: "Bowler", country: "India", category: "capped", basePrice: 30, powerScore: 70 },
  { name: "Deepak Chahar", role: "All-Rounder", country: "India", category: "capped", basePrice: 30, powerScore: 71 },
  { name: "Shivam Dube", role: "All-Rounder", country: "India", category: "capped", basePrice: 30, powerScore: 69 },
  { name: "Rahul Tewatia", role: "All-Rounder", country: "India", category: "capped", basePrice: 30, powerScore: 70 },
  { name: "Axar Patel", role: "All-Rounder", country: "India", category: "capped", basePrice: 40, powerScore: 77 },
  { name: "Washington Sundar", role: "All-Rounder", country: "India", category: "capped", basePrice: 30, powerScore: 73 },
  { name: "Sai Sudharsan", role: "Batsman", country: "India", category: "capped", basePrice: 20, powerScore: 68 },
  { name: "Abhishek Sharma", role: "All-Rounder", country: "India", category: "capped", basePrice: 30, powerScore: 71 },
  { name: "Ravi Bishnoi", role: "Bowler", country: "India", category: "capped", basePrice: 40, powerScore: 75 },
  { name: "Kuldeep Yadav", role: "Bowler", country: "India", category: "capped", basePrice: 40, powerScore: 84 },
  { name: "Umran Malik", role: "Bowler", country: "India", category: "capped", basePrice: 30, powerScore: 79 },
  { name: "Nitish Kumar Reddy", role: "All-Rounder", country: "India", category: "capped", basePrice: 20, powerScore: 85 },
  { name: "Harshit Rana", role: "Bowler", country: "India", category: "capped", basePrice: 20, powerScore: 63 },
  { name: "Varun Chakravarthy", role: "Bowler", country: "India", category: "capped", basePrice: 40, powerScore: 74 }

];
async function seed() {
  console.log(`🌱 Seeding ${players.length} IPL players...`);

  // Check if already seeded
  const existing = await db.select().from(playersTable);
  if (existing.length > 0) {
    console.log(`✅ Already seeded (${existing.length} players in DB). Skipping.`);
    process.exit(0);
  }

  await db.insert(playersTable).values(players);
  console.log(`✅ Seeded ${players.length} players successfully!`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
