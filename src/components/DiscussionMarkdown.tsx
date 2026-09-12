import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const DiscussionMarkdown = ({ children }: { children: string }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      a: ({ children: label, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className="break-words text-primary underline underline-offset-4">{label}</a>,
      img: ({ alt, ...props }) => <img {...props} alt={alt || "Discussion attachment"} loading="lazy" className="my-6 max-h-[560px] max-w-full border border-border object-contain" />,
      p: ({ children: paragraph }) => <p className="whitespace-pre-wrap">{paragraph}</p>,
    }}
  >
    {children}
  </ReactMarkdown>
);
