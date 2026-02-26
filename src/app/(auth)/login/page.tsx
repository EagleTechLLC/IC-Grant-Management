"use client";

import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";

export default function LoginPage() {
  const { signInWithAzure } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithAzure();
    } catch {
      setError("Failed to sign in. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg bg-white p-8 shadow-md">
      <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">
        International Center
      </h1>
      <p className="mb-8 text-center text-sm text-gray-600">
        Sign in with your organization account
      </p>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        onClick={handleLogin}
        disabled={loading}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Signing in..." : "Sign in with Microsoft"}
      </button>
    </div>
  );
}
