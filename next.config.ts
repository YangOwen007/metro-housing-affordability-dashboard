import type { NextConfig } from "next";

// Keep the config lean until we add deployment-specific needs.
const nextConfig: NextConfig = {
  poweredByHeader: false,
  outputFileTracingRoot: process.cwd(),
  outputFileTracingIncludes: { "/*": ["./data/processed/housing_dashboard_sample.json"] },
  async headers() {
    // These headers reduce browser ambiguity without blocking Next's inline scripts.
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
    ] }];
  }
};

export default nextConfig;
