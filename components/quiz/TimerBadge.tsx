"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";

type DateLike = Date | string;

function toTime(value: DateLike) {
    return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export default function TimerBadge({
    quizId,
    startTime,
    timeLimitMinutes,
    scheduledEnd,
    serverNow,
}: {
    quizId: string;
    startTime: DateLike;
    timeLimitMinutes: number | null;
    scheduledEnd: DateLike | null;
    serverNow: DateLike;
}) {
    const router = useRouter();
    const [remainingSec, setRemainingSec] = useState<number | null>(null);
    const [finalizing, setFinalizing] = useState(false);
    const [finalized, setFinalized] = useState(false);
    const expireFired = useRef(false);
    const serverSkewMs = useRef(0);

    useEffect(() => {
        serverSkewMs.current = toTime(serverNow) - Date.now();
    }, [serverNow]);

    useEffect(() => {
        if (!timeLimitMinutes && !scheduledEnd) {
            return;
        }

        let deadlineTime: number | null = null;

        if (timeLimitMinutes) {
            deadlineTime = toTime(startTime) + timeLimitMinutes * 60 * 1000;
        }

        if (scheduledEnd) {
            const scheduledTime = toTime(scheduledEnd);
            if (!deadlineTime || scheduledTime < deadlineTime) {
                deadlineTime = scheduledTime;
            }
        }

        if (!deadlineTime) {
            return;
        }

        const tick = () => {
            const now = Date.now() + serverSkewMs.current;
            const sec = Math.max(0, Math.ceil((deadlineTime! - now) / 1000));
            setRemainingSec(sec);
        };

        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [startTime, timeLimitMinutes, scheduledEnd]);

    useEffect(() => {
        if (remainingSec !== 0 || expireFired.current || finalized) return;

        expireFired.current = true;
        setFinalizing(true);

        fetch(`/api/quiz/${encodeURIComponent(quizId)}/expire`, {
            method: "POST",
            credentials: "include",
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.expired || data.resultId) {
                    setFinalized(true);
                    router.refresh();
                }
            })
            .catch((error) => {
                console.error("Failed to finalize expired quiz:", error);
                expireFired.current = false;
            })
            .finally(() => setFinalizing(false));
    }, [remainingSec, quizId, router, finalized]);

    if (remainingSec === null) {
        return (
            <div className="px-3 py-1 rounded-full bg-purple-50 text-xs font-semibold text-purple-600 flex items-center gap-1.5 border border-purple-100">
                <Clock className="w-3.5 h-3.5" /> Continue Test
            </div>
        );
    }

    if (finalized) {
        return (
            <div className="px-3 py-1 rounded-full bg-emerald-50 text-xs font-semibold text-emerald-700 flex items-center gap-1.5 border border-emerald-200">
                <Clock className="w-3.5 h-3.5" /> Submitted
            </div>
        );
    }

    const m = Math.floor(remainingSec / 60)
        .toString()
        .padStart(2, "0");
    const s = (remainingSec % 60).toString().padStart(2, "0");
    const isWarning = remainingSec <= 60;

    const colors = isWarning
        ? "bg-red-50 text-red-600 border-red-200"
        : "bg-purple-50 text-purple-600 border-purple-100";

    return (
        <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 border min-w-max shadow-sm ${colors}`}>
            <Clock className="w-3.5 h-3.5 flex-shrink-0" /> <span className="whitespace-nowrap">{finalizing ? "Submitting..." : `${m}:${s} left`}</span>
        </div>
    );
}
