import mongoose from "mongoose";
import { Group } from "@/model/Group";
import dbConnect from "@/lib/dbconnect";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    
    if (!session) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();
  try {
    const { name, members, expense } = await req.json();

    const group = new Group({
      name,
      members,
      expense: expense.amount,
      admin: session.user?.email, 
    });

    await group.save();

    // Add Expense if provided
    if (expense) {
      // Create Expense logic here
      // link it to the group
    }

    return NextResponse.json({ success: true, group });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to create group" }, { status: 500 });
  }
}
