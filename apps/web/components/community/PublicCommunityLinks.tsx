import type { ReactNode } from "react";

import { getPublicCommunityConfig } from "@/lib/community/config";

function RepositoryIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current">
      <path d="M12 .5C5.65.5.5 5.7.5 12.13c0 5.14 3.29 9.5 7.86 11.03.58.11.79-.26.79-.57 0-.28-.01-1.03-.02-2.03-3.2.71-3.88-1.57-3.88-1.57-.52-1.35-1.28-1.71-1.28-1.71-1.04-.73.08-.71.08-.71 1.15.08 1.75 1.2 1.75 1.2 1.02 1.78 2.68 1.27 3.33.97.1-.75.4-1.27.72-1.56-2.55-.3-5.24-1.3-5.24-5.76 0-1.27.45-2.3 1.18-3.12-.12-.3-.51-1.5.11-3.14 0 0 .97-.31 3.17 1.19a10.86 10.86 0 0 1 5.78 0c2.19-1.5 3.16-1.19 3.16-1.19.63 1.64.24 2.84.12 3.14.74.82 1.18 1.85 1.18 3.12 0 4.47-2.69 5.46-5.25 5.75.41.36.77 1.06.77 2.15 0 1.55-.01 2.8-.01 3.18 0 .31.21.69.8.57A11.66 11.66 0 0 0 23.5 12.13C23.5 5.7 18.35.5 12 .5Z" />
    </svg>
  );
}

function DiscussionIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current">
      <path
        d="M6 6.5h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H11l-4.5 3v-3H6a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IssueIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current">
      <circle cx="12" cy="12" r="8.5" strokeWidth="1.7" />
      <path d="M12 7.5v5.4" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="16.2" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SupportIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current">
      <path
        d="M12 20s-6.5-4.26-8.53-8.03C1.8 8.88 3.3 5.5 6.9 5.5c2.04 0 3.3 1.18 4.1 2.38.8-1.2 2.06-2.38 4.1-2.38 3.6 0 5.1 3.38 3.43 6.47C18.5 15.74 12 20 12 20Z"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type PublicCommunityLinksProps = {
  compact?: boolean;
};

export function PublicCommunityLinks({ compact = false }: PublicCommunityLinksProps) {
  const config = getPublicCommunityConfig();

  const links = [
    config.repoUrl
      ? {
          href: config.repoUrl,
          label: "Contribute",
          icon: <RepositoryIcon />,
        }
      : null,
    config.issuesUrl
      ? {
          href: config.issuesUrl,
          label: "Issues",
          icon: <IssueIcon />,
        }
      : null,
    config.discussionsUrl
      ? {
          href: config.discussionsUrl,
          label: "Discussions",
          icon: <DiscussionIcon />,
        }
      : null,
    config.supportUrl
      ? {
          href: config.supportUrl,
          label: "Support",
          icon: <SupportIcon />,
        }
      : null,
  ].filter(Boolean) as { href: string; label: string; icon: ReactNode }[];

  if (links.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-center gap-3 ${compact ? "" : "justify-center sm:justify-end"}`}>
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className={`inline-flex items-center gap-2 rounded-full border border-white/10 text-slate-300 transition hover:border-white/20 hover:text-white ${
            compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
          }`}
        >
          <span className="text-cyan-300">{link.icon}</span>
          <span>{link.label}</span>
        </a>
      ))}
    </div>
  );
}
