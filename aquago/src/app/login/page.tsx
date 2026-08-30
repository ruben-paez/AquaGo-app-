import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import Nav from "@/components/Nav";
import LoginForm from "./LoginForm";

export const metadata = { title: "Ingresar · AquaGo" };

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect(user.isAdmin ? "/admin" : "/pedir");

  return (
    <div className="flex min-h-dvh flex-col">
      <Nav />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-14">
        <LoginForm />
      </main>
    </div>
  );
}
