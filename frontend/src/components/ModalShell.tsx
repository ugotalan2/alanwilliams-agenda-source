import { useEffect, type ReactNode } from "react";

interface Props {
    children: ReactNode;
    onClose: () => void;
    busy?: boolean;
    dialogClassName?: string;
}

export function ModalShell({
    children,
    onClose,
    busy = false,
    dialogClassName = "modal-dialog-centered",
}: Props) {
    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape" && !busy) onClose();
        }

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [busy, onClose]);

    return (
        <div
            className="modal d-block aw-modal-overlay"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            onPointerDown={(event) => {
                if (event.target === event.currentTarget && !busy) onClose();
            }}
        >
            <div className={`modal-dialog ${dialogClassName}`}>
                <div className="modal-content aw-card">{children}</div>
            </div>
        </div>
    );
}
