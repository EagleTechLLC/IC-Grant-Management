// Known UUIDs and credentials from supabase/seed.sql
// Tests reference these directly instead of querying the DB.

export const TEST_PASSWORD = "TestPass123!";

export const USERS = {
  admin:      { email: "admin@test.ic",    id: "00000000-0000-0000-0000-000000000010" },
  alice:      { email: "alice@test.ic",    id: "00000000-0000-0000-0000-000000000011" },
  bob:        { email: "bob@test.ic",      id: "00000000-0000-0000-0000-000000000012" },
  org2Admin:  { email: "admin@test.org2",  id: "00000000-0000-0000-0000-000000000020" },
  org2Worker: { email: "worker@test.org2", id: "00000000-0000-0000-0000-000000000021" },
};

export const ORGS = {
  ic:   "00000000-0000-0000-0000-000000000001",
  org2: "00000000-0000-0000-0000-000000000002",
};

export const GRANTS = {
  rca:      { id: "00000000-0000-0000-0000-000000000100", code: "RCA-2026" },
  emp:      { id: "00000000-0000-0000-0000-000000000101", code: "EMP-2026" },
  org2Grant:{ id: "00000000-0000-0000-0000-000000000102", code: "ORG2-GRANT" },
};

export const ACTIVITY_TYPES = {
  cm:    { id: "00000000-0000-0000-0000-000000000200", code: "CM" },
  ds:    { id: "00000000-0000-0000-0000-000000000201", code: "DS" },
  adv:   { id: "00000000-0000-0000-0000-000000000202", code: "ADV" },
  trans: { id: "00000000-0000-0000-0000-000000000203", code: "TRANS" },
  out:   { id: "00000000-0000-0000-0000-000000000204", code: "OUT" }, // archived
};

export const CLIENTS = {
  smith:   { id: "00000000-0000-0000-0000-000000000300", name: "Smith, Jane",   alienNumber: "123456789" },
  johnson: { id: "00000000-0000-0000-0000-000000000301", name: "Johnson, Carlos", alienNumber: null },
  nguyen:  { id: "00000000-0000-0000-0000-000000000302", name: "Nguyen, Mai",   alienNumber: "987654321" },
  org2Client: { id: "00000000-0000-0000-0000-000000000310", name: "Client, Org2" },
};

export const TIME_LOGS = {
  aliceToday:      "00000000-0000-0000-0000-000000000400", // unlocked
  aliceToday2:     "00000000-0000-0000-0000-000000000401", // unlocked
  aliceLocked:     "00000000-0000-0000-0000-000000000402", // locked, has pending correction
  aliceSuperseded: "00000000-0000-0000-0000-000000000403", // locked + superseded
  aliceCorrection: "00000000-0000-0000-0000-000000000404", // replacement entry
  bobToday:        "00000000-0000-0000-0000-000000000405", // bob's entry
  org2Log:         "00000000-0000-0000-0000-000000000410", // org2 (RLS target)
};

export const CORRECTIONS = {
  pending: "00000000-0000-0000-0000-000000000500",
};
