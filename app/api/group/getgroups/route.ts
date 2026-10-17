import { Group } from "@/model/Group";
import { User } from "@/model/User";
import dbConnect from "@/lib/dbconnect";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: NextRequest) {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findOne({ email: session?.user?.email });
   
    try {
        const groups = await Group.find({$or: [{admin: session.user?.email}, {members: user?.username}]});
        return NextResponse.json({ success: true, groups });
    } catch (error) {
        return NextResponse.json({ success: false, error: "Failed to fetch groups" }, { status: 500 });
    }
}
