import { Suspense } from "react";
import ConviteForm from "./ConviteForm";

type Props = { params: Promise<{ token: string }> };

export default async function ConvitePage({ params }: Props) {
  const { token } = await params;
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><span className="animate-spin h-6 w-6 rounded-full border-2 border-primary border-t-transparent" /></div>}>
      <ConviteForm token={token} />
    </Suspense>
  );
}
