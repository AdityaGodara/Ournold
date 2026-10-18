"use client";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Markdown styled for the assistant bubble (no typography plugin needed). */
export default function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: (p) => <p className="mb-2 last:mb-0 leading-relaxed" {...p} />,
        ul: (p) => <ul className="list-disc pl-5 mb-2 space-y-1" {...p} />,
        ol: (p) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...p} />,
        h1: (p) => <h3 className="text-lg font-bold mt-3 mb-1" {...p} />,
        h2: (p) => <h3 className="text-base font-bold mt-3 mb-1" {...p} />,
        h3: (p) => <h4 className="text-base font-semibold mt-2 mb-1" {...p} />,
        strong: (p) => <strong className="font-semibold" {...p} />,
        a: (p) => <a className="underline text-blue-700" target="_blank" rel="noopener noreferrer" {...p} />,
        blockquote: (p) => <blockquote className="border-l-4 border-gray-400 pl-3 italic mb-2" {...p} />,
        code: ({ className, children, ...rest }) =>
          className ? (
            <code className={`${className} block`} {...rest}>
              {children}
            </code>
          ) : (
            <code className="bg-gray-300 rounded px-1 py-0.5 text-[0.85em]" {...rest}>
              {children}
            </code>
          ),
        pre: (p) => <pre className="bg-gray-800 text-stone-100 rounded-lg p-3 overflow-x-auto text-sm mb-2" {...p} />,
        table: (p) => (
          <div className="overflow-x-auto mb-2">
            <table className="min-w-full text-sm border-collapse" {...p} />
          </div>
        ),
        th: (p) => <th className="border border-gray-400 bg-gray-300 px-2 py-1 text-left font-semibold" {...p} />,
        td: (p) => <td className="border border-gray-400 px-2 py-1" {...p} />,
        hr: () => <hr className="my-3 border-gray-400" />,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
