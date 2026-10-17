import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { isValidObjectId } from "mongoose";
import connectDB  from "@/lib/dbconnect";
import {Group} from "@/model/Group";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { groupId, person } = await req.json();

  if (!isValidObjectId(groupId) || typeof person !== "string" || !person.trim()) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }

  await connectDB();

  const result = await Group.updateOne(
    {
      _id: groupId,
      admin: session.user.email,
      splits: { $elemMatch: { person, isPaid: false } },
    },
    // `$` targets the array element matched by the $elemMatch above
    { $set: { "splits.$.isPaid": true } }
  );

  if (result.matchedCount === 0) {
    return NextResponse.json(
      { message: "Group doesn't exist or you are not authorized to settle the group" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}