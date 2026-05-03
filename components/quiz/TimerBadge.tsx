"use client";

import { useState, useEffect, useRef } from "react";
import { Clock } from "lucide-react";

export default function TimerBadge({
    startTime,
    timeLimitMinutes,
    scheduledEnd,
}: {
    startTime: Date;
    timeLimitMinutes: number | null;
    scheduledEnd: Date | null;
}) {
    const [remainingSec, setRemainingSec] = useState<number | null>(null);

    useEffect(() => {
        if (!timeLimitMinutes && !scheduledEnd) {
            setRemainingSec(null);
            return;
        }

        let deadlineTime: number | null = null;

        if (timeLimitMinutes) {
            deadlineTime = startTime.getTime() + timeLimitMinutes * 60 * 1000;
        }

        if (scheduledEnd) {
            const scheduledTime = new Date(scheduledEnd).getTime();
            if (!deadlineTime || scheduledTime < deadlineTime) {
                deadlineTime = scheduledTime;
            }
        }

        if (!deadlineTime) {
            setRemainingSec(null);
            return;
        }

        const tick = () => {
            const now = Date.now();
            const sec = Math.max(0, Math.ceil((deadlineTime! - now) / 1000));
            setRemainingSec(sec);
        };

        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [startTime, timeLimitMinutes, scheduledEnd]);

    if (remainingSec === null) {
        return (
            <div className="px-3 py-1 rounded-full bg-purple-50 text-xs font-semibold text-purple-600 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                <Clock className="w-3.5 h-3.5" /> Continue Test
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
        <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 border ${colors}`}>
            <Clock className="w-3.5 h-3.5" /> {m}:{s} left
        </div>
    );
}
