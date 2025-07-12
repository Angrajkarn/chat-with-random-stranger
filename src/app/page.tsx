
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import HomePage from '@/components/home-page';
import ChatPage from '@/components/chat-page';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { socket, connect, disconnect } from '@/lib/socket';

type AppState = 'idle' | 'searching' | 'connected' | 'disconnected';

export default function Home() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [interests, setInterests] = useState<string>('');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [partnerInterests, setPartnerInterests] = useState<string>('');
  const [isInitiator, setIsInitiator] = useState(false);
  const { toast } = useToast();
  
  const handlePartnerFound = useCallback(({ roomId, interests, isInitiator }: { roomId: string, interests: string, isInitiator: boolean }) => {
    setRoomId(roomId);
    setPartnerInterests(interests);
    setIsInitiator(isInitiator);
    setAppState('connected');
  }, []);

  const handlePartnerDisconnect = useCallback(() => {
    handleDisconnect(false);
    toast({
        title: 'Partner Disconnected',
        description: 'The other user has left the chat.',
    });
  }, [toast]);

  useEffect(() => {
    if (!socket || !socket.connected) {
      connect();
    }

    if (socket) {
        socket.on('partnerFound', handlePartnerFound);
        socket.on('partnerDisconnected', handlePartnerDisconnect);
    }

    return () => {
      if (socket) {
          socket.off('partnerFound', handlePartnerFound);
          socket.off('partnerDisconnected', handlePartnerDisconnect);
      }
    };
  }, [handlePartnerFound, handlePartnerDisconnect]);
  
  const handleStartChat = async (userInterests: string) => {
    setInterests(userInterests);
    setAppState('searching');
    socket.emit('findPartner', { interests: userInterests });
  };

  const handleFindNext = async () => {
    setAppState('searching');
    setRoomId(null);
    socket.emit('findPartner', { interests });
  };

  const handleDisconnect = (isManual: boolean = true) => {
    if (isManual) {
      if (appState === 'searching') {
        socket.emit('cancelSearch');
      } else if(appState === 'connected') {
        socket.emit('manualDisconnect');
      }
    }
    setAppState('disconnected');
    setRoomId(null);
    setInterests('');
    setPartnerInterests('');
    setIsInitiator(false);
  };
  
  const handleCancelSearch = () => {
    socket.emit('cancelSearch');
    setAppState('idle');
  }

  const renderContent = () => {
    switch (appState) {
      case 'idle':
      case 'disconnected':
        return <HomePage onStartChat={handleStartChat} isDisconnected={appState === 'disconnected'} />;
      case 'searching':
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <Card className="w-full max-w-lg shadow-2xl animate-fade-in">
              <CardHeader>
                <CardTitle className="text-center text-2xl font-bold">ChitChatConnect</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center space-y-4 p-10">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">Searching for a random stranger...</p>
                {interests && <p className="text-sm text-center">with interests: <span className="font-semibold">{interests}</span></p>}
                <button onClick={handleCancelSearch} className="text-sm text-muted-foreground underline">Cancel</button>
              </CardContent>
            </Card>
          </div>
        );
      case 'connected':
        if (!roomId) return null;
        return <ChatPage 
                    onDisconnect={() => handleDisconnect(true)} 
                    onFindNext={handleFindNext} 
                    interests={partnerInterests || interests} 
                    roomId={roomId}
                    isInitiator={isInitiator}
                />;
      default:
        return null;
    }
  };

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
      <div className="w-full h-screen">
        {renderContent()}
      </div>
    </main>
  );
}
