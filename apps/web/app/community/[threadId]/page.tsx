import Link from "next/link";

import { CommunityForumThreadView } from "@/components/community/CommunityForumThread";

type Props = {
  params: Promise<{ threadId: string }>;
};

export default async function CommunityThreadPage({ params }: Props) {
  const { threadId } = await params;

  return (
    <main className="min-h-screen bg-[#020617] px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <Link href="/community" className="text-sm text-cyan-300 transition hover:text-cyan-200">
          {"<- Back to community"}
        </Link>
        <div className="mt-8">
          <CommunityForumThreadView threadId={threadId} />
        </div>
      </div>
    </main>
  );
}
