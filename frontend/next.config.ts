import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project so Next does not infer it from a
  // stray lockfile in a parent directory (e.g. the user's home folder).
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
