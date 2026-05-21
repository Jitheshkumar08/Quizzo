"use client";

import Link from "next/link";
import type { ComponentProps, MouseEventHandler } from "react";
import { markQuizStartIntent } from "./quizBrowserHistory";

type QuizStartLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  quizId: string;
  href?: string;
};

export default function QuizStartLink({
  quizId,
  href,
  onClick,
  ...props
}: QuizStartLinkProps) {
  const handleClick: MouseEventHandler<HTMLAnchorElement> = (event) => {
    markQuizStartIntent(quizId);
    onClick?.(event);
  };

  return (
    <Link
      {...props}
      href={href ?? `/student/quizzes/${quizId}`}
      onClick={handleClick}
    />
  );
}
