import type { NextConfig } from "next";

/**
 * STATIC_EXPORT=1 builds the whole site as plain files, for hosting somewhere
 * with no server at all. Pages that need the database are left out of that
 * build; see scripts/share/build-static.ts.
 */
const isStatic = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = isStatic
  ? {
      output: "export",
      images: { unoptimized: true },
      trailingSlash: true,
    }
  : {};

export default nextConfig;
