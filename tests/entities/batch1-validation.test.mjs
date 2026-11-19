import assert from "node:assert/strict";
import test from "node:test";

// Logic mirroring server actions validation
function validateMineInput({ name, countryCode, latitude, longitude, status }) {
  if (!name || typeof name !== "string" || !name.trim()) {
    return { ok: false, error: "Mine name is required." };
  }

  const cleanCountry = countryCode?.trim().toUpperCase() || null;
  if (cleanCountry && !/^[A-Z]{2}$/.test(cleanCountry)) {
    return { ok: false, error: "Country code must be a 2-letter ISO code (e.g. ZM, CD, ZA)." };
  }

  const VALID_STATUSES = ["unverified", "operating", "care_and_maintenance", "closed", "unknown"];
  const cleanStatus = VALID_STATUSES.includes(status) ? status : "unverified";

  let latNum = null;
  let lngNum = null;

  const latPresent = latitude !== undefined && latitude !== null && latitude !== "";
  const lngPresent = longitude !== undefined && longitude !== null && longitude !== "";

  if (latPresent || lngPresent) {
    if (!latPresent || !lngPresent) {
      return { ok: false, error: "Both latitude and longitude must be provided together, or both omitted." };
    }
    latNum = Number(latitude);
    lngNum = Number(longitude);
    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      return { ok: false, error: "Latitude must be a valid number between -90 and 90." };
    }
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      return { ok: false, error: "Longitude must be a valid number between -180 and 180." };
    }
  }

  return {
    ok: true,
    data: {
      name: name.trim(),
      country_code: cleanCountry,
      status: cleanStatus,
      latitude: latNum,
      longitude: lngNum,
    },
  };
}

function validateProducerInput({ legalName, countryCode }) {
  if (!legalName || typeof legalName !== "string" || !legalName.trim()) {
    return { ok: false, error: "Legal company name is required." };
  }

  const cleanCountry = countryCode?.trim().toUpperCase() || null;
  if (cleanCountry && !/^[A-Z]{2}$/.test(cleanCountry)) {
    return { ok: false, error: "Country code must be a 2-letter ISO code (e.g. ZM, CD, ZA)." };
  }

  return {
    ok: true,
    data: {
      legal_name: legalName.trim(),
      normalized_name: legalName.trim().toLowerCase(),
      country_code: cleanCountry,
      verification_status: "unverified", // Must start unverified per database trigger
    },
  };
}

function validateContactInput({ fullName, email, status }) {
  if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
    return { ok: false, error: "Contact full name is required." };
  }

  const cleanEmail = email?.trim() || null;
  if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  const VALID_STATUSES = ["active", "inactive", "unverified"];
  const cleanStatus = VALID_STATUSES.includes(status) ? status : "active";

  return {
    ok: true,
    data: {
      full_name: fullName.trim(),
      email: cleanEmail,
      status: cleanStatus,
    },
  };
}

function checkPermissions(role, operation) {
  const canMutate = role === "owner" || role === "admin" || role === "manager" || role === "contributor";
  const canDelete = role === "owner" || role === "admin";

  if (operation === "delete") return canDelete;
  if (operation === "create" || operation === "update") return canMutate;
  if (operation === "read") return true; // all authenticated members can read
  return false;
}

// ----------------------------------------------------
// Tests
// ----------------------------------------------------

test("Mine validation: requires non-empty name", () => {
  assert.equal(validateMineInput({ name: "" }).ok, false);
  assert.equal(validateMineInput({ name: "   " }).ok, false);
  assert.equal(validateMineInput({ name: "Kansanshi Copper Mine" }).ok, true);
});

test("Mine validation: coordinates constraint enforcement", () => {
  // One coordinate missing must fail
  const onlyLat = validateMineInput({ name: "Mine A", latitude: "-12.5" });
  assert.equal(onlyLat.ok, false);
  assert.match(onlyLat.error, /Both latitude and longitude must be provided/);

  const onlyLng = validateMineInput({ name: "Mine A", longitude: "28.5" });
  assert.equal(onlyLng.ok, false);
  assert.match(onlyLng.error, /Both latitude and longitude must be provided/);

  // Both omitted is completely valid
  const neither = validateMineInput({ name: "Mine A" });
  assert.equal(neither.ok, true);
  assert.equal(neither.data.latitude, null);
  assert.equal(neither.data.longitude, null);

  // Both provided within valid ranges
  const both = validateMineInput({ name: "Mine A", latitude: -12.18, longitude: 26.39 });
  assert.equal(both.ok, true);
  assert.equal(both.data.latitude, -12.18);
  assert.equal(both.data.longitude, 26.39);

  // Out of bounds latitude / longitude
  assert.equal(validateMineInput({ name: "Mine A", latitude: 95, longitude: 26 }).ok, false);
  assert.equal(validateMineInput({ name: "Mine A", latitude: 12, longitude: 195 }).ok, false);
});

test("Mine validation: country code format", () => {
  assert.equal(validateMineInput({ name: "Mine A", countryCode: "ZAM" }).ok, false);
  const valid = validateMineInput({ name: "Mine A", countryCode: "zm" });
  assert.equal(valid.ok, true);
  assert.equal(valid.data.country_code, "ZM");
});

test("Producer validation: normalization and mandatory unverified start", () => {
  const result = validateProducerInput({
    legalName: "  Zambian Minerals Ltd  ",
    countryCode: "zm",
  });
  assert.equal(result.ok, true);
  assert.equal(result.data.legal_name, "Zambian Minerals Ltd");
  assert.equal(result.data.normalized_name, "zambian minerals ltd");
  assert.equal(result.data.country_code, "ZM");
  // Security trigger guarantee:
  assert.equal(result.data.verification_status, "unverified");
});

test("Contact validation: email and status formatting", () => {
  assert.equal(validateContactInput({ fullName: "Jane Doe", email: "invalid-email" }).ok, false);
  const valid = validateContactInput({ fullName: "Jane Doe", email: "jane@example.com", status: "active" });
  assert.equal(valid.ok, true);
  assert.equal(valid.data.full_name, "Jane Doe");
  assert.equal(valid.data.email, "jane@example.com");
  assert.equal(valid.data.status, "active");
});

test("Permission matrix for Batch 1 entities", () => {
  // Read permissions: all active workspace members
  for (const role of ["owner", "admin", "manager", "contributor", "viewer"]) {
    assert.equal(checkPermissions(role, "read"), true, `${role} should read`);
  }

  // Create/Update permissions: editors (owner, admin, manager, contributor)
  assert.equal(checkPermissions("owner", "create"), true);
  assert.equal(checkPermissions("admin", "create"), true);
  assert.equal(checkPermissions("manager", "create"), true);
  assert.equal(checkPermissions("contributor", "create"), true);
  assert.equal(checkPermissions("viewer", "create"), false); // viewers blocked

  // Delete permissions: administrators (owner, admin)
  assert.equal(checkPermissions("owner", "delete"), true);
  assert.equal(checkPermissions("admin", "delete"), true);
  assert.equal(checkPermissions("manager", "delete"), false); // managers cannot delete mines/producers
  assert.equal(checkPermissions("contributor", "delete"), false);
  assert.equal(checkPermissions("viewer", "delete"), false);
});
