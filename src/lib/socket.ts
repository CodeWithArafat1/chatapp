import { io, Socket } from "socket.io-client";

export interface IMessage {
  id?: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
}

export let socket: Socket | undefined;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io();
  }
  return socket;
};
