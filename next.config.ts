import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow @react-pdf/renderer to work in API routes / server components
  // by excluding it from the edge runtime bundle
  serverExternalPackages: ["@react-pdf/renderer"],

  // Increase the API body size limit for plan payloads
  experimental: {},
};

export default nextConfig;
