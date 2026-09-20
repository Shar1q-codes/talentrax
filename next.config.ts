import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    // Pin the workspace root to this directory. Without it Turbopack walks up
    // looking for a lockfile and finds an unrelated one in the user's home
    // folder, which it then warns about on every build.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
