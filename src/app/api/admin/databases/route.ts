import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  const client = await clientPromise;
  const adminDb = client.db().admin();
  const result = await adminDb.listDatabases();
  return NextResponse.json(result.databases);
} 