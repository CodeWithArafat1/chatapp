import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import connectToDatabase from "@/lib/db";
import Message from "@/models/Message";

// GET: Fetch new messages since a given timestamp
export async function GET(request: Request) {
  try {
    const session: any = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;

    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since"); // ISO timestamp or ms

    await connectToDatabase();

    const query: any = {
      $or: [
        { senderId: currentUserId },
        { receiverId: currentUserId },
      ],
    };

    if (since) {
      query.createdAt = { $gt: new Date(parseInt(since)) };
    }

    const messages = await Message.find(query)
      .sort({ timestamp: 1 })
      .lean();

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Poll messages error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
