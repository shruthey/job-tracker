import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The `runner` Docker target ships this bundle to ECS in Phase 2.
  output: "standalone",
  // An unrelated package-lock.json sits in the parent directory; without this
  // Turbopack walks up and infers the wrong workspace root.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
