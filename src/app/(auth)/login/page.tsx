"use client";

import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const { signInWithAzure, signInWithEmail } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleMicrosoftLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithAzure();
    } catch {
      setError("Failed to sign in. Please try again.");
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmail(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in.");
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
      <h1 className="mb-1 text-center text-2xl font-semibold tracking-tight text-foreground">
        International Center
      </h1>
      <p className="mb-8 text-center text-sm text-muted-foreground">
        Sign in with your organization account
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button
        onClick={handleMicrosoftLogin}
        disabled={loading}
        className="w-full"
      >
        {loading ? "Signing in…" : "Sign in with Microsoft"}
      </Button>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleEmailLogin} className="space-y-3">
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
        />
        <Button
          type="submit"
          variant="outline"
          disabled={loading}
          className="w-full"
        >
          {loading ? "Signing in…" : "Sign in with email"}
        </Button>
      </form>
    </div>
  );
}
