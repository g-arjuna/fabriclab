import { redirect } from "next/navigation";

type Props = { params: Promise<{ chapter: string }> };

export default async function OldChapterRedirect({ params }: Props) {
  const { chapter } = await params;
  redirect(`/learn/${chapter}`);
}
