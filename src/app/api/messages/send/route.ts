import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import connectToDatabase from "@/lib/db";
import Message from "@/models/Message";

export async function POST(request: Request) {
  try {
    const session: any = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;

    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { senderId, receiverId, text, timestamp } = await request.json();

    // Security check: ensure you don't spoof senders
    if (senderId !== currentUserId) {
      return NextResponse.json({ error: "Unauthorized sender" }, { status: 403 });
    }

    await connectToDatabase();

    const savedMsg = await Message.create({
      senderId,
      receiverId,
      text,
      timestamp: new Date(timestamp)
    });

    return NextResponse.json({ success: true, message: savedMsg });
  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
