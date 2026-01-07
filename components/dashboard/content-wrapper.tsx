"use client";

export function ContentWrapper({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
            {children}
        </div>
    );
}
