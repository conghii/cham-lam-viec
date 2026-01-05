"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, signInWithGoogle } from "@/lib/firebase/auth";
import { createUserProfile } from "@/lib/firebase/firestore";
import { useRouter } from "next/navigation";
import { Layout, Loader2 } from "lucide-react";

export default function RegisterPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await createUserProfile(userCredential.user);
            router.push("/dashboard");
        } catch (err: any) {
            console.error(err)
            if (err.code === "auth/email-already-in-use") {
                setError("Email is already in use.");
            } else if (err.code === "auth/invalid-email") {
                setError("Invalid email address.");
            } else if (err.code === "auth/weak-password") {
                setError("Password should be at least 6 characters.");
            } else if (err.code === "auth/operation-not-allowed") {
                setError("Email/Password sign-in is not enabled in Firebase Console.");
            } else {
                setError(err.message || "Failed to create account. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            await signInWithGoogle();
            router.push("/dashboard");
        } catch (error: any) {
            console.error(error);
            setError("Failed to sign in with Google.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
            <div className="flex items-center justify-center py-12">
                <div className="mx-auto grid w-[350px] gap-6">
                    <div className="grid gap-2 text-center">
                        <div className="flex justify-center mb-4">
                            <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                <Layout className="h-6 w-6 text-primary" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold">Create an account</h1>
                        <p className="text-balance text-muted-foreground">
                            Enter your email below to create your account
                        </p>
                    </div>
                    {error && (
                        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium text-center">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleRegister} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-11"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-11"
                            />
                        </div>
                        <Button type="submit" className="w-full h-11" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign Up"}
                        </Button>
                        <Button variant="outline" type="button" className="w-full h-11" onClick={handleGoogleLogin} disabled={loading}>
                            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                            </svg>
                            Sign up with Google
                        </Button>
                    </form>
                    <div className="mt-4 text-center text-sm">
                        Already have an account?{" "}
                        <Link href="/login" className="underline font-medium text-primary decoration-primary/30 underline-offset-4 hover:decoration-primary transition-all">
                            Login
                        </Link>
                    </div>
                </div>
            </div>
            <div className="hidden bg-muted lg:block relative overflow-hidden">
                <div className="absolute inset-0 bg-zinc-900 border-l border-white/10 dark:border-white/5" />
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1590069261209-f8e9b8642343?q=80&w=2152&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-overlay" />
                <div className="relative h-full flex flex-col p-10 text-white z-10">
                    <div className="flex items-center gap-2 font-medium text-lg">
                        <Layout className="h-6 w-6" />
                        <span>ChamLam</span>
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                        <div className="space-y-2 max-w-lg">
                            <h2 className="text-3xl font-bold leading-tight">
                                "Start where you are. Use what you have. Do what you can."
                            </h2>
                            <p className="text-zinc-400 text-lg">- Arthur Ashe</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
