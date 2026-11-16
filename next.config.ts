import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // transformers.js + ONNX runtime memuat binary native → jangan di-bundle.
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node"],
  // Binary ONNX dimuat lewat path dinamis → pastikan ikut ke fungsi Vercel (Linux x64).
  outputFileTracingIncludes: {
    "/api/chat": ["./node_modules/onnxruntime-node/bin/napi-v6/linux/x64/**"],
  },
  // Binary platform lain tidak perlu ikut (hemat ukuran fungsi).
  outputFileTracingExcludes: {
    "/api/chat": [
      "./node_modules/onnxruntime-node/bin/napi-v6/{darwin,win32}/**",
      "./node_modules/onnxruntime-node/bin/napi-v6/linux/arm64/**",
      "./node_modules/onnxruntime-web/**",
    ],
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
