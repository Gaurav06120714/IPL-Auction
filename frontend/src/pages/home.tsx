import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/services/api";
import { saveSession } from "@/store/session";
import { IPL_TEAMS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Trophy, ArrowRight } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";

export default function Home() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("join");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");

  const createRoom = useMutation({
    mutationFn: () => api.createRoom(name, selectedTeam),
    onSuccess: (data) => {
      saveSession({ userId: data.users[0].id, roomId: data.roomId, name, teamName: selectedTeam, isHost: true });
      setLocation(`/room/${data.roomId}`);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message || "Failed to create room", variant: "destructive" }),
  });

  const joinRoom = useMutation({
    mutationFn: () => api.joinRoom(roomId, name, selectedTeam),
    onSuccess: (data) => {
      saveSession({ userId: data.userId, roomId: data.roomId, name: data.name, teamName: data.teamName, isHost: data.isHost });
      setLocation(`/room/${data.roomId}`);
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message || "Failed to join room", variant: "destructive" }),
  });

  const handleAction = () => {
    if (!name.trim()) return toast({ title: "Wait!", description: "Please enter your name", variant: "destructive" });
    if (!selectedTeam) return toast({ title: "Wait!", description: "Please select an IPL team", variant: "destructive" });
    if (activeTab === "create") {
      createRoom.mutate();
    } else {
      if (!roomId.trim()) return toast({ title: "Wait!", description: "Please enter a Room ID", variant: "destructive" });
      joinRoom.mutate();
    }
  };

  const isPending = createRoom.isPending || joinRoom.isPending;

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center md:text-left space-y-6"
        >
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl border border-primary/20 mb-4">
            <Trophy className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-black text-white leading-[1.1] uppercase tracking-tight drop-shadow-2xl">
            Ultimate <br />
            <span className="text-gradient-gold">IPL Fantasy</span><br />
            Auction
          </h1>
          <p className="text-lg text-white/70 max-w-md mx-auto md:mx-0">
            Create a room, invite your friends, and experience the thrill of a real-time player auction. Build your dream squad with a 100 Crore purse.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
          <Card className="glass-panel border-white/10 shadow-2xl">
            <CardHeader>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-black/40 border border-white/5">
                  <TabsTrigger value="join" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Join Room</TabsTrigger>
                  <TabsTrigger value="create" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">Create Room</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-4">
                {activeTab === "join" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Room ID</label>
                    <Input placeholder="e.g. ABCD1234" value={roomId} onChange={(e) => setRoomId(e.target.value.toUpperCase())} className="bg-black/50 border-white/10 h-12 text-lg focus-visible:ring-primary" />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Your Name</label>
                  <Input placeholder="Enter your alias" value={name} onChange={(e) => setName(e.target.value)} className="bg-black/50 border-white/10 h-12 text-lg focus-visible:ring-primary" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Select Franchise</label>
                  <div className="grid grid-cols-5 gap-2">
                    {IPL_TEAMS.map((team) => (
                      <button
                        key={team.id}
                        onClick={() => setSelectedTeam(team.id)}
                        className={`aspect-square rounded-xl flex items-center justify-center font-display font-bold text-lg transition-all duration-200 border-2 ${selectedTeam === team.id ? `${team.color} ${team.text} border-white shadow-lg scale-110 z-10` : "bg-black/50 border-white/10 text-white/50 hover:bg-white/10 hover:border-white/30"}`}
                        title={team.name}
                      >
                        {team.id}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleAction}
                disabled={isPending}
                className="w-full h-14 text-lg font-bold uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all"
              >
                {isPending ? "Connecting..." : (
                  <span className="flex items-center gap-2">
                    {activeTab === "create" ? "Create & Enter Lobby" : "Join Lobby"}
                    <ArrowRight className="w-5 h-5" />
                  </span>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      <Toaster />
    </div>
  );
}
