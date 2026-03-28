import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { getCurrentTenantId } from "@/lib/tenant";

function escapeCsv(value: string | number | null | undefined) {
  const stringValue = String(value ?? "");
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }
  return stringValue;
}

export async function GET() {
  const session = await auth();
  const tenantId = await getCurrentTenantId(session);

  const executions = await prisma.callExecution.findMany({
    where: { tenantId },
    include: { agent: true },
    orderBy: { createdAt: "desc" },
  });

  const rows = [
    ["Agent", "Phone Number", "Status", "Duration", "Cost", "Created At", "Transcript"],
    ...executions.map((execution) => [
      execution.agent.name,
      execution.phoneNumber,
      execution.status,
      execution.duration ?? "",
      execution.cost ?? "",
      execution.createdAt.toISOString(),
      execution.transcript ?? "",
    ]),
  ];

  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="nexflow-call-history.csv"',
    },
  });
}
