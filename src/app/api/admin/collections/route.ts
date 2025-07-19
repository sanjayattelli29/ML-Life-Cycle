import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dbName = searchParams.get("db");

  if (!dbName) return NextResponse.json({ error: "No DB provided" }, { status: 400 });

  const client = await clientPromise;
  const db = client.db(dbName);
  const collections = await db.listCollections().toArray();

  // Fetch sample documents for each collection
  const collectionsWithDocs = await Promise.all(
    collections.map(async (col: { name: string }) => {
      const docs = await db.collection(col.name).find({}).limit(10).toArray();
      return { name: col.name, docs };
    })
  );

  return NextResponse.json(collectionsWithDocs);
} 