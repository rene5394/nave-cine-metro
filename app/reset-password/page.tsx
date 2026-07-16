import Link from "next/link";
import { findValidResetToken } from "@/lib/tokens";
import { ResetPasswordForm } from "./reset-password-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const record = token ? await findValidResetToken(token) : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      {record ? (
        <ResetPasswordForm token={token!} />
      ) : (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Enlace inválido</CardTitle>
            <CardDescription>
              Este enlace para restablecer tu contraseña no es válido o ha expirado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/forgot-password">Solicitar un nuevo enlace</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
