// fetch-ghl.js
import axios from "axios";

const BASE = "https://services.leadconnectorhq.com";
const AGENCY_TOKEN = process.env.GHL_AGENCY_TOKEN || "pit-da137897-af38-4716-a382-1afe0616f78dnode i"; // agency API key or agency OAuth token
const headersAgency = { Authorization: `Bearer ${AGENCY_TOKEN}`, Version: "2021-07-28" };

async function getInstalledLocations() {
  const r = await axios.get(`${BASE}/oauth/installedLocations`, { headers: headersAgency });
  return r.data; // array of locations (inspect shape)
}

async function getLocationAccessToken(locationId) {
  const r = await axios.post(`${BASE}/oauth/locationToken`, { locationId }, { headers: headersAgency });
  // expected: { locationAccessToken: "...", expiresIn: ... } — inspect the returned shape
  return r.data.locationAccessToken || r.data?.locationAccessTokenToken || r.data;
}

async function fetchStaffAndCalendarsForLocation(locationId, locationToken) {
  const headers = { Authorization: `Bearer ${locationToken}`, Version: "2021-07-28" };
  const [staffRes, calRes] = await Promise.all([
    axios.get(`${BASE}/locations/${locationId}/staff`, { headers }).catch(e => ({ error: e.response?.data || e.message })),
    axios.get(`${BASE}/locations/${locationId}/calendars`, { headers }).catch(e => ({ error: e.response?.data || e.message })),
  ]);
  return { staff: staffRes.data ?? staffRes, calendars: calRes.data ?? calRes };
}

async function main() {
  try {
    console.log("1) List installed locations...");
    const locations = await getInstalledLocations();
    console.log("Found locations:", JSON.stringify(locations, null, 2));

    for (const loc of locations) {
      // response shape may be { id, name, ... } or { locationId, ... } — normalize:
      const locationId = loc.id || loc.locationId || loc.location?.id;
      if (!locationId) {
        console.warn("Cannot locate a locationId in:", loc);
        continue;
      }

      console.log(`\n--- location: ${locationId} (${loc.name || ""}) ---`);
      console.log("2) Requesting a location access token...");
      const locationToken = await getLocationAccessToken(locationId);
      console.log("Got location token (truncated):", String(locationToken).slice(0, 20), "...");

      console.log("3) Fetching staff and calendars...");
      const data = await fetchStaffAndCalendarsForLocation(locationId, locationToken);
      console.log("staff:", JSON.stringify(data.staff, null, 2));
      console.log("calendars:", JSON.stringify(data.calendars, null, 2));

      // If you want to list "services" linked to calendars, inspect calendars response for service mapping
    }
  } catch (err) {
    console.error("Error:", err.response?.status, err.response?.data || err.message);
  }
}

main();
