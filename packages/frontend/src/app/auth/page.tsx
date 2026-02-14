"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FieldGroup,
  Field,
  FieldLabel,
  FieldSeparator,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { authClient } from "@/lib/auth-client";

type AuthView = "login" | "signup" | "forgot-password";

export default function AuthPage() {
  const [view, setView] = useState<AuthView>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const resetState = useCallback((newView: AuthView) => {
    setView(newView);
    setError(null);
    setSuccessMessage(null);
  }, []);

  const handleLogin = useCallback(async () => {
    await authClient.signIn.email(
      {
        email,
        password,
      },
      {
        onRequest: () => {
          setIsLoading(true);
          setError(null);
        },
        onSuccess: () => {
          window.location.href = "/";
        },
        onError: (ctx: { error: { message: string } }) => {
          setIsLoading(false);
          setError(ctx.error.message);
        },
      },
    );
  }, [email, password]);

  const handleSignup = useCallback(async () => {
    await authClient.signUp.email(
      {
        email,
        password,
        name,
        hasCompletedOnboarding: false,
      },
      {
        onRequest: () => {
          setIsLoading(true);
          setError(null);
        },
        onSuccess: () => {
          window.location.href = "/";
        },
        onError: (ctx: { error: { message: string } }) => {
          setIsLoading(false);
          setError(ctx.error.message);
        },
      },
    );
  }, [email, password, name]);

  const handleForgotPassword = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    const { error: resetError } = await authClient.requestPasswordReset({
      email,
    });
    setIsLoading(false);
    if (resetError) {
      setError(resetError.message ?? "Failed to send reset link");
    } else {
      setSuccessMessage("Check your email for a reset link");
    }
  }, [email]);

  const handleSocialLogin = useCallback(async () => {
    await authClient.signIn.social({
      provider: "github",
      callbackURL: window.location.origin,
    });
  }, []);

  const handleSubmit = useCallback(
    (e: React.SubmitEvent) => {
      e.preventDefault();
      if (view === "login") handleLogin();
      else if (view === "signup") handleSignup();
      else if (view === "forgot-password") handleForgotPassword();
    },
    [view, handleLogin, handleSignup, handleForgotPassword],
  );

  const title = useMemo(() => {
    if (view === "signup") return "Create an account";
    if (view === "forgot-password") return "Reset your password";
    return "Welcome back";
  }, [view]);

  const description = useMemo(() => {
    if (view === "signup") return "Sign up for an Enfinyte account";
    if (view === "forgot-password") return "Enter your email to receive a reset link";
    return "Login to your Enfinyte account";
  }, [view]);

  const buttonLabel = useMemo(() => {
    if (isLoading) return "Loading...";
    if (view === "login") return "Login";
    if (view === "signup") return "Sign Up";
    return "Send reset link";
  }, [isLoading, view]);

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <div className={cn("flex flex-col gap-6")}>
          <Card className="overflow-hidden p-0">
            <CardContent className="grid p-0 md:grid-cols-2">
              <form className="p-6 md:p-8" onSubmit={handleSubmit}>
                <FieldGroup>
                  <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="text-2xl font-bold">{title}</h1>
                    <p className="text-muted-foreground text-balance">{description}</p>
                  </div>

                  {error && <FieldError className="text-center font-medium">{error}</FieldError>}

                  {successMessage && (
                    <div className="text-green-600 text-sm text-center font-medium">
                      {successMessage}
                    </div>
                  )}

                  {view === "signup" && (
                    <Field>
                      <FieldLabel htmlFor="name">Name</FieldLabel>
                      <Input
                        id="name"
                        type="text"
                        placeholder="John Doe"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </Field>
                  )}

                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </Field>

                  {view !== "forgot-password" && (
                    <Field>
                      <div className="flex items-center">
                        <FieldLabel htmlFor="password">Password</FieldLabel>
                        {view === "login" && (
                          <button
                            type="button"
                            onClick={() => resetState("forgot-password")}
                            className="ml-auto text-sm underline-offset-2 hover:underline cursor-pointer"
                          >
                            Forgot your password?
                          </button>
                        )}
                      </div>
                      <Input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </Field>
                  )}

                  <Field>
                    <Button type="submit" className="cursor-pointer w-full" disabled={isLoading}>
                      {buttonLabel}
                    </Button>
                  </Field>

                  {view !== "forgot-password" && (
                    <>
                      <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                        Or continue with
                      </FieldSeparator>
                      <Field className="grid grid-cols-1 gap-4">
                        <Button
                          variant="outline"
                          type="button"
                          className="cursor-pointer"
                          onClick={handleSocialLogin}
                        >
                          <svg
                            role="img"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                            className="mr-2 h-4 w-4"
                          >
                            <title>GitHub</title>
                            <path
                              fill="currentColor"
                              d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                            />
                          </svg>
                          <span>Login with Github</span>
                        </Button>
                      </Field>
                    </>
                  )}

                  <FieldDescription className="text-center">
                    {view === "login" && (
                      <>
                        Don&apos;t have an account?{" "}
                        <button
                          type="button"
                          onClick={() => resetState("signup")}
                          className="text-primary hover:underline cursor-pointer"
                        >
                          Sign up
                        </button>
                      </>
                    )}
                    {view === "signup" && (
                      <>
                        Already have an account?{" "}
                        <button
                          type="button"
                          onClick={() => resetState("login")}
                          className="text-primary hover:underline cursor-pointer"
                        >
                          Login
                        </button>
                      </>
                    )}
                    {view === "forgot-password" && (
                      <button
                        type="button"
                        onClick={() => resetState("login")}
                        className="text-primary hover:underline cursor-pointer"
                      >
                        Back to login
                      </button>
                    )}
                  </FieldDescription>
                </FieldGroup>
              </form>
              <div className="bg-muted relative hidden md:block">
                <Image
                  src="/auth-banner.png"
                  alt="Image"
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale select-none"
                  width={800}
                  height={600}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
