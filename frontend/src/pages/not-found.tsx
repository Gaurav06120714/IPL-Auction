import { useLocation } from "wouter";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  const [_, setLocation] = useLocation();
  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <div className="text-center space-y-4">
        <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
        <h1 className="text-4xl font-bold text-white">404 — Page Not Found</h1>
        <p className="text-white/60">This page doesn't exist.</p>
        <button onClick={() => setLocation("/")} className="text-primary underline underline-offset-4 hover:text-primary/80 transition-colors">
          Go Home
        </button>
      </div>
    </div>
  );
}
