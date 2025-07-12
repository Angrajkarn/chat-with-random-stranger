"use client";

import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CheckCircle, Users } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface HomePageProps {
  onStartChat: (interests: string) => void;
  isDisconnected: boolean;
}

const HomePage: FC<HomePageProps> = ({ onStartChat, isDisconnected }) => {
  const [interests, setInterests] = useState('');
  const [onlineUsers, setOnlineUsers] = useState(0);

  useEffect(() => {
    // Simulate online user count
    const initialUsers = Math.floor(Math.random() * 500) + 1000;
    setOnlineUsers(initialUsers);

    const interval = setInterval(() => {
      setOnlineUsers((currentUsers) => {
        const fluctuation = Math.floor(Math.random() * 21) - 10; // between -10 and 10
        const newCount = currentUsers + fluctuation;
        return newCount > 50 ? newCount : 50; // Ensure it doesn't drop too low
      });
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, []);


  const handleStart = () => {
    onStartChat(interests);
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">ChitChatConnect</h1>
        <p className="text-muted-foreground mt-2">Talk to random strangers one-on-one.</p>
        <div className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-primary">
            <Users className="h-5 w-5" />
            <span>{onlineUsers.toLocaleString()} users online</span>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
              <Label htmlFor="interests" className="font-semibold">What do you wanna talk about?</Label>
              <div className="relative">
                  <Input 
                      id="interests"
                      placeholder="e.g. programming, music, movies (optional)"
                      value={interests}
                      onChange={(e) => setInterests(e.target.value)}
                      className="pl-4"
                  />
              </div>
          </div>
          <div className="rounded-md border bg-muted/50 p-4 text-xs text-muted-foreground">
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>You must be 18+ to use ChitChatConnect.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>Chats are anonymous. For your safety, do not share personal information.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>Chats are monitored for safety. Violators will be banned.</span>
              </li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-center justify-center p-6 bg-secondary/50">
          {isDisconnected && (
            <p className="mb-4 text-center text-sm text-destructive font-semibold">You have disconnected. Find a new stranger?</p>
          )}
          <Button onClick={handleStart} size="lg" className="w-full text-lg font-semibold shadow-lg hover:shadow-xl transition-shadow">
            {isDisconnected ? 'New Chat' : 'Start a Chat'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default HomePage;
