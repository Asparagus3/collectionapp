import Link from "next/link";
import CoverImage from "@/components/CoverImage";
import Placeholder from "@/components/Placeholder";

type Props = {
  title: string;
  authorArtist?: string | null;
  coverUrl?: string | null;
  type?: "book" | "music";
  meta?: string;
  metaHref?: string;
  action?: React.ReactNode;
};

export default function ItemCard({
  title,
  authorArtist,
  coverUrl,
  type,
  meta,
  metaHref,
  action,
}: Props) {
  return (
    <li className="flex items-center gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3">
      {/* カバー画像 */}
      <div className="relative h-16 w-12 flex-none overflow-hidden rounded">
        {coverUrl ? (
          <CoverImage src={coverUrl} alt={title} />
        ) : (
          <Placeholder title={title} className="h-full w-full text-xl" />
        )}
      </div>

      {/* テキスト */}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {title}
        </p>
        {authorArtist && (
          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
            {authorArtist}
          </p>
        )}
        {meta && (
          metaHref ? (
            <Link
              href={metaHref}
              className="mt-0.5 block text-xs text-zinc-400 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-400 hover:underline"
            >
              {meta}
            </Link>
          ) : (
            <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-600">{meta}</p>
          )
        )}
        {type && (
          <span className="mt-1 inline-block rounded-full border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {type === "book" ? "本" : "音楽"}
          </span>
        )}
      </div>

      {/* アクション */}
      {action && <div className="flex-none">{action}</div>}
    </li>
  );
}
