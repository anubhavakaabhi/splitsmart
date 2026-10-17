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

    const expenseAmount = expense.amount;
    const splitType = expense.splitType || "equally";
    
    let splits = expense.splits || [];
    if (splitType === "equally") {
      const amountPerPerson = Math.ceil(expenseAmount / members.length);
      splits = members.map((member: string) => ({
        person: member,
        amount: amountPerPerson,
        isPaid: false,
        
      }));
    }
    

    const group = new Group({
      name,
      members,
      expenses: expenseAmount,
      expenseTitle: expense.title,
      splitType: expense.splitType,
      splits: splits,
      admin: session.user?.email, 
    });

    await group.save();

    return NextResponse.json({ success: true, group });
  } catch (error) {
    console.log(error)
    return NextResponse.json({ success: false, error: "Failed to create group" }, { status: 500 });
  }
}
