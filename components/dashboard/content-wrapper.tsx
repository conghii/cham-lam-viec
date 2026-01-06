"use client";

export function ContentWrapper({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex-1 overflow-y-auto p-8">
            {children}
        </div>
    );
}
