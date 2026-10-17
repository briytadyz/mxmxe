import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveRequestHotelTenant } from "./hotelTenant.js";

const organizationId = "1665de0b-1848-4862-940f-4dcc02b30a2b";
const request = { hostname: "abc123.projects.builder.my" } as Parameters<typeof resolveRequestHotelTenant>[0];

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("resolveRequestHotelTenant", () => {
  it("uses the configured hotel only outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    vi.stubEnv("BUILDER_PREVIEW_TENANT_ORGANIZATION_ID", organizationId);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      organization_id: organizationId,
      display_name: "MisuriStay",
      logo_url: null,
      primary_color: "#123456",
      accent_color: "#abcdef",
    }]), { status: 200 })));

    await expect(resolveRequestHotelTenant(request)).resolves.toEqual({
      organizationId,
      domain: "abc123.projects.builder.my",
      name: "MisuriStay",
      logoUrl: null,
      primaryColor: "#123456",
      accentColor: "#abcdef",
    });
    expect(fetch).toHaveBeenCalledWith(
      `https://example.supabase.co/rest/v1/hotel_tenant_settings?organization_id=eq.${organizationId}&is_active=eq.true&select=organization_id,display_name,logo_url,primary_color,accent_color&limit=1`,
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer service-role-key" }) }),
    );
  });

  it("keeps production tenant resolution tied to the requested verified domain", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    vi.stubEnv("BUILDER_PREVIEW_TENANT_ORGANIZATION_ID", organizationId);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      organization_id: "36ec18aa-1fb4-48d6-ae37-6febd60c559c",
      name: "Another Hotel",
      domain: "abc123.projects.builder.my",
      logo_url: null,
      primary_color: null,
      accent_color: null,
    }]), { status: 200 })));

    await expect(resolveRequestHotelTenant(request)).resolves.toMatchObject({
      organizationId: "36ec18aa-1fb4-48d6-ae37-6febd60c559c",
      domain: "abc123.projects.builder.my",
      name: "Another Hotel",
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://example.supabase.co/rest/v1/rpc/resolve_hotel_tenant",
      expect.any(Object),
    );
  });
});
