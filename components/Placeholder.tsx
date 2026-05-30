type Props = {
  title: string;
  className?: string;
};

const BG_COLORS = [
  "bg-red-200 text-red-800",
  "bg-orange-200 text-orange-800",
  "bg-yellow-200 text-yellow-800",
  "bg-green-200 text-green-800",
  "bg-teal-200 text-teal-800",
  "bg-blue-200 text-blue-800",
  "bg-indigo-200 text-indigo-800",
  "bg-purple-200 text-purple-800",
  "bg-pink-200 text-pink-800",
];

function colorFor(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  }
  return BG_COLORS[hash % BG_COLORS.length];
}

export default function Placeholder({ title, className = "" }: Props) {
  const initial = title.trim()[0]?.toUpperCase() ?? "?";
  return (
    <div
      className={`flex items-center justify-center font-bold select-none ${colorFor(title)} ${className}`}
    >
      {initial}
    </div>
  );
}
