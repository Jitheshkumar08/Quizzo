import Navbar from "@/components/layout/Navbar";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <Navbar />
            <div className="min-h-[100dvh] pt-20 flex flex-col bg-[#FCF9F2]">
                {children}
            </div>
        </>
    );
}