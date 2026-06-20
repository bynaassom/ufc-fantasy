"use client";

import { useState } from "react";
import { adminSend } from "@/components/admin/shared";
import toast from "react-hot-toast";

export default function FollowButton({
  userId,
  initialFollowing,
}: {
  userId: string;
  initialFollowing?: boolean;
}) {
  const [following, setFollowing] = useState(!!initialFollowing);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const data = await adminSend<{ following: boolean }>(
        `/api/follow/${userId}`,
        { method: "POST" },
      );
      setFollowing(data.following);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="font-condensed text-xs uppercase tracking-widest px-3 py-1.5 transition-all"
      style={{
        border: following ? "1px solid var(--border)" : "1px solid var(--red)",
        backgroundColor: following ? "var(--bg-elevated)" : "var(--red)",
        color: following ? "var(--text-muted)" : "#000",
        opacity: loading ? 0.5 : 1,
      }}
    >
      {loading ? "..." : following ? "Seguindo" : "Seguir"}
    </button>
  );
}
