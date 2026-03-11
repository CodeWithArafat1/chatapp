import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import connectToDatabase from "@/lib/db";
import Message from "@/models/Message";

// POST: Mark all messages from a specific user as "seen"
export async function POST(
  request: Request,
  { params }: { params: Promise<{ peerId: string }> }
) {
  try {
    const { peerId } = await params;
    const session: any = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;

    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    // Mark all messages FROM the peer TO me as seen
    await Message.updateMany(
      { senderId: peerId, receiverId: currentUserId, seen: false },
      { $set: { seen: true } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark seen error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
