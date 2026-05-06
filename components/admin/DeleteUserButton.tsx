"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";

interface DeleteUserButtonProps {
  userId: string;
  userName: string;
  isSelf: boolean;
}

export default function DeleteUserButton({
  userId,
  userName,
  isSelf,
}: DeleteUserButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(typeof data.error === "string" ? data.error : "Failed to delete user");
        setDeleting(false);
        return;
      }

      router.push("/admin/users");
      router.refresh();
    } catch {
      alert("Network error while deleting user");
      setDeleting(false);
    }
  }

  return (
    <>
      <style>{`
      .eq-delete-btn {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background-color: rgb(177, 24, 24);
        border: none;
        font-weight: 600;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-shadow: 0px 0px 20px rgba(0,0,0,0.164);
        cursor: pointer;
        transition-duration: 0.3s;
        overflow: hidden;
        position: relative;
        gap: 1px;
        flex-shrink: 0;
        scale:0.9;
      }
      .eq-delete-slot {
        width: 120px;
        display: flex;
        justify-content: center;
        align-items: center;
        flex-shrink: 0;
      }
      .eq-delete-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .eq-delete-btn .eq-svgIcon { width: 12px; transition-duration: 0.3s; }
      .eq-delete-btn .eq-svgIcon path { fill: white; }
      .eq-delete-btn:not(:disabled):hover {
        width: 120px;
        border-radius: 50px;
        background-color: rgb(255, 69, 69);
        align-items: center;
        gap: 0;
      }
      .eq-delete-btn:not(:disabled):hover .eq-bin-bottom {
        width: 50px;
        transform: translateY(60%);
      }
      .eq-delete-btn .eq-bin-top { transform-origin: bottom right; }
      .eq-delete-btn:not(:disabled):hover .eq-bin-top {
        width: 50px;
        transform: translateY(60%) rotate(160deg);
      }
      .eq-delete-btn::before {
        position: absolute;
        top: -20px;
        content: "Delete";
        color: white;
        transition-duration: 0.3s;
        font-size: 2px;
      }
      .eq-delete-btn:not(:disabled):hover::before {
        font-size: 13px;
        opacity: 1;
        transform: translateY(35px);
      }
      .eq-delete-mobile-label {
        display: none;
      }
      @media (max-width: 640px) {
        .eq-delete-slot {
          width: auto;
        }
        .eq-delete-btn {
          width: auto;
          height: auto;
          min-height: 44px;
          border-radius: 0.4em;
          background-color: rgb(254, 242, 242);
          color: rgb(185, 28, 28);
          border: 3px solid currentColor;
          box-shadow: 0.1em 0.1em;
          padding: 0.5em 1.1em;
          display: inline-flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          scale: 1;
        }
        .eq-delete-btn::before {
          content: "";
        }
        .eq-delete-btn .eq-svgIcon {
          display: none;
        }
        .eq-delete-mobile-label {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 14px;
          font-weight: 900;
          line-height: 1;
        }
        .eq-delete-btn:not(:disabled):hover {
          transform: translate(-0.05em, -0.05em);
          box-shadow: 0.15em 0.15em;
          background-color: rgb(254, 226, 226);
          width: auto;
          border-radius: 0.4em;
        }
        .eq-delete-btn:not(:disabled):active {
          transform: translate(0.05em, 0.05em);
          box-shadow: 0.05em 0.05em;
        }
      }
      `}</style>

      <div className="rounded-[22px] border border-red-100 bg-red-50/70 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-black text-red-900">Delete User</h2>
            <p className="mt-1 text-sm font-medium leading-relaxed text-red-700/80">
              Permanently remove this account and its related quizzes, attempts, and active sessions.
            </p>
            {isSelf && (
              <p className="mt-2 text-xs font-bold text-red-700">
                You cannot delete your own admin account.
              </p>
            )}
          </div>

          <div className="eq-delete-slot self-end sm:self-center">
            <button
              type="button"
              onClick={() => setOpen(true)}
              disabled={isSelf}
              className="eq-delete-btn"
              title="Delete User"
            >
              <svg viewBox="0 0 39 7" fill="none" xmlns="http://www.w3.org/2000/svg" className="eq-svgIcon eq-bin-top">
                <line y1="5" x2="39" y2="5" stroke="white" strokeWidth="4" />
                <line x1="12" y1="1.5" x2="26.0357" y2="1.5" stroke="white" strokeWidth="3" />
              </svg>
              <svg viewBox="0 0 33 39" fill="none" xmlns="http://www.w3.org/2000/svg" className="eq-svgIcon eq-bin-bottom">
                <mask id={`delete-user-mask-${userId}`} style={{ maskType: "alpha" }} maskUnits="userSpaceOnUse" x="0" y="0" width="33" height="39">
                  <path d="M0 0H33V35C33 37.2091 31.2091 39 29 39H4C1.79086 39 0 37.2091 0 35V0Z" fill="white" />
                </mask>
                <g mask={`url(#delete-user-mask-${userId})`}>
                  <path d="M0 0H33V35C33 37.2091 31.2091 39 29 39H4C1.79086 39 0 37.2091 0 35V0Z" fill="white" />
                  <path d="M12 6L12 29" stroke="black" strokeWidth="4" />
                  <path d="M21 6V29" stroke="black" strokeWidth="4" />
                </g>
              </svg>
              <span className="eq-delete-mobile-label">
                <Trash2 className="h-4 w-4" />
                Delete
              </span>
            </button>
          </div>
        </div>
      </div>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !deleting && setOpen(false)} />
            <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-red-200 bg-white shadow-2xl">
              <div className="absolute inset-x-0 top-0 h-1 bg-red-600" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={deleting}
                className="absolute right-4 top-4 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="p-8">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                  <AlertTriangle className="h-7 w-7" />
                </div>
                <h3 className="mb-2 text-xl font-black text-gray-900">Delete User?</h3>
                <p className="text-sm font-medium leading-relaxed text-gray-600">
                  Are you sure you want to permanently delete{" "}
                  <span className="font-bold text-gray-800">{userName}</span>? This also removes quizzes created by this user and related attempt data. This action cannot be undone.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={deleting}
                    className="rounded-xl bg-gray-100 px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-200 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-200 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Yes, Delete
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
