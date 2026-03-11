import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";

// POST: Update current user's lastSeen timestamp (heartbeat)
export async function POST() {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    await User.findByIdAndUpdate(session.user.id, { lastSeen: new Date() });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Heartbeat error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// GET: Return list of user IDs that were seen in the last 15 seconds
export async function GET() {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const threshold = new Date(Date.now() - 15000); // 15 seconds ago
    const onlineUsers = await User.find(
      { lastSeen: { $gte: threshold } },
      { _id: 1 }
    ).lean();

    const onlineIds = onlineUsers.map((u: any) => u._id.toString());
    return NextResponse.json(onlineIds);
  } catch (error) {
    console.error("Online users error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
