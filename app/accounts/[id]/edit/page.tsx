import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAccountById } from "@/lib/actions";
import { EditAccountFullPage } from "./EditAccountFullPage";

interface EditAccountPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAccountPage({ params }: EditAccountPageProps) {
  const session = await auth();
  
  if (!session) {
    redirect("/");
  }

  const resolvedParams = await params;
  const account = await getAccountById(resolvedParams.id);

  if (!account) {
    redirect("/");
  }

  return <EditAccountFullPage account={account} />;
}
