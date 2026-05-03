import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: quizId } = await params;
        const body = await req.json();
        const { userAnswers } = body as { userAnswers: Record<string, string> };

        // Update the open session with current answers
        const openSession = await prisma.quizSession.findFirst({
            where: { quizId, studentId: session.user.id, submittedAt: null },
        });

        if (openSession) {
            await prisma.quizSession.update({
                where: { id: openSession.id },
                data: { currentAnswers: userAnswers },
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[AUTOSAVE ERROR]", error);
        return NextResponse.json({ error: "Failed to autosave" }, { status: 500 });
    }
}
