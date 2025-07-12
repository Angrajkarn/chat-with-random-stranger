
"use client";

import type { FC } from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, X, Video, VideoOff, Mic, MicOff, ShieldAlert, Users, Loader2, MessageSquare } from 'lucide-react';
import MessageBubble from './message-bubble';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { detectNudity } from '@/ai/flows/nudity-detection-flow';
import { socket } from '@/lib/socket';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

interface ChatPageProps {
  onDisconnect: () => void;
  onFindNext: () => void;
  interests?: string;
  roomId: string;
  isInitiator: boolean;
}

interface Message {
  id: number;
  sender: 'you' | 'stranger';
  text: string;
}

const ChatPage: FC<ChatPageProps> = ({ onDisconnect, onFindNext, interests, roomId, isInitiator }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [hasCameraPermission, setHasCameraPermission] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [isPeerConnected, setIsPeerConnected] = useState(false);
  const [isSearchingNext, setIsSearchingNext] = useState(false);
  
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const strangerVideoRef = useRef<HTMLVideoElement>(null);
  const moderationIntervalRef = useRef<NodeJS.Timeout>();
  
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const handleModeration = useCallback(async () => {
    if (strangerVideoRef.current && strangerVideoRef.current.readyState >= 2 && strangerVideoRef.current.videoWidth > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = strangerVideoRef.current.videoWidth;
      canvas.height = strangerVideoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(strangerVideoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL('image/jpeg');
        try {
          const result = await detectNudity({ photoDataUri: dataUri });
          if (result.isNsfw) {
            toast({
              variant: "destructive",
              title: "Safety Alert",
              description: "Inappropriate content detected. The chat has been terminated.",
            });
            onDisconnect();
          }
        } catch (error) {
          console.error("Moderation check failed:", error);
        }
      }
    }
  }, [onDisconnect, toast]);
  
  const handleMessage = useCallback((message: string) => {
    const newMessage: Message = { id: Date.now(), sender: 'stranger', text: message };
    setMessages((prev) => [...prev, newMessage]);
  }, []);

  const cleanupPeer = useCallback(() => {
    console.log("Cleaning up peer connection and listeners.");
    if (moderationIntervalRef.current) {
        clearInterval(moderationIntervalRef.current);
    }
    if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
    }
    if (peerRef.current) {
        peerRef.current.onicecandidate = null;
        peerRef.current.ontrack = null;
        peerRef.current.onconnectionstatechange = null;
        peerRef.current.ondatachannel = null;
        peerRef.current.close();
        peerRef.current = null;
    }
    if (dataChannelRef.current) {
        dataChannelRef.current.onopen = null;
        dataChannelRef.current.onmessage = null;
        dataChannelRef.current.close();
        dataChannelRef.current = null;
    }
    socket.off('signal');
    socket.off('message');
  }, []);

  useEffect(() => {
    const setupWebRTC = async () => {
        try {
            console.log("Requesting media devices...");
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStreamRef.current = stream;
            setHasCameraPermission(true);
            setIsCameraOn(true);
            setIsMicOn(true);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }

            console.log("Setting up Peer Connection...");
            peerRef.current = new RTCPeerConnection(ICE_SERVERS);
            
            stream.getTracks().forEach(track => peerRef.current!.addTrack(track, stream));

            peerRef.current.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('signal', { candidate: event.candidate });
                }
            };
            
            peerRef.current.ontrack = (event) => {
                if (strangerVideoRef.current) {
                    strangerVideoRef.current.srcObject = event.streams[0];
                }
            };

            peerRef.current.onconnectionstatechange = () => {
                const state = peerRef.current?.connectionState;
                console.log("Peer connection state:", state);
                if (state === 'connected') {
                    setIsPeerConnected(true);
                    setIsSearchingNext(false);
                    if (moderationIntervalRef.current) clearInterval(moderationIntervalRef.current);
                    moderationIntervalRef.current = setInterval(handleModeration, 5000);
                } else if (['disconnected', 'closed', 'failed'].includes(state!)) {
                    setIsPeerConnected(false);
                }
            };
            
            const handleSignal = async (data: any) => {
                if (!peerRef.current) return;
                try {
                    if (data.sdp) {
                        await peerRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
                        if (data.sdp.type === 'offer') {
                            const answer = await peerRef.current.createAnswer();
                            await peerRef.current.setLocalDescription(answer);
                            socket.emit('signal', { sdp: peerRef.current.localDescription });
                        }
                    } else if (data.candidate) {
                        await peerRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
                    }
                } catch (error) {
                    console.error("Error handling signal:", error);
                }
            };
            socket.on('signal', handleSignal);
            socket.on('message', handleMessage);

            if (isInitiator) {
                console.log("Creating data channel as initiator.");
                const channel = peerRef.current.createDataChannel('chat');
                channel.onopen = () => { console.log('Data channel open'); setIsPeerConnected(true); setIsSearchingNext(false); };
                channel.onmessage = (event) => handleMessage(event.data);
                dataChannelRef.current = channel;
                
                const offer = await peerRef.current.createOffer();
                await peerRef.current.setLocalDescription(offer);
                socket.emit('signal', { sdp: peerRef.current.localDescription });
            } else {
                 console.log("Setting up ondatachannel for receiver.");
                peerRef.current.ondatachannel = (event) => {
                    dataChannelRef.current = event.channel;
                    event.channel.onopen = () => { console.log('Data channel open'); setIsPeerConnected(true); setIsSearchingNext(false); };
                    event.channel.onmessage = (event) => handleMessage(event.data);
                };
            }
        } catch (error: any) {
            console.error('Error accessing media devices.', error);
            setHasCameraPermission(false);
            if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
                toast({
                    variant: 'destructive',
                    title: 'Camera & Mic Access Denied',
                    description: 'Please enable permissions in your browser settings to use video chat.',
                    duration: 9000,
                });
            }
        }
    };

    setupWebRTC();
    
    const initialUsers = Math.floor(Math.random() * 500) + 1000;
    setOnlineUsers(initialUsers);
    const usersInterval = setInterval(() => {
      setOnlineUsers((current) => Math.max(50, current + Math.floor(Math.random() * 21) - 10));
    }, 3000);

    return () => {
        clearInterval(usersInterval);
        cleanupPeer();
    };
  }, [roomId, isInitiator, toast, cleanupPeer, handleMessage, handleModeration]);

  const scrollToBottom = () => {
    const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
    if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
    }
  };

  useEffect(scrollToBottom, [messages]);
  
  const toggleMediaTrack = (kind: 'video' | 'audio') => {
    if (!hasCameraPermission || !localStreamRef.current) return;
      const track = localStreamRef.current.getTracks().find(t => t.kind === kind);
      if (track) {
        track.enabled = !track.enabled;
        if (kind === 'video') setIsCameraOn(track.enabled);
        else setIsMicOn(track.enabled);
      }
  };

  const handleSend = () => {
    if (input.trim() === '' || !dataChannelRef.current || dataChannelRef.current.readyState !== 'open') return;
    
    dataChannelRef.current.send(input);

    const newMessage: Message = { id: Date.now(), sender: 'you', text: input };
    setMessages((prev) => [...prev, newMessage]);
    setInput('');
  };
  
  const handleNext = () => {
    setIsSearchingNext(true);
    setMessages([]);
    onFindNext();
  }

  return (
    <div className="w-full h-full animate-fade-in grid grid-cols-5 grid-rows-1">
      <div className="col-span-2 flex flex-col p-4 gap-4">
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="relative flex-1 bg-muted rounded-lg overflow-hidden">
              <video ref={strangerVideoRef} className="w-full h-full object-cover" autoPlay playsInline />
              <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">Stranger</div>
               {isSearchingNext && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="mt-4">Searching for another stranger...</p>
                    </div>
                )}
               {!isPeerConnected && !isSearchingNext && hasCameraPermission && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="ml-2">Connecting...</p>
                    </div>
                )}
          </div>
          <div className="relative flex-1 bg-muted rounded-lg overflow-hidden">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
              <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">You</div>
              {!isCameraOn && hasCameraPermission &&
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 text-center p-2">
                      <VideoOff className="h-8 w-8 text-muted-foreground mb-2"/>
                      <p className="text-sm font-semibold">Your Camera is Off</p>
                  </div>
              }
              {!hasCameraPermission && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 text-center p-4">
                      <VideoOff className="h-8 w-8 text-destructive mb-2"/>
                      <p className="text-sm font-semibold text-destructive-foreground">Camera Permission Denied</p>
                      <p className="text-xs text-destructive-foreground/80 mt-1">ChitChatConnect needs camera access to work.</p>
                  </div>
              )}
          </div>
        </div>
        <div className="flex justify-start items-center gap-2 p-2 rounded-lg bg-secondary">
            <Button variant="destructive" onClick={onDisconnect}>Stop</Button>
            <Button variant="default" onClick={handleNext} disabled={!hasCameraPermission}>
                Next <X className="h-4 w-4 ml-2" />
            </Button>
            <Button variant="outline" size="icon" aria-label="Toggle Camera" onClick={() => toggleMediaTrack('video')} disabled={!hasCameraPermission}>
                {isCameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" aria-label="Toggle Mic" onClick={() => toggleMediaTrack('audio')} disabled={!hasCameraPermission}>
                {isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" aria-label="Report User">
                <ShieldAlert className="h-4 w-4" />
            </Button>
        </div>
      </div>
      
      <div className="col-span-3 flex flex-col bg-card border-l">
          <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold">ChitChatConnect</h1>
              </div>
          </div>
          <div className="p-4 border-b bg-secondary/50">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-primary truncate flex-1 mr-4">
                  {interests ? `You both like ${interests}` : "You're chatting with a random stranger"}
                </p>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground flex-shrink-0">
                    <Users className="h-4 w-4" />
                    <span>{onlineUsers.toLocaleString()}</span>
                </div>
              </div>
          </div>
          {!hasCameraPermission && (
            <div className="p-4 flex-1 flex items-center justify-center">
                <Alert variant="destructive" className="max-w-md">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Camera and Microphone Access Required</AlertTitle>
                    <AlertDescription>
                        You have denied permission to use your camera and microphone. Please enable access in your browser's site settings to use ChitChatConnect.
                    </AlertDescription>
                </Alert>
            </div>
          )}
          {hasCameraPermission && (
            <>
              <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                  <div className="space-y-4">
                  {messages.map((msg) => (
                      <MessageBubble key={msg.id} message={msg} />
                  ))}
                  </div>
              </ScrollArea>
              <div className="p-4 border-t bg-background">
                  <form
                      onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                      className="flex w-full items-center space-x-2"
                  >
                      <Textarea
                          placeholder={isPeerConnected ? "Type your message..." : "Waiting for connection..."}
                          className="flex-1 resize-none"
                          rows={2}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                          }}
                          disabled={!isPeerConnected}
                      />
                      <Button type="submit" disabled={!isPeerConnected} size="icon">
                          <Send className="h-4 w-4" />
                      </Button>
                  </form>
              </div>
            </>
          )}
      </div>
    </div>
  );
};

export default ChatPage;
