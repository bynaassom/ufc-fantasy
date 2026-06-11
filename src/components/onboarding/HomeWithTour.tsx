"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import OnboardingTour from "./OnboardingTour";

export default function HomeWithTour({
  show,
  children,
}: {
  show: boolean;
  children: React.ReactNode;
}) {
  const [tour, setTour] = useState(show);
  const router = useRouter();

  useEffect(() => {
    if (show && !tour) {
      router.refresh();
    }
  }, [show, tour, router]);

  return (
    <>
      {tour && <OnboardingTour onComplete={() => setTour(false)} />}
      {children}
    </>
  );
}
