import Link from "next/link";

import { CommunityForumThreadView } from "@/components/community/CommunityForumThread";
import { PublicTopNav } from "@/components/layout/PublicTopNav";

type Props = {
  params: Promise<{ threadId: string }>;
};

export default async function CommunityThreadPage({ params }: Props) {
  const { threadId } = await params;

  return (
    <main className="min-h-screen bg-[#020617] text-slate-100">
      <PublicTopNav ctaHref="/community" ctaLabel="Community hub" />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
        <Link href="/community" className="text-sm text-cyan-300 transition hover:text-cyan-200">
          {"<- Back to community"}
        </Link>
        <div className="mt-6 sm:mt-8">
          <CommunityForumThreadView threadId={threadId} />
        </div>
      </div>
    </main>
  );
}
