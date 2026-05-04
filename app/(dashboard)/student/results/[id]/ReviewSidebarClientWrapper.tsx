"use client";

import React, { useState } from "react";
import ReviewSidebar from "@/components/quiz/ReviewSidebar";
import ReviewQuestionsClient from "./ReviewQuestionsClient";

const QUESTIONS_PER_PAGE = 20;

interface Question {
  id: string;
  questionText: string;
  options: unknown;
  correctAnswer: string;
  explanation?: string | null;
  order: number;
}

interface Props {
  questions: Question[];
  userAnswers: Record<string, string>;
  children: React.ReactNode; // static content: back link, score card, stats, actions
}

export default function ReviewSidebarClientWrapper({
  questions,
  userAnswers,
  children,
}: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  // Called by the sidebar when the user clicks a question number bubble.
  // Navigates to the correct page then scrolls to that question — identical
  // to the jumpToQuestion logic in QuizTaker.
  function jumpToQuestion(index: number) {
    setCurrentPage(Math.floor(index / QUESTIONS_PER_PAGE));
    setTimeout(() => {
      const el = document.getElementById(`question-${index}`);
      const scrollArea = document.getElementById("dashboard-scroll-area");
      if (el && scrollArea) {
        const scrollAreaRect = scrollArea.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        scrollArea.scrollTo({
          top: scrollArea.scrollTop + (elRect.top - scrollAreaRect.top) - 24,
          behavior: "smooth",
        });
      } else if (el) {
        window.scrollTo({
          top: el.getBoundingClientRect().top + window.scrollY - 120,
          behavior: "smooth",
        });
      }
    }, 60); // small delay lets React finish rendering the new page first
  }

  return (
    <>
      <ReviewSidebar
        questions={questions}
        userAnswers={userAnswers}
        isOpen={sidebarOpen}
        onToggle={setSidebarOpen}
        onJump={jumpToQuestion}
      />

      {/* Same pattern as QuizTaker: transition-all on padding-right, no cascade */}
      <div
        className={`min-h-[calc(100vh-8rem)] transition-all duration-300 ease-in-out ${sidebarOpen ? "lg:pr-[260px] pr-0" : "pr-0"
          }`}
      >
        <div className="flex-1 min-w-0 flex flex-col gap-6 animate-fade-in-up">
          {/* Score card, stats, actions, back link (server-rendered, never re-renders) */}
          {children}

          {/* Paginated question review (client-rendered, 20 per page) */}
          <ReviewQuestionsClient
            questions={questions}
            userAnswers={userAnswers}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </>
  );
}
