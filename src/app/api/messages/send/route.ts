import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import connectToDatabase from "@/lib/db";
import Message from "@/models/Message";
import { pusherServer } from "@/lib/pusher";

export async function POST(request: Request) {
  try {
    const session: any = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;

    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { senderId, receiverId, text, timestamp } = await request.json();

    // Minor security check: ensure you don't spoof senders
    if (senderId !== currentUserId) {
      return NextResponse.json({ error: "Unauthorized sender" }, { status: 403 });
    }

    await connectToDatabase();

    // Wait until database creation succeeds before triggering Pusher
    const savedMsg = await Message.create({
      senderId,
      receiverId,
      text,
      timestamp: new Date(timestamp)
    });

    const payload = {
      _id: savedMsg._id.toString(),
      senderId,
      receiverId,
      text,
      timestamp: new Date(timestamp).getTime()
    };

    // Broadcast to the receiver
    await pusherServer.trigger(`user-${receiverId}`, 'receive_message', payload);
    
    // Broadcast to the sender (so other browser tabs they have open also get it)
    await pusherServer.trigger(`user-${senderId}`, 'receive_message', payload);

    return NextResponse.json({ success: true, message: savedMsg });
  } catch (error) {
    console.error("Error creating/sending message:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
