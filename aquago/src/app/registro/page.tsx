import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import Nav from "@/components/Nav";
import RegisterForm from "./RegisterForm";

export const metadata = { title: "Crear cuenta · AquaGo" };

export default async function RegistroPage() {
  const user = await getSessionUser();
  if (user) redirect("/pedir");

  return (
    <div className="flex min-h-dvh flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <RegisterForm />
      </main>
    </div>
  );
}
