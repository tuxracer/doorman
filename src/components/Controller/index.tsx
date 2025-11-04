"use client";

import { useDoor } from "@/hooks/useDoor";

export const Controller: React.FC = () => {
    const { data, error, isLoading, update } = useDoor();

    if (error) {
        return <div>Error: {error.message}</div>;
    }

    const renderDate = (date?: number | null) => {
        if (isLoading) return "Unknown";
        if (!date) return "Never";
        return new Date(date).toLocaleString();
    };

    const isUnlockAllowed = data?.isUnlockAllowed ?? null;

    const getButtonClassNames = () => {
        let classNames = ["p-4", "text-lg", "rounded-md", "w-full", "transition-all", "border"];

        switch (isUnlockAllowed) {
            case null:
                classNames.push("border-gray-500");
                break;
            case true:
                classNames.push("border-blue-500", "bg-blue-500", "text-white");
                break;
            case false:
                classNames.push("border-blue-500", "text-blue-500");
                break;
        }

        classNames.push(isLoading ? "cursor-loading" : "cursor-pointer");

        return classNames.join(" ");
    };

    return (
        <div className="h-dvh flex items-center justify-center w-full">
            <div className="flex flex-col gap-4 p-5 w-[375px] mx-auto">
                <button className={getButtonClassNames()} onClick={() => update({ isUnlockAllowed: !isUnlockAllowed })}>
                    {isUnlockAllowed !== null && <>{isUnlockAllowed ? "Automatic unlocking is enabled 🔓" : "Automatic unlocking is disabled 🔒"}</>}
                    {isUnlockAllowed === null && <>&nbsp;</>}
                </button>
                <hr />
                <div className="flex flex-col gap-2 text-sm text-gray-500">
                    <p>Last unlocked at: {renderDate(data?.lastUnlockedAt)}</p>
                    <p>Last answered at: {renderDate(data?.lastAnsweredAt)}</p>
                    <p>Last rejected at: {renderDate(data?.lastRejectedAt)}</p>
                </div>
            </div>
        </div>
    );
};
