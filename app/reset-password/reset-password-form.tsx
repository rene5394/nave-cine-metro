"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(resetPassword, null);

  useEffect(() => {
    if (state?.success) router.push("/login?reset=success");
  }, [state, router]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Restablecer Contraseña</CardTitle>
        <CardDescription>Ingresa tu nueva contraseña</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="token" value={token} />
          {state && !state.success && (
            <div className="space-y-2">
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {state.error}
              </div>
              {state.code === "invalid_token" && (
                <Link href="/forgot-password" className="text-sm underline underline-offset-4">
                  Solicitar un nuevo enlace
                </Link>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">Nueva contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Guardando..." : "Restablecer contraseña"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
