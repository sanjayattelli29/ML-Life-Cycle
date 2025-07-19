import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
  const { dbName, collectionName, documentId } = await req.json();

  if (!dbName || !collectionName || !documentId)
    return NextResponse.json({ error: "Missing db, collection, or documentId" }, { status: 400 });

  const client = await clientPromise;
  const result = await client
    .db(dbName)
    .collection(collectionName)
    .deleteOne({ _id: new ObjectId(documentId) });

  return NextResponse.json({ message: `Deleted document ${documentId}`, result });
} 