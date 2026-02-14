import { neon } from "@netlify/neon";

export function getDb() {
  return neon();
}
