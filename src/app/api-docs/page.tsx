"use client";

import dynamic from "next/dynamic";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <link
        rel="stylesheet"
        href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"
      />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          LabVault OpenAPI 3.0 Documentation
        </h1>
        <p className="text-sm text-muted-foreground">
          Interactive Swagger UI generated from JSDoc annotations at{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            /api/openapi
          </code>
          .
        </p>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card p-2">
        <SwaggerUI url="/api/openapi" />
      </div>
    </div>
  );
}
