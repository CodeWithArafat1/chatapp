import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";

export async function GET() {
  const session: any = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  
  // Get all users except current
  const users = await User.find({ email: { $ne: session.user.email } }).select("-emailVerified");

  return NextResponse.json(users);
}
