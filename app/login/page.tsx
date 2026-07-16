import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; reset?: string }>;
}) {
  const { from, reset } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <LoginForm from={from} resetSuccess={reset === "success"} />
    </div>
  );
}
